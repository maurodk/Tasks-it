// filepath: supabase\migrations\<timestamp>_allow_anon_read_sectors.sql
CREATE POLICY "Allow anonymous read access to sectors"
ON public.sectors
FOR SELECT
TO anon
USING (true);