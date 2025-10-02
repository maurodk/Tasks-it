-- Add pending approval system to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on pending users queries
CREATE INDEX IF NOT EXISTS idx_profiles_pending_approval 
ON public.profiles(is_approved, created_at) 
WHERE is_approved = false;

-- Create function to approve user
CREATE OR REPLACE FUNCTION approve_user(user_id UUID, approver_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if approver is a manager
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = approver_id 
        AND role = 'manager' 
        AND is_approved = true
    ) THEN
        RAISE EXCEPTION 'Only approved managers can approve users';
    END IF;
    
    -- Approve the user
    UPDATE profiles 
    SET 
        is_approved = true,
        approved_by = approver_id,
        approved_at = now()
    WHERE id = user_id;
END;
$$;

-- Create function to reject user (delete profile)
CREATE OR REPLACE FUNCTION reject_user(user_id UUID, rejector_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if rejector is a manager
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = rejector_id 
        AND role = 'manager' 
        AND is_approved = true
    ) THEN
        RAISE EXCEPTION 'Only approved managers can reject users';
    END IF;
    
    -- Delete the user (will cascade to auth.users)
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Update RLS policies to consider approval status
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can read all profiles" ON profiles;

-- New RLS policies with approval consideration
CREATE POLICY "Users can read their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id AND is_approved = true);

CREATE POLICY "Approved managers can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager' 
            AND is_approved = true
        )
    );

CREATE POLICY "Approved managers can approve/reject users" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager' 
            AND is_approved = true
        )
    );

-- Approve existing users (migration)
UPDATE profiles SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- Update handle_new_user function to create pending profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
    meta jsonb;
BEGIN
    meta := NEW.raw_user_meta_data;

    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        sector_id,
        subsector_id,
        is_approved,
        role
    ) VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(meta->>'full_name', ''),
        (meta->>'sector_id')::uuid,
        (meta->>'subsector_id')::uuid,
        COALESCE((meta->>'is_pending')::boolean, false) = false, -- Se is_pending for true, is_approved é false.
        'collaborator' -- Role padrão, será sobrescrita para 'guest' no frontend se for o caso.
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
