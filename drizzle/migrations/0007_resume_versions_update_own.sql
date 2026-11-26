GRANT UPDATE (name, resume_text, candidate, scored_text, level, job) ON public.resume_versions TO authenticated;
CREATE POLICY versions_update ON public.resume_versions FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);