-- Create subtasks table
CREATE TABLE subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for better performance
CREATE INDEX idx_subtasks_activity_id ON subtasks(activity_id);
CREATE INDEX idx_subtasks_order ON subtasks(activity_id, order_index);

-- Enable RLS
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view subtasks of their activities" ON subtasks
    FOR SELECT USING (
        activity_id IN (
            SELECT id FROM activities 
            WHERE user_id = auth.uid() OR assigned_to = auth.uid()
        )
    );

CREATE POLICY "Users can insert subtasks for their activities" ON subtasks
    FOR INSERT WITH CHECK (
        activity_id IN (
            SELECT id FROM activities 
            WHERE user_id = auth.uid() OR assigned_to = auth.uid()
        )
    );

CREATE POLICY "Users can update subtasks of their activities" ON subtasks
    FOR UPDATE USING (
        activity_id IN (
            SELECT id FROM activities 
            WHERE user_id = auth.uid() OR assigned_to = auth.uid()
        )
    );

CREATE POLICY "Users can delete subtasks of their activities" ON subtasks
    FOR DELETE USING (
        activity_id IN (
            SELECT id FROM activities 
            WHERE user_id = auth.uid() OR assigned_to = auth.uid()
        )
    );

-- Function to update activity status when subtask is completed
CREATE OR REPLACE FUNCTION update_activity_status_on_subtask_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If a subtask is marked as completed and activity is still pending, change to in_progress
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        UPDATE activities 
        SET status = 'in_progress', updated_at = now()
        WHERE id = NEW.activity_id AND status = 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_activity_status_on_subtask_change
    AFTER UPDATE ON subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_status_on_subtask_change();

-- Update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subtasks_updated_at
    BEFORE UPDATE ON subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_subtasks_updated_at();
