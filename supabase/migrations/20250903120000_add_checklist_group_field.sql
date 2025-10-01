-- Add checklist_group field to subtasks table
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS checklist_group TEXT;

-- Create index for better performance on checklist_group queries
CREATE INDEX IF NOT EXISTS idx_subtasks_checklist_group ON subtasks(checklist_group);
