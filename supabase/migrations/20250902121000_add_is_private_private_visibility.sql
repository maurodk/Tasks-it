-- Add is_private flag and restrict visibility of private activities

-- 1) Add column to activities
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 2) Replace SELECT policy to respect privacy
DROP POLICY IF EXISTS "Users can view activities in their sector" ON activities;

-- Non-private activities are visible to all users in the same sector
CREATE POLICY "View non-private activities in sector" ON activities
  FOR SELECT USING (
    is_private = false
    AND sector_id = (
      SELECT sector_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Private activities are visible only to the creator or managers in the same sector
CREATE POLICY "View private activities (owner or manager in sector)" ON activities
  FOR SELECT USING (
    is_private = true AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'manager'
          AND p.sector_id = activities.sector_id
      )
    )
  );
