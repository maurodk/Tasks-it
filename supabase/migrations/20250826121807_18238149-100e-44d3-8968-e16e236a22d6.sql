-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('manager', 'collaborator');

-- Create enum for activity status
CREATE TYPE public.activity_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create enum for activity priority
CREATE TYPE public.activity_priority AS ENUM ('low', 'medium', 'high');

-- Create sectors table
CREATE TABLE public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subsectors table
CREATE TABLE public.subsectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(name, sector_id)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'collaborator',
    sector_id UUID REFERENCES public.sectors(id),
    subsector_id UUID REFERENCES public.subsectors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invitations table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'collaborator',
    sector_id UUID NOT NULL REFERENCES public.sectors(id),
    subsector_id UUID REFERENCES public.subsectors(id),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activities table
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status activity_status NOT NULL DEFAULT 'pending',
    priority activity_priority NOT NULL DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_time INTEGER, -- in minutes
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    sector_id UUID NOT NULL REFERENCES public.sectors(id),
    subsector_id UUID REFERENCES public.subsectors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create activity assignments table (for manager assignments)
CREATE TABLE public.activity_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(activity_id, assigned_to)
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT false,
    related_activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sector(user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT sector_id FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_manager(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT (public.get_user_role(user_id) = 'manager');
$$;

-- RLS Policies for sectors
CREATE POLICY "Users can view sectors if they belong to one"
ON public.sectors FOR SELECT
TO authenticated
USING (
    id IN (SELECT sector_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policies for subsectors
CREATE POLICY "Users can view subsectors in their sector"
ON public.subsectors FOR SELECT
TO authenticated
USING (
    sector_id = public.get_user_sector(auth.uid())
);

CREATE POLICY "Managers can create subsectors in their sector"
ON public.subsectors FOR INSERT
TO authenticated
WITH CHECK (
    public.is_manager(auth.uid()) AND
    sector_id = public.get_user_sector(auth.uid())
);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their sector"
ON public.profiles FOR SELECT
TO authenticated
USING (sector_id = public.get_user_sector(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- RLS Policies for invitations
CREATE POLICY "Managers can view invitations they created"
ON public.invitations FOR SELECT
TO authenticated
USING (
    invited_by = auth.uid() AND
    public.is_manager(auth.uid())
);

CREATE POLICY "Managers can create invitations for their sector"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
    public.is_manager(auth.uid()) AND
    sector_id = public.get_user_sector(auth.uid()) AND
    invited_by = auth.uid()
);

-- RLS Policies for activities
CREATE POLICY "Users can view their own activities"
ON public.activities FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view activities in their sector"
ON public.activities FOR SELECT
TO authenticated
USING (sector_id = public.get_user_sector(auth.uid()));

CREATE POLICY "Users can create their own activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    created_by = auth.uid() AND
    sector_id = public.get_user_sector(auth.uid())
);

CREATE POLICY "Users can update their own activities"
ON public.activities FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers can create activities for their sector"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (
    public.is_manager(auth.uid()) AND
    sector_id = public.get_user_sector(auth.uid()) AND
    created_by = auth.uid()
);

-- RLS Policies for activity assignments
CREATE POLICY "Users can view their activity assignments"
ON public.activity_assignments FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

CREATE POLICY "Managers can view assignments in their sector"
ON public.activity_assignments FOR SELECT
TO authenticated
USING (
    public.is_manager(auth.uid()) AND
    assigned_by = auth.uid()
);

CREATE POLICY "Managers can create assignments"
ON public.activity_assignments FOR INSERT
TO authenticated
WITH CHECK (
    public.is_manager(auth.uid()) AND
    assigned_by = auth.uid()
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Check if there's a valid invitation for this email
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE email = NEW.email
    AND used_at IS NULL
    AND expires_at > now()
    LIMIT 1;

    IF invitation_record IS NOT NULL THEN
        -- Create profile from invitation
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            sector_id,
            subsector_id
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            invitation_record.role,
            invitation_record.sector_id,
            invitation_record.subsector_id
        );

        -- Mark invitation as used
        UPDATE public.invitations
        SET used_at = now()
        WHERE id = invitation_record.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER update_sectors_updated_at
    BEFORE UPDATE ON public.sectors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subsectors_updated_at
    BEFORE UPDATE ON public.subsectors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification when activity is assigned
CREATE OR REPLACE FUNCTION public.notify_activity_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    activity_title TEXT;
BEGIN
    -- Get activity title
    SELECT title INTO activity_title
    FROM public.activities
    WHERE id = NEW.activity_id;

    -- Create notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        related_activity_id
    ) VALUES (
        NEW.assigned_to,
        'Nova atividade atribuída',
        'Você recebeu uma nova atividade: ' || activity_title,
        'assignment',
        NEW.activity_id
    );

    RETURN NEW;
END;
$$;

-- Trigger for activity assignment notifications
CREATE TRIGGER on_activity_assignment
    AFTER INSERT ON public.activity_assignments
    FOR EACH ROW EXECUTE PROCEDURE public.notify_activity_assignment();

-- Insert default sectors
INSERT INTO public.sectors (name, description) VALUES
('Tecnologia', 'Setor de desenvolvimento e infraestrutura'),
('Marketing', 'Setor de marketing e comunicação'),
('Vendas', 'Setor comercial e vendas'),
('Recursos Humanos', 'Setor de gestão de pessoas'),
('Financeiro', 'Setor financeiro e contábil');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_assignments;