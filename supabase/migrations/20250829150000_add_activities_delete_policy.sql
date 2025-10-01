-- Add "archived" status to activity_status enum
ALTER TYPE public.activity_status ADD VALUE 'archived';

-- Add DELETE policy for activities table
-- Users can delete their own activities
CREATE POLICY "Users can delete their own activities"
ON public.activities FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Managers can delete activities in their sector
CREATE POLICY "Managers can delete activities in their sector"
ON public.activities FOR DELETE
TO authenticated
USING (
    public.is_manager(auth.uid()) AND
    sector_id = public.get_user_sector(auth.uid())
);
