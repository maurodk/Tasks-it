-- Migration: Fix RLS policies for activity visibility and user profiles
-- Date: 2025-09-02
-- Issue: Collaborators cannot see activity assignees and can see activities from other subsectors

-- Remove all existing profile policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Approved managers can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Approved managers can approve/reject users" ON profiles;
DROP POLICY IF EXISTS "Role-based profile viewing" ON profiles;
DROP POLICY IF EXISTS "Enhanced profile viewing" ON profiles;

-- Essential: Users must be able to read their own profile for login
CREATE POLICY "Users can read their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile if approved
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id AND is_approved = true);

-- Managers can read all profiles in their sector
CREATE POLICY "Approved managers can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager' 
            AND is_approved = true
        )
        AND sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Collaborators can see profiles of activity assignees in their subsector
CREATE POLICY "Collaborators can see activity assignees" ON profiles
FOR SELECT TO authenticated
USING (
  -- Collaborators (non-managers) can see profiles of users assigned to activities in their subsector
  EXISTS (
    SELECT 1 FROM profiles current_user 
    WHERE current_user.id = auth.uid() 
    AND current_user.role = 'collaborator'
  )
  AND id IN (
    SELECT DISTINCT user_id 
    FROM activities 
    WHERE subsector_id = (
      SELECT subsector_id FROM profiles 
      WHERE id = auth.uid()
    )
    AND subsector_id IS NOT NULL
  )
);

-- Managers can approve/reject users
CREATE POLICY "Approved managers can approve/reject users" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager' 
            AND is_approved = true
        )
    );

-- Fix 2: Ensure collaborators only see activities from their subsector
DROP POLICY IF EXISTS "Role-based activity viewing" ON activities;

CREATE POLICY "Role-based activity viewing" ON activities
FOR SELECT TO authenticated
USING (
  CASE 
    WHEN (
      SELECT role FROM profiles 
      WHERE id = auth.uid()
    ) = 'manager' THEN
      -- Managers can see all activities in their sector
      sector_id = (
        SELECT sector_id FROM profiles 
        WHERE id = auth.uid()
      )
    ELSE
      -- Collaborators can only see activities from their subsector
      -- Important: subsector_id must be NOT NULL and match user's subsector
      subsector_id IS NOT NULL
      AND subsector_id = (
        SELECT subsector_id FROM profiles 
        WHERE id = auth.uid()
      )
  END
);
