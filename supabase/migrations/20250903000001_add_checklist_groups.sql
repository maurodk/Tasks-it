DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name='subtasks' AND column_name='checklist_group'
	) THEN
		ALTER TABLE subtasks ADD COLUMN checklist_group TEXT DEFAULT 'Checklist';
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relname = 'idx_subtasks_checklist_group' AND c.relkind = 'i'
	) THEN
		CREATE INDEX idx_subtasks_checklist_group ON subtasks(checklist_group);
	END IF;
END $$;
