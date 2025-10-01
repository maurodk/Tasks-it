-- Personal lists to allow users to create private grids on the home page

-- 1) Create table personal_lists
CREATE TABLE IF NOT EXISTS public.personal_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sector_id uuid NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Add list_id to activities (nullable). When set, the activity belongs to a personal list.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS list_id uuid NULL REFERENCES public.personal_lists(id) ON DELETE SET NULL;

-- 3) Helpful index
CREATE INDEX IF NOT EXISTS idx_personal_lists_user ON public.personal_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_list_id ON public.activities(list_id);

-- 4) RLS for personal_lists
ALTER TABLE public.personal_lists ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "Users can view their personal lists" ON public.personal_lists;
DROP POLICY IF EXISTS "Users can manage their personal lists" ON public.personal_lists;

-- Only the owner (and managers of same sector) can view
CREATE POLICY "Users can view their personal lists" ON public.personal_lists
  FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager' AND p.sector_id = personal_lists.sector_id
    )
  );

-- Only the owner can insert/update/delete their lists
CREATE POLICY "Users can manage their personal lists" ON public.personal_lists
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5) Activities visibility already handled by activities policies (is_private flag). Ensure list-bound activities are private by default.
UPDATE public.activities SET is_private = true WHERE list_id IS NOT NULL;

-- 6) Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personal_lists_updated_at ON public.personal_lists;
CREATE TRIGGER trg_personal_lists_updated_at
  BEFORE UPDATE ON public.personal_lists
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
