-- Update handle_new_user function to work with the new registration flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    user_sector_id uuid;
BEGIN
    -- Get sector_id from user metadata
    user_sector_id := (NEW.raw_user_meta_data->>'sector_id')::uuid;
    
    -- Create profile with sector information
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        sector_id
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'collaborator'::user_role,
        user_sector_id
    );

    RETURN NEW;
END;
$function$;