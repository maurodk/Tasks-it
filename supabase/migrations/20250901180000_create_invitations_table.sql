-- Create invitations table for user invites
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  subsector_id UUID NOT NULL REFERENCES subsectors(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy for managers to create and view invitations
CREATE POLICY "Managers can create invitations" ON invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can view invitations" ON invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- Policy for updating invitations (when used)
CREATE POLICY "Invitations can be used by token" ON invitations
  FOR UPDATE TO authenticated
  USING (token IS NOT NULL AND expires_at > NOW() AND used_at IS NULL);

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to create invitation
CREATE OR REPLACE FUNCTION create_invitation(
  invitation_email TEXT,
  invitation_subsector_id UUID
)
RETURNS JSON AS $$
DECLARE
  new_token TEXT;
  invitation_id UUID;
  manager_id UUID;
BEGIN
  -- Get the manager ID
  SELECT id INTO manager_id FROM profiles WHERE id = auth.uid() AND role = 'manager';
  
  IF manager_id IS NULL THEN
    RAISE EXCEPTION 'Only managers can create invitations';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = invitation_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Generate unique token
  new_token := generate_invitation_token();
  
  -- Insert invitation
  INSERT INTO invitations (email, subsector_id, invited_by, token)
  VALUES (invitation_email, invitation_subsector_id, manager_id, new_token)
  RETURNING id INTO invitation_id;
  
  RETURN json_build_object(
    'id', invitation_id,
    'token', new_token,
    'email', invitation_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
