import { Bookmark, Heart, MessageCircle, Music2, Share2, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCount } from "@/data/feed";
import { CommentsDrawer } from "./CommentsDrawer";

type Props = {
  videoId: string;
  authorId: string | null;
  authorHandle: string;
  authorAvatar: string;
  stats: { likes: number; comments: number; saves: number; shares: number };
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
};

const Action = ({
  children,
  count,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  count?: string;
  onClick?: () => void;
  ariaLabel: string;
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="group flex flex-col items-center gap-1"
  >
    <span className="grid h-12 w-12 place-items-center rounded-full bg-foreground/10 backdrop-blur-md transition group-active:scale-90">
      {children}
    </span>
    {count && (
      <span className="text-xs font-semibold text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {count}
      </span>
    )}
  </button>
);

export const ActionRail = ({
  videoId,
  authorId,
  authorHandle,
  authorAvatar,
  stats,
  liked,
  saved,
  onLike,
  onSave,
}: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  const isOwn = user?.id === authorId;

  useEffect(() => {
    if (!user || !authorId || isOwn) return;
    let cancel = false;
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", authorId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancel) setFollowing(!!data);
      });
    return () => {
      cancel = true;
    };
  }, [user, authorId, isOwn]);

  const handleShare = async () => {
    const url = `${window.location.origin}/u/${authorHandle}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `@${authorHandle} no TekTek`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      }
    } catch {
      /* cancelled */
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!authorId || isOwn || following) return;
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: authorId });
    if (!error) {
      setFollowing(true);
      toast.success(`Seguindo @${authorHandle}`);
    }
  };

  const handleLike = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    onLike();
  };
  const handleSave = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    onSave();
  };

  return (
    <>
      <div className="flex flex-col items-center gap-5">
        <div className="relative pb-2">
          <button onClick={() => navigate(`/u/${authorHandle}`)}>
            <img
              src={authorAvatar}
              alt={authorHandle}
              className="h-12 w-12 rounded-full border-2 border-foreground bg-card object-cover"
            />
          </button>
          {!isOwn && !following && (
            <button
              onClick={handleFollow}
              aria-label="Seguir"
              className="absolute -bottom-1 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-gradient-brand text-background shadow-action"
            >
              <UserPlus className="h-3 w-3" strokeWidth={3} />
            </button>
          )}
        </div>

        <Action ariaLabel="Curtir" count={formatCount(stats.likes)} onClick={handleLike}>
          <AnimatePresence mode="wait">
            <motion.span
              key={String(liked)}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
            >
              <Heart
                className={`h-7 w-7 transition ${
                  liked ? "fill-neon-magenta text-neon-magenta" : "text-foreground"
                }`}
                strokeWidth={2}
              />
            </motion.span>
          </AnimatePresence>
        </Action>

        <Action
          ariaLabel="Comentar"
          count={formatCount(stats.comments)}
          onClick={() => setCommentsOpen(true)}
        >
          <MessageCircle className="h-7 w-7 text-foreground" strokeWidth={2} />
        </Action>

        <Action ariaLabel="Salvar" count={formatCount(stats.saves)} onClick={handleSave}>
          <Bookmark
            className={`h-7 w-7 transition ${
              saved ? "fill-neon-cyan text-neon-cyan" : "text-foreground"
            }`}
            strokeWidth={2}
          />
        </Action>

        <Action
          ariaLabel="Compartilhar"
          count={formatCount(stats.shares)}
          onClick={handleShare}
        >
          <Share2 className="h-6 w-6 text-foreground" strokeWidth={2} />
        </Action>

        <div className="relative mt-2">
          <div className="absolute inset-0 rounded-full bg-gradient-brand opacity-60 blur-md" />
          <div className="relative grid h-11 w-11 animate-spin-slow place-items-center rounded-full bg-gradient-to-br from-card to-background ring-1 ring-foreground/20">
            <Music2 className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </div>

      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        videoId={videoId}
      />
    </>
  );
};
