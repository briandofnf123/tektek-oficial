import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, TrendingUp, Hash, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/tektek/BottomNav";

const TRENDING_TAGS = [
  "fyp", "music", "dance", "comedy", "art", "food", "tech", "gaming",
  "fashion", "fitness", "diy", "travel",
];

const Discover = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .order("follower_count", { ascending: false })
        .limit(20);
      if (!cancel) {
        setResults((data ?? []) as Profile[]);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  const showTrending = useMemo(() => q.trim().length < 2, [q]);

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-glow opacity-50" />

      <header className="relative z-10 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar criadores, sons, tags…"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </header>

      <main className="relative z-10 h-[calc(100dvh-120px)] overflow-y-auto no-scrollbar pb-24">
        {showTrending ? (
          <>
            <section className="px-5 pt-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Em alta
                </h2>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {TRENDING_TAGS.slice(0, 6).map((tag, i) => (
                  <button
                    key={tag}
                    onClick={() => setQ(tag)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary"
                  >
                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-brand opacity-20 blur-xl transition group-hover:opacity-40" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      #{i + 1} trending
                    </span>
                    <p className="mt-1 font-display text-lg font-bold">#{tag}</p>
                    <p className="text-xs text-muted-foreground">
                      {(Math.random() * 40 + 5).toFixed(1)}K vídeos
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-7 px-5">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Categorias
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRENDING_TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-muted"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </section>

            <section className="mx-5 mt-7 rounded-3xl border border-border bg-gradient-brand-soft p-5 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-background">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">
                Conteúdo personalizado em breve
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Quanto mais você curtir, mais o Descobrir aprende sobre você.
              </p>
            </section>
          </>
        ) : (
          <section className="px-3 pt-2">
            <div className="flex items-center gap-2 px-2 pb-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Criadores
              </h2>
            </div>
            {loading && (
              <div className="grid place-items-center py-10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Nenhum perfil encontrado para "{q}".
              </p>
            )}
            {!loading &&
              results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/u/${p.username}`)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-muted"
                >
                  <img
                    src={
                      p.avatar_url ??
                      `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.username}`
                    }
                    alt={p.username}
                    className="h-12 w-12 rounded-full bg-card object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold">{p.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{p.username} · {p.follower_count} seguidores
                    </p>
                  </div>
                </button>
              ))}
          </section>
        )}
      </main>

      <BottomNav active="discover" />
    </div>
  );
};

export default Discover;
