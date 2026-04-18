import { useNavigate } from "react-router-dom";
import { ArrowLeft, Music2, Play, TrendingUp, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTracks, formatPlays, type Track } from "@/hooks/useTracks";
import { Logo } from "@/components/tektek/Logo";

const Music = () => {
  const navigate = useNavigate();
  const { tracks, loading } = useTracks();
  const [filter, setFilter] = useState<"all" | "trending" | "new">("all");
  const [pickedId, setPickedId] = useState<string | null>(null);

  const sorted = [...tracks].sort((a, b) =>
    filter === "trending" ? b.use_count - a.use_count : 0,
  );
  const featured = sorted[0];
  const rest = sorted.slice(1);

  const usePick = (t: Track) => {
    setPickedId(t.id);
    toast.success(`"${t.title}" pronta para seu próximo vídeo 🎵`);
    setTimeout(() => navigate("/", { state: { selectedTrack: t.id } }), 700);
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
        {/* Hero */}
        <section className="px-6 pt-4">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Trilha sua <span className="text-gradient-brand">história</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Distribuidora oficial do TekTek. Catálogo livre de royalty para todos os criadores.
          </p>
        </section>

        {/* Filters */}
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
        ) : (
          <>
            {/* Featured card */}
            {featured && (
              <motion.button
                onClick={() => usePick(featured)}
                whileTap={{ scale: 0.98 }}
                className="relative mx-6 mt-5 block w-[calc(100%-3rem)] overflow-hidden rounded-3xl border border-border bg-gradient-brand-soft p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-brand opacity-70 blur-md" />
                    <div className="relative grid h-20 w-20 animate-spin-slow place-items-center rounded-2xl bg-gradient-to-br from-card to-background ring-2 ring-foreground/15">
                      <Music2 className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Em alta agora
                    </span>
                    <h2 className="mt-1 truncate font-display text-xl font-bold">
                      {featured.title}
                    </h2>
                    <p className="truncate text-sm text-muted-foreground">{featured.artist}</p>
                    <p className="mt-1 text-xs font-semibold text-foreground/70">
                      {formatPlays(featured.use_count)} vídeos
                    </p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-background">
                    <Play className="h-5 w-5 fill-background" />
                  </div>
                </div>
              </motion.button>
            )}

            {/* List */}
            <h3 className="mx-6 mt-7 mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Catálogo
            </h3>
            <ul className="px-3">
              {rest.map((t, i) => (
                <li key={t.id}>
                  <button
                    onClick={() => usePick(t)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-muted"
                  >
                    <span className="w-5 text-center font-display text-sm font-bold text-muted-foreground">
                      {i + 2}
                    </span>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand-soft ring-1 ring-border">
                      <Music2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.artist} · {t.genre}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground/70">
                        {formatPlays(t.use_count)}
                      </p>
                      {pickedId === t.id ? (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      ) : (
                        <Play className="ml-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {/* Distributor pitch */}
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
          </>
        )}
      </main>
    </div>
  );
};

export default Music;
