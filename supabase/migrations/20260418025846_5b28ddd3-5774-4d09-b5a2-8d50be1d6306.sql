
-- ============== VIDEOS ==============
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  duration_seconds NUMERIC(6,2) NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
  ON public.videos FOR SELECT USING (true);
CREATE POLICY "Users can insert their own videos"
  ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own videos"
  ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_videos_created ON public.videos(created_at DESC);
CREATE INDEX idx_videos_user ON public.videos(user_id, created_at DESC);

CREATE TRIGGER trg_videos_updated
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== LIKES ==============
CREATE TABLE public.video_likes (
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "Users manage their own likes"
  ON public.video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own likes"
  ON public.video_likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_video_likes_video ON public.video_likes(video_id);

-- ============== SAVES ==============
CREATE TABLE public.video_saves (
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
ALTER TABLE public.video_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own saves"
  ON public.video_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage their own saves"
  ON public.video_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own saves"
  ON public.video_saves FOR DELETE USING (auth.uid() = user_id);

-- ============== COUNTERS ==============
CREATE OR REPLACE FUNCTION public.handle_video_like_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.video_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_video_like_counts
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_video_like_counts();

CREATE OR REPLACE FUNCTION public.handle_video_save_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET save_count = save_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.video_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_video_save_counts
  AFTER INSERT OR DELETE ON public.video_saves
  FOR EACH ROW EXECUTE FUNCTION public.handle_video_save_counts();

CREATE OR REPLACE FUNCTION public.handle_video_comment_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET comment_count = comment_count + 1 WHERE id::text = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id::text = OLD.video_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_video_comment_counts
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_video_comment_counts();

-- Track use_count when a video uses a track
CREATE OR REPLACE FUNCTION public.handle_track_use_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.track_id IS NOT NULL THEN
    UPDATE public.tracks SET use_count = use_count + 1 WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' AND OLD.track_id IS NOT NULL THEN
    UPDATE public.tracks SET use_count = GREATEST(use_count - 1, 0) WHERE id = OLD.track_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_track_use_count
  AFTER INSERT OR DELETE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_track_use_count();

-- Allow tracks insert/update for authenticated users (so artist signup later works)
CREATE POLICY "Authenticated can insert tracks"
  ON public.tracks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER TABLE public.videos REPLICA IDENTITY FULL;

-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos', 'videos', true, 104857600,
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-m4v']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails', 'thumbnails', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read videos"
  ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Users upload own videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read thumbnails"
  ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Users upload own thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own thumbnails"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
