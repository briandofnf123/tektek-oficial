import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Heart, MessageSquare, Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/tektek/BottomNav";
import { formatDistanceToNow } from "@/lib/time";

type ConvRow = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
};
type ConvWithPeer = ConvRow & { peer: Profile | null; preview: string | null };

const Inbox = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConvWithPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"messages" | "activity">("messages");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const load = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (!convs || !mounted) {
        setLoading(false);
        return;
      }

      const peerIds = convs.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
      const [{ data: peers }, { data: previews }] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", peerIds),
        Promise.all(
          convs.map((c) =>
            supabase
              .from("messages")
              .select("content")
              .eq("conversation_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ),
        ).then((arr) => ({ data: arr.map((r) => r.data?.content ?? null) })),
      ]);

      if (!mounted) return;
      const peerMap = new Map((peers ?? []).map((p) => [p.user_id, p as Profile]));
      setConversations(
        convs.map((c, i) => ({
          ...c,
          peer: peerMap.get(c.user_a === user.id ? c.user_b : c.user_a) ?? null,
          preview: previews.data[i],
        })),
      );
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("inbox-conv")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col items-center justify-center gap-6 bg-background px-8 text-center">
        <Bell className="h-12 w-12 text-muted-foreground" />
        <div>
          <h1 className="font-display text-2xl font-bold">Suas notificações esperam</h1>
          <p className="mt-2 text-muted-foreground">
            Entre para ver mensagens, curtidas e seguidores.
          </p>
        </div>
        <button
          onClick={() => navigate("/auth")}
          className="rounded-full bg-gradient-brand px-8 py-3 font-display font-bold text-background"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold">Inbox</h1>
        <button
          onClick={() => navigate("/discover")}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>
      </header>

      <nav className="flex border-b border-border">
        {(
          [
            { id: "messages", label: "Mensagens", icon: MessageSquare },
            { id: "activity", label: "Atividade", icon: Bell },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold"
          >
            <Icon className="h-4 w-4" />
            <span className={tab === id ? "text-foreground" : "text-muted-foreground"}>
              {label}
            </span>
            {tab === id && (
              <span className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-gradient-brand" />
            )}
          </button>
        ))}
      </nav>

      <main className="h-[calc(100dvh-160px)] overflow-y-auto no-scrollbar pb-24">
        {tab === "messages" ? (
          loading ? (
            <div className="grid place-items-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Nenhuma conversa ainda"
              text="Vá ao Descobrir e mande a primeira mensagem para um criador."
              cta="Encontrar pessoas"
              onCta={() => navigate("/discover")}
            />
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() =>
                      c.peer && navigate(`/inbox/${c.peer.username}`, { state: { peer: c.peer } })
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted"
                  >
                    <img
                      src={
                        c.peer?.avatar_url ??
                        `https://api.dicebear.com/9.x/avataaars/svg?seed=${c.peer?.username ?? "user"}`
                      }
                      alt=""
                      className="h-12 w-12 rounded-full bg-card object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-display font-bold">
                          {c.peer?.display_name ?? "Usuário"}
                        </p>
                        <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.last_message_at))}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.preview ?? "Diga oi 👋"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <EmptyState
            icon={Heart}
            title="Sem atividade ainda"
            text="Curtidas, comentários e novos seguidores vão aparecer aqui."
          />
        )}
      </main>

      <BottomNav active="inbox" />
    </div>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  text,
  cta,
  onCta,
}: {
  icon: typeof Bell;
  title: string;
  text: string;
  cta?: string;
  onCta?: () => void;
}) => (
  <div className="flex flex-col items-center px-8 py-16 text-center">
    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
    <p className="mt-4 font-display text-base font-bold">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    {cta && (
      <button
        onClick={onCta}
        className="mt-5 rounded-full bg-gradient-brand px-6 py-2 text-sm font-bold text-background"
      >
        <UserPlus className="mr-1 inline h-4 w-4" />
        {cta}
      </button>
    )}
  </div>
);

export default Inbox;
