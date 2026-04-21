-- 1) PRONOUNS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pronouns text;

-- 2) TEKCOINS LEDGER
CREATE TABLE IF NOT EXISTS public.tekcoins_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  ref_video_id uuid,
  ref_user_id uuid,
  ref_withdrawal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tekcoins_user ON public.tekcoins_ledger(user_id, created_at DESC);

ALTER TABLE public.tekcoins_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own ledger" ON public.tekcoins_ledger;
CREATE POLICY "Users see own ledger" ON public.tekcoins_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.tekcoins_balance
WITH (security_invoker=on) AS
  SELECT user_id, COALESCE(SUM(amount), 0)::bigint AS balance
  FROM public.tekcoins_ledger
  GROUP BY user_id;

CREATE OR REPLACE FUNCTION public.tekcoins_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO author FROM public.videos WHERE id = NEW.video_id;
    IF author IS NOT NULL AND author <> NEW.user_id THEN
      INSERT INTO public.tekcoins_ledger (user_id, amount, reason, ref_video_id, ref_user_id)
      VALUES (author, 10, 'like_received', NEW.video_id, NEW.user_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT user_id INTO author FROM public.videos WHERE id = OLD.video_id;
    IF author IS NOT NULL AND author <> OLD.user_id THEN
      INSERT INTO public.tekcoins_ledger (user_id, amount, reason, ref_video_id, ref_user_id)
      VALUES (author, -10, 'like_revoked', OLD.video_id, OLD.user_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tekcoins_on_like ON public.video_likes;
CREATE TRIGGER trg_tekcoins_on_like
AFTER INSERT OR DELETE ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION public.tekcoins_on_like();

-- 3) WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coins integer NOT NULL CHECK (coins > 0),
  method text NOT NULL CHECK (method IN ('pix','paypal')),
  destination text NOT NULL,
  country_code text NOT NULL DEFAULT 'BR',
  currency text NOT NULL DEFAULT 'BRL',
  fiat_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id, created_at DESC);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own withdrawals" ON public.withdrawals;
CREATE POLICY "Users see own withdrawals" ON public.withdrawals
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create own withdrawals" ON public.withdrawals;
CREATE POLICY "Users create own withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.withdrawal_debit_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal bigint;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO bal
  FROM public.tekcoins_ledger WHERE user_id = NEW.user_id;
  IF bal < NEW.coins THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo atual: %', bal;
  END IF;
  INSERT INTO public.tekcoins_ledger (user_id, amount, reason, ref_withdrawal_id)
  VALUES (NEW.user_id, -NEW.coins, 'withdrawal', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_debit ON public.withdrawals;
CREATE TRIGGER trg_withdrawal_debit
AFTER INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.withdrawal_debit_ledger();

-- 4) LIVE STREAMS
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  viewer_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_status ON public.live_streams(status, started_at DESC);

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lives are public" ON public.live_streams;
CREATE POLICY "Lives are public" ON public.live_streams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner inserts own live" ON public.live_streams;
CREATE POLICY "Owner inserts own live" ON public.live_streams FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner updates own live" ON public.live_streams;
CREATE POLICY "Owner updates own live" ON public.live_streams FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner deletes own live" ON public.live_streams;
CREATE POLICY "Owner deletes own live" ON public.live_streams FOR DELETE USING (auth.uid() = user_id);

-- 5) MESSAGES MEDIA
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_kind_check') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_kind_check CHECK (kind IN ('text','photo','audio'));
  END IF;
END $$;

-- 6) MESSAGE-MEDIA STORAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-media', 'message-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can upload message media" ON storage.objects;
CREATE POLICY "Authenticated can upload message media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read message media" ON storage.objects;
CREATE POLICY "Anyone can read message media" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-media');

DROP POLICY IF EXISTS "Owners can delete own message media" ON storage.objects;
CREATE POLICY "Owners can delete own message media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 7) TRACKS COPYRIGHT FLAG
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS copyright_free boolean NOT NULL DEFAULT true;

-- 8) UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER trg_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_live_updated_at ON public.live_streams;
CREATE TRIGGER trg_live_updated_at
BEFORE UPDATE ON public.live_streams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) REALTIME (idempotent — ignore if already member)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;