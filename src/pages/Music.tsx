import { useNavigate } from "react-router-dom";
import { ArrowLeft, Music2, Play, TrendingUp, Sparkles, Check, Pause } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTracks, formatPlays, type Track } from "@/hooks/useTracks";
import { Logo } from "@/components/tektek/Logo";

const Music = () => {
  const navigate = useNavigate();
  const { tracks, loading } = useTracks();
  const [filter, setFilter] = useState<"all" | "trending" | "new">("all");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sorted = [...tracks].sort((a, b) =>
    filter === "new" ? 0 : b.use_count - a.use_count,
  );

  const usePick = (t: Track) => {
    setPickedId(t.id);
    toast.success(`"${t.title}" pronta para seu próximo vídeo 🎵`);
    setTimeout(() => navigate("/upload", { state: { selectedTrack: t.id } }), 700);
  };

  const togglePlay = (t: Track & { audio_url?: string | null }) => {
    if (!t.audio_url) {
      toast.error("Faixa sem prévia disponível");
      return;
    }
    if (playingId === t.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(t.audio_url);
    audioRef.current = a;
    a.play().catch(() => toast.error("Não foi possível tocar"));
    a.onended = () => setPlayingId(null);
    setPlayingId(t.id);
  };

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-glow opacity-80" />

      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Logo />
          <span className="rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">
            Music
          </span>
        </div>
        <div className="w-10" />
      </header>

      <main className="relative z-10 h-[calc(100dvh-56px)] overflow-y-auto no-scrollbar pb-8">
        <section className="px-6 pt-4">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Trilha sua <span className="text-gradient-brand">história</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Distribuidora oficial do TekTek. Catálogo livre de royalty para todos os criadores.
          </p>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto px-6 no-scrollbar">
          {[
            { id: "all", label: "Todas", icon: Music2 },
            { id: "trending", label: "Em alta", icon: TrendingUp },
            { id: "new", label: "Novas", icon: Sparkles },
          ].map((f) => {
            const Icon = f.icon;
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-brand text-background"
                    : "border border-border bg-card text-foreground/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mt-12 grid place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <section className="mx-6 mt-10 rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-background">
              <Music2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">Catálogo vazio</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma faixa cadastrada ainda. Seja o primeiro artista a distribuir sua música no TekTek!
            </p>
            <button
              onClick={() => navigate("/music/artist")}
              className="mt-5 rounded-full bg-gradient-brand px-5 py-2 text-sm font-bold text-background"
            >
              Distribuir minha faixa
            </button>
          </section>
        ) : (
          <>
            <h3 className="mx-6 mt-7 mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Catálogo
            </h3>
            <ul className="px-3">
              {sorted.map((t, i) => {
                const track = t as Track & { audio_url?: string | null };
                const isPlaying = playingId === t.id;
                return (
                  <li key={t.id}>
                    <div className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-muted">
                      <span className="w-5 text-center font-display text-sm font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <button
                        onClick={() => togglePlay(track)}
                        className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-brand-soft ring-1 ring-border"
                        aria-label={isPlaying ? "Pausar" : "Tocar"}
                      >
                        {t.cover_url ? (
                          <img src={t.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <Music2 className="h-5 w-5" />
                        )}
                        <span className="absolute inset-0 grid place-items-center bg-background/55">
                          {isPlaying ? (
                            <Pause className="h-4 w-4 fill-foreground text-foreground" />
                          ) : (
                            <Play className="h-4 w-4 fill-foreground text-foreground" />
                          )}
                        </span>
                      </button>
                      <button onClick={() => usePick(t)} className="min-w-0 flex-1 text-left">
                        <p className="truncate font-semibold">{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.artist}
                          {t.genre ? ` · ${t.genre}` : ""}
                        </p>
                      </button>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground/70">
                          {formatPlays(t.use_count)}
                        </p>
                        {pickedId === t.id ? (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <section className="mx-6 mt-8 rounded-3xl border border-border bg-card p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-background">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-display text-xl font-bold">
            É artista? Distribua com a gente.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Suba sua música no catálogo oficial do TekTek e alcance milhões de criadores.
          </p>
          <button
            onClick={() => navigate("/music/artist")}
            className="mt-4 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            Solicitar distribuição
          </button>
        </section>
      </main>
    </div>
  );
};

export default Music;
