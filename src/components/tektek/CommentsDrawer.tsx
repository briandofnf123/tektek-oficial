import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "@/lib/time";

type CommentRow = {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
};
type CommentWithAuthor = CommentRow & { author: Profile | null };

type Props = {
  open: boolean;
  onClose: () => void;
  videoId: string;
};

export const CommentsDrawer = ({ open, onClose, videoId }: Props) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      const { data: rows } = await supabase
        .from("comments")
        .select("*")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancel) return;
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      const { data: authors } = ids.length
        ? await supabase.from("profiles").select("*").in("user_id", ids)
        : { data: [] as Profile[] };
      const map = new Map((authors ?? []).map((a) => [a.user_id, a as Profile]));
      setComments(
        (rows ?? []).map((r) => ({ ...r, author: map.get(r.user_id) ?? null })),
      );
      setLoading(false);
    })();

    const channel = supabase
      .channel(`comments-${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `video_id=eq.${videoId}`,
        },
        async (payload) => {
          const row = payload.new as CommentRow;
          const { data: author } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", row.user_id)
            .maybeSingle();
          setComments((prev) =>
            prev.some((c) => c.id === row.id)
              ? prev
              : [{ ...row, author: (author as Profile | null) ?? null }, ...prev],
          );
        },
      )
      .subscribe();
    return () => {
      cancel = true;
      supabase.removeChannel(channel);
    };
  }, [open, videoId]);

  const send = async () => {
    if (!user) {
      onClose();
      navigate("/auth");
      return;
    }
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase
      .from("comments")
      .insert({ user_id: user.id, video_id: videoId, content: text });
    setSending(false);
    if (error) {
      toast.error("Falha ao comentar");
      setDraft(text);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-background/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex max-h-[88dvh] min-h-[60dvh] w-full max-w-[480px] flex-col rounded-t-3xl border-t border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="w-8" />
              <h3 className="font-display text-sm font-bold">
                {comments.length} comentários
              </h3>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="grid place-items-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <div className="grid place-items-center py-16 text-center">
                  <p className="font-display text-base font-bold">Sem comentários ainda</p>
                  <p className="mt-1 text-sm text-muted-foreground">Seja o primeiro!</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <img
                        src={
                          c.author?.avatar_url ??
                          `https://api.dicebear.com/9.x/avataaars/svg?seed=${c.author?.username ?? "user"}`
                        }
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full bg-card object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm">
                            @{c.author?.username ?? "usuário"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at))}
                          </span>
                        </div>
                        <p className="text-sm leading-snug text-foreground/90">{c.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-border px-3 py-2 pb-[max(env(safe-area-inset-bottom),8px)]"
            >
              {profile && (
                <img
                  src={
                    profile.avatar_url ??
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}`
                  }
                  alt=""
                  className="h-8 w-8 rounded-full bg-card object-cover"
                />
              )}
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={user ? "Adicione um comentário…" : "Entre para comentar"}
                onFocus={() => {
                  if (!user) {
                    onClose();
                    navigate("/auth");
                  }
                }}
                className="h-10 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-background disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
