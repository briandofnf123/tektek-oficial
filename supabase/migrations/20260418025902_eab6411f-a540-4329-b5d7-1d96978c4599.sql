
ALTER TABLE public.tracks ADD COLUMN uploaded_by UUID;

DROP POLICY IF EXISTS "Authenticated can insert tracks" ON public.tracks;

CREATE POLICY "Users can insert their own tracks"
  ON public.tracks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own tracks"
  ON public.tracks FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by);
