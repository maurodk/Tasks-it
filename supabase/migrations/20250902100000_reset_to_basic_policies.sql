-- Migration: Reset to basic working policies
-- Date: 2025-09-02
-- Purpose: Remove all complex policies and restore basic functionality

-- Clean slate: Remove all existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Approved managers can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Approved managers can approve/reject users" ON profiles;
DROP POLICY IF EXISTS "Role-based profile viewing" ON profiles;
DROP POLICY IF EXISTS "Enhanced profile viewing" ON profiles;
DROP POLICY IF EXISTS "Collaborators can see activity assignees" ON profiles;
DROP POLICY IF EXISTS "Managers can read sector profiles" ON profiles;

DROP POLICY IF EXISTS "Role-based activity viewing" ON activities;
DROP POLICY IF EXISTS "Role-based activity creation" ON activities;
DROP POLICY IF EXISTS "Role-based activity updating" ON activities;
DROP POLICY IF EXISTS "Role-based activity deletion" ON activities;
DROP POLICY IF EXISTS "Users can view activities in their sector" ON activities;
DROP POLICY IF EXISTS "Users can create activities in their sector" ON activities;
DROP POLICY IF EXISTS "Users can update activities in their sector" ON activities;
DROP POLICY IF EXISTS "Users can delete activities in their sector" ON activities;
DROP POLICY IF EXISTS "Basic activity viewing" ON activities;

DROP POLICY IF EXISTS "Role-based subtask viewing" ON subtasks;
DROP POLICY IF EXISTS "Role-based subtask creation" ON subtasks;
DROP POLICY IF EXISTS "Role-based subtask updating" ON subtasks;
DROP POLICY IF EXISTS "Role-based subtask deletion" ON subtasks;

-- Basic profiles policies
CREATE POLICY "Users can read their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager'
        )
    );

-- Basic activities policies
CREATE POLICY "Users can view activities in their sector" ON activities
    FOR SELECT USING (
        sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create activities in their sector" ON activities
    FOR INSERT WITH CHECK (
        sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update activities in their sector" ON activities
    FOR UPDATE USING (
        sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete activities in their sector" ON activities
    FOR DELETE USING (
        sector_id = (
            SELECT sector_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Basic subtasks policies
CREATE POLICY "Users can view subtasks of activities in their sector" ON subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM activities 
            WHERE activities.id = subtasks.activity_id 
            AND activities.sector_id = (
                SELECT sector_id FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage subtasks of activities in their sector" ON subtasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM activities 
            WHERE activities.id = subtasks.activity_id 
            AND activities.sector_id = (
                SELECT sector_id FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );
