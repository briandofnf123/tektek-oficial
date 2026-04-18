import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, MessageCircle, Share2, UserMinus, UserPlus, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/contexts/AuthContext";
import { formatCount } from "@/data/feed";

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!username) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (cancel) return;
      setProfile((data as Profile | null) ?? null);
      if (data && user) {
        const { data: f } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", data.user_id)
          .maybeSingle();
        if (!cancel) setFollowing(!!f);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [username, user]);

  const toggleFollow = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!profile || busy) return;
    setBusy(true);
    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.user_id);
      setFollowing(false);
      setProfile({ ...profile, follower_count: Math.max(profile.follower_count - 1, 0) });
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: profile.user_id });
      if (!error) {
        setFollowing(true);
        setProfile({ ...profile, follower_count: profile.follower_count + 1 });
        toast.success(`Seguindo @${profile.username}`);
      }
    }
    setBusy(false);
  };

  const message = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile) navigate(`/inbox/${profile.username}`, { state: { peer: profile } });
  };

  const share = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile.display_name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      }
    } catch {
      /* cancelled */
    }
  };

  if (loading) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Perfil não encontrado</h1>
          <p className="mt-2 text-muted-foreground">@{username} não existe.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-5 rounded-full bg-gradient-brand px-6 py-2 text-sm font-bold text-background"
          >
            Voltar ao feed
          </button>
        </div>
      </div>
    );
  }

  const avatar =
    profile.avatar_url ??
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}`;
  const isMe = user?.id === profile.user_id;

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-glow opacity-60" />
      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-display text-lg font-bold">@{profile.username}</p>
        <button
          onClick={share}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Compartilhar"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </header>

      <main className="relative z-10 h-[calc(100dvh-56px)] overflow-y-auto no-scrollbar">
        <section className="flex flex-col items-center px-6 pb-4 pt-2">
          <div className="relative">
            <div className="absolute inset-0 -m-1 rounded-full bg-gradient-brand blur-md opacity-60" />
            <img
              src={avatar}
              alt={profile.display_name}
              className="relative h-24 w-24 rounded-full border-2 border-background object-cover"
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="font-display text-2xl font-bold">{profile.display_name}</h1>
            {profile.verified && <BadgeCheck className="h-5 w-5 fill-neon-cyan text-background" />}
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>

          <div className="mt-5 flex items-center gap-8">
            <Stat n={profile.following_count} label="Seguindo" />
            <div className="h-8 w-px bg-border" />
            <Stat n={profile.follower_count} label="Seguidores" />
            <div className="h-8 w-px bg-border" />
            <Stat n={0} label="Curtidas" />
          </div>

          {!isMe && (
            <div className="mt-5 flex w-full gap-2">
              <button
                onClick={toggleFollow}
                disabled={busy}
                className={`flex-1 rounded-full py-2.5 font-display font-bold transition active:scale-[0.98] ${
                  following
                    ? "border border-border bg-card text-foreground"
                    : "bg-gradient-brand text-background"
                }`}
              >
                {following ? (
                  <>
                    <UserMinus className="mr-1 inline h-4 w-4" /> Seguindo
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1 inline h-4 w-4" /> Seguir
                  </>
                )}
              </button>
              <button
                onClick={message}
                className="flex h-11 items-center gap-2 rounded-full border border-border px-4 font-semibold transition hover:bg-muted"
              >
                <MessageCircle className="h-4 w-4" />
                Mensagem
              </button>
            </div>
          )}

          {profile.bio && (
            <p className="mt-4 max-w-sm text-center text-sm text-foreground/80">{profile.bio}</p>
          )}
        </section>

        <div className="flex flex-col items-center px-6 py-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
            <Video className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-base font-bold">Sem vídeos ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando @{profile.username} postar, os vídeos aparecem aqui.
          </p>
        </div>
      </main>
    </div>
  );
};

const Stat = ({ n, label }: { n: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="font-display text-lg font-bold">{formatCount(n)}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default PublicProfile;
