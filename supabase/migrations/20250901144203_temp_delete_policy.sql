-- Add DELETE policy for invitations and RPC function
DO $$
BEGIN
    -- Try to create the DELETE policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'invitations' 
        AND policyname = 'Managers can delete invitations'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Managers can delete invitations" ON public.invitations
        FOR DELETE TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'manager'
            )
        );
        RAISE NOTICE 'DELETE policy created';
    ELSE
        RAISE NOTICE 'DELETE policy already exists';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating policy: %', SQLERRM;
END
$$;

-- Create or replace the delete_invitation RPC function
CREATE OR REPLACE FUNCTION public.delete_invitation(invitation_id UUID)
RETURNS JSON AS $$
DECLARE
  manager_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Get the manager ID
  SELECT id INTO manager_id FROM public.profiles WHERE id = auth.uid() AND role = 'manager';
  
  IF manager_id IS NULL THEN
    RAISE EXCEPTION 'Only managers can delete invitations';
  END IF;

  -- Delete the invitation
  DELETE FROM public.invitations 
  WHERE id = invitation_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'Invitation not found or already deleted';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Invitation deleted successfully',
    'deleted_count', deleted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;