import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const orderedPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

const Chat = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [peer, setPeer] = useState<Profile | null>(
    (location.state as { peer?: Profile } | null)?.peer ?? null,
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve peer if not passed via state
  useEffect(() => {
    if (peer || !username) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle()
      .then(({ data }) => setPeer((data as Profile | null) ?? null));
  }, [username, peer]);

  // Get-or-create conversation
  useEffect(() => {
    if (!user || !peer) return;
    const [a, b] = orderedPair(user.id, peer.user_id);
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();
      if (cancelled) return;
      if (existing) {
        setConversationId(existing.id);
      } else {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ user_a: a, user_b: b })
          .select("id")
          .single();
        if (error) {
          toast.error("Não foi possível abrir a conversa");
          return;
        }
        if (!cancelled) setConversationId(created.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, peer]);

  // Load + subscribe to messages
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setMessages((data ?? []) as Message[]);
      });

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as Message).id)
              ? prev
              : [...prev, payload.new as Message],
          );
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !user || !conversationId || sending) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
    });
    setSending(false);
    if (error) {
      toast.error("Falha ao enviar");
      setDraft(text);
    }
  };

  if (!user) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background">
        <button
          onClick={() => navigate("/auth")}
          className="rounded-full bg-gradient-brand px-8 py-3 font-bold text-background"
        >
          Entrar para conversar
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => navigate("/inbox")}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {peer && (
          <button
            onClick={() => navigate(`/u/${peer.username}`)}
            className="flex flex-1 items-center gap-3 text-left"
          >
            <img
              src={
                peer.avatar_url ??
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${peer.username}`
              }
              alt=""
              className="h-9 w-9 rounded-full bg-card object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">{peer.display_name}</p>
              <p className="truncate text-xs text-muted-foreground">@{peer.username}</p>
            </div>
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-[260px]">
              {peer && (
                <img
                  src={
                    peer.avatar_url ??
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${peer.username}`
                  }
                  alt=""
                  className="mx-auto h-16 w-16 rounded-full bg-card object-cover"
                />
              )}
              <p className="mt-3 font-display text-lg font-bold">
                {peer ? peer.display_name : "Conversa"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Diga oi! Suas mensagens são privadas.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {messages.map((m, i) => {
              const mine = m.sender_id === user.id;
              const prev = messages[i - 1];
              const grouped = prev && prev.sender_id === m.sender_id;
              return (
                <li
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                      mine
                        ? "bg-gradient-brand text-background rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    } ${grouped ? "mt-0.5" : "mt-1.5"}`}
                  >
                    {m.content}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-border bg-background px-3 py-2 pb-[max(env(safe-area-inset-bottom),8px)]"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mensagem…"
          className="h-10 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending || !conversationId}
          className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-background transition disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default Chat;
