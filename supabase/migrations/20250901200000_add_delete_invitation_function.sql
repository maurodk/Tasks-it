-- Create the delete_invitation RPC function
CREATE OR REPLACE FUNCTION delete_invitation(invitation_id UUID)
RETURNS JSON AS $$
DECLARE
  manager_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Get the manager ID
  SELECT id INTO manager_id FROM profiles WHERE id = auth.uid() AND role = 'manager';
  
  IF manager_id IS NULL THEN
    RAISE EXCEPTION 'Only managers can delete invitations';
  END IF;

  -- Delete the invitation
  DELETE FROM invitations 
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
