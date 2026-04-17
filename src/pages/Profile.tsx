import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Settings, Share2, Grid3x3, Heart, Bookmark, Video } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AccountSwitcher } from "@/components/tektek/AccountSwitcher";
import { formatCount } from "@/data/feed";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [tab, setTab] = useState<"videos" | "liked" | "saved">("videos");

  if (loading) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col items-center justify-center gap-6 bg-background px-8 text-center">
        <h1 className="font-display text-2xl font-bold">Entre no TekTek</h1>
        <p className="text-muted-foreground">Crie um perfil para postar, curtir e seguir.</p>
        <button
          onClick={() => navigate("/auth")}
          className="rounded-full bg-gradient-brand px-8 py-3 font-display font-bold text-background"
        >
          Entrar / Criar conta
        </button>
      </div>
    );
  }

  const avatar =
    profile.avatar_url ??
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}&backgroundColor=00d9ff,ff2a8a,a855f7`;

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-glow opacity-60" />

      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => navigate("/")}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSwitcherOpen(true)}
          className="font-display text-lg font-bold tracking-tight"
        >
          @{profile.username} ▾
        </button>
        <button
          onClick={() => toast("Configurações em breve ⚙️")}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Configurações"
        >
          <Settings className="h-5 w-5" />
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

          <div className="mt-5 flex w-full gap-2">
            <button
              onClick={() => toast("Editor de perfil chegando em breve ✏️")}
              className="flex-1 rounded-full bg-gradient-brand py-2.5 font-display font-bold text-background transition active:scale-[0.98]"
            >
              Editar perfil
            </button>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/u/${profile.username}`;
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: `${profile.display_name} no TekTek`,
                      text: `Siga @${profile.username} no TekTek`,
                      url,
                    });
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link do perfil copiado!");
                  }
                } catch {
                  /* cancelled */
                }
              }}
              className="grid h-11 w-11 place-items-center rounded-full border border-border transition hover:bg-muted active:scale-95"
              aria-label="Compartilhar perfil"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {profile.bio && (
            <p className="mt-4 text-center text-sm text-foreground/80">{profile.bio}</p>
          )}
          {!profile.bio && (
            <p className="mt-4 text-center text-sm italic text-muted-foreground">
              Adicione uma bio para se apresentar ao mundo ✨
            </p>
          )}
        </section>

        {/* Tabs */}
        <nav className="sticky top-0 z-10 flex border-b border-border bg-background/90 backdrop-blur-md">
          {([
            { id: "videos", icon: Grid3x3 },
            { id: "liked", icon: Heart },
            { id: "saved", icon: Bookmark },
          ] as const).map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="relative flex flex-1 items-center justify-center py-3"
            >
              <Icon
                className={`h-5 w-5 transition ${
                  tab === id ? "text-foreground" : "text-muted-foreground"
                }`}
              />
              {tab === id && (
                <span className="absolute bottom-0 left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-full bg-gradient-brand" />
              )}
            </button>
          ))}
        </nav>

        {/* Empty state */}
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
            <Video className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-base font-bold">
            {tab === "videos"
              ? "Nenhum vídeo ainda"
              : tab === "liked"
                ? "Sem curtidas por aqui"
                : "Nada salvo ainda"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "videos"
              ? "Quando você postar, seus vídeos aparecem aqui."
              : tab === "liked"
                ? "Vídeos que você curtir vão ficar guardados aqui."
                : "Salve vídeos pra rever depois."}
          </p>
        </div>
      </main>

      <AccountSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
};

const Stat = ({ n, label }: { n: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="font-display text-lg font-bold">{formatCount(n)}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default Profile;
