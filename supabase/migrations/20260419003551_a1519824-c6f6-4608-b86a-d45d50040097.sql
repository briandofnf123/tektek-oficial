
-- 1) Relax storage limits
UPDATE storage.buckets
SET file_size_limit = 524288000, allowed_mime_types = NULL
WHERE id = 'videos';

UPDATE storage.buckets
SET file_size_limit = 26214400, allowed_mime_types = NULL
WHERE id = 'thumbnails';

-- 2) Create the support bot as a real auth.users row (so FK is satisfied).
-- Use a fixed UUID + email so this is idempotent.
DO $$
DECLARE
  bot_id uuid := '00000000-0000-0000-0000-0000000000b0';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = bot_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      bot_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'support@tektek.bot',
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"system","providers":["system"]}'::jsonb,
      '{"display_name":"TekTek Support","username":"tektek_support"}'::jsonb,
      false
    );
  END IF;
END $$;

-- 3) Ensure / refresh the bot's profile
INSERT INTO public.profiles (user_id, username, display_name, bio, avatar_url, verified)
VALUES (
  '00000000-0000-0000-0000-0000000000b0',
  'tektek_support',
  'TekTek Support',
  'Bot oficial de suporte. Conta o que está rolando — respondo em segundos.',
  'https://api.dicebear.com/9.x/bottts/svg?seed=tektek-support',
  true
)
ON CONFLICT (user_id) DO UPDATE
  SET username = 'tektek_support',
      display_name = EXCLUDED.display_name,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      verified = true;

-- 4) Auto-reply trigger
CREATE OR REPLACE FUNCTION public.support_bot_autoreply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bot_id uuid := '00000000-0000-0000-0000-0000000000b0';
  conv   RECORD;
  reply  text;
  txt    text;
BEGIN
  IF NEW.sender_id = bot_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF conv.user_a <> bot_id AND conv.user_b <> bot_id THEN
    RETURN NEW;
  END IF;

  txt := lower(coalesce(NEW.content, ''));

  IF txt ~ '(oi|olá|ola|hello|hey|e ai|eai)' THEN
    reply := 'Oi! 👋 Sou o bot oficial do TekTek. Em que posso te ajudar? Pode falar sobre: upload, login, perfil, música ou outro assunto.';
  ELSIF txt ~ '(upload|postar|publicar|video|vídeo|foto)' THEN
    reply := 'Pra publicar: toque no botão central (+) na barra de baixo, escolha Vídeo ou Foto, adicione legenda e toque em Publicar. Vídeos até 500 MB. 🎬';
  ELSIF txt ~ '(login|entrar|conta|senha|google|apple)' THEN
    reply := 'O TekTek usa login com Google e Apple. Toque em "Entrar com Google" ou "Entrar com Apple". 🔐';
  ELSIF txt ~ '(perfil|bio|avatar|nome)' THEN
    reply := 'Vá no seu perfil → Editar perfil. Lá dá pra trocar foto, nome e bio. As mudanças aparecem na hora. ✨';
  ELSIF txt ~ '(musica|música|som|track|tektek music)' THEN
    reply := 'Você pode adicionar sons do TekTek Music ao publicar — ou deixar o áudio original do vídeo. É opcional! 🎵';
  ELSIF txt ~ '(bug|erro|nao funciona|não funciona|problema|falha|trava)' THEN
    reply := 'Sinto muito! 🛠️ Me conta o que aconteceu, em qual tela e o que você esperava ver. Vou registrar para a equipe.';
  ELSIF txt ~ '(obrigad|valeu|tks|thanks|brigad)' THEN
    reply := 'Por nada! 💜 Estou aqui sempre que precisar. Bom TekTek!';
  ELSE
    reply := 'Recebi sua mensagem! 💜 Posso te ajudar com: **upload**, **login**, **perfil** ou **música**. Sobre qual desses você quer falar?';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (NEW.conversation_id, bot_id, reply);

  UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_bot_autoreply_trigger ON public.messages;
CREATE TRIGGER support_bot_autoreply_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.support_bot_autoreply();
