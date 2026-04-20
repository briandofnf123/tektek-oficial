
-- 1) Audio bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('audio', 'audio', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- 2) Storage policies for audio bucket
DROP POLICY IF EXISTS "Audio is publicly readable" ON storage.objects;
CREATE POLICY "Audio is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

DROP POLICY IF EXISTS "Users upload audio to own folder" ON storage.objects;
CREATE POLICY "Users upload audio to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own audio" ON storage.objects;
CREATE POLICY "Users update own audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own audio" ON storage.objects;
CREATE POLICY "Users delete own audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Add audio_url to tracks
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 4) Remove demo / seed tracks (keep only user-uploaded ones with audio)
DELETE FROM public.tracks WHERE audio_url IS NULL;
