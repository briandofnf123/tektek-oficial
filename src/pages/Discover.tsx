import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/tektek/BottomNav";
import { useI18n } from "@/i18n/I18nProvider";

const Discover = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
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

  const showEmpty = q.trim().length < 2;

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-glow opacity-50" />

      <header className="relative z-10 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("discover.search_placeholder")}
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </header>

      <main className="relative z-10 h-[calc(100dvh-120px)] overflow-y-auto no-scrollbar pb-24">
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center px-8 pt-24 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-brand-soft">
              <Compass className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mt-5 font-display text-xl font-bold">
              {t("discover.empty_title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("discover.empty_sub")}
            </p>
          </div>
        ) : (
          <section className="px-3 pt-2">
            <div className="flex items-center gap-2 px-2 pb-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("discover.creators")}
              </h2>
            </div>
            {loading && (
              <div className="grid place-items-center py-10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                {t("discover.no_results")} "{q}".
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
                      @{p.username} · {p.follower_count}
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
