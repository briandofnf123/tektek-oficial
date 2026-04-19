import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, BadgeCheck, Music2, Play, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ActionRail } from "./ActionRail";
import type { VideoWithAuthor } from "@/hooks/useVideos";

const MUTE_KEY = "tektek.feed_muted";

type Burst = { id: number; x: number; y: number };

export const VideoCard = ({
  item,
  isFirst,
}: {
  item: VideoWithAuthor;
  isFirst?: boolean;
}) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(MUTE_KEY) !== "0";
  });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideoFile = !!item.video_url && item.video_url !== item.thumbnail_url;
  const handle = item.author?.username ?? "criador";
  const verified = item.author?.verified ?? false;

  // Load liked/saved state
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    Promise.all([
      supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", user.id)
        .eq("video_id", item.id)
        .maybeSingle(),
      supabase
        .from("video_saves")
        .select("video_id")
        .eq("user_id", user.id)
        .eq("video_id", item.id)
        .maybeSingle(),
    ]).then(([l, s]) => {
      if (cancel) return;
      setLiked(!!l.data);
      setSaved(!!s.data);
    });
    return () => {
      cancel = true;
    };
  }, [user, item.id]);

  // Keep play/pause + mute in sync
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (paused) v.pause();
    else v.play().catch(() => undefined);
  }, [paused, muted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const onTime = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const toggleLike = async () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    if (next) {
      await supabase.from("video_likes").insert({ user_id: user.id, video_id: item.id });
    } else {
      await supabase
        .from("video_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", item.id);
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    if (next) {
      await supabase.from("video_saves").insert({ user_id: user.id, video_id: item.id });
    } else {
      await supabase
        .from("video_saves")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", item.id);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now();
    setBursts((b) => [...b, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    if (!liked) toggleLike();
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 800);
  };

  return (
    <section className="snap-item relative h-[100dvh] w-full overflow-hidden bg-background">
      {isVideoFile ? (
        <video
          ref={videoRef}
          src={item.video_url}
          poster={item.thumbnail_url ?? undefined}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay={isFirst}
          loop
          playsInline
          preload={isFirst ? "auto" : "metadata"}
          onTimeUpdate={onTime}
        />
      ) : (
        <img
          src={item.thumbnail_url ?? item.video_url}
          alt={item.caption}
          className="absolute inset-0 h-full w-full object-cover"
          loading={isFirst ? "eager" : "lazy"}
        />
      )}

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-overlay" />

      {/* Tap layer */}
      <div
        className="absolute inset-0"
        onClick={() => isVideoFile && setPaused((p) => !p)}
        onDoubleClick={handleDoubleTap}
      />

      {/* Mute toggle */}
      {isVideoFile && (
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute right-3 top-[max(env(safe-area-inset-top),12px)] z-30 grid h-10 w-10 place-items-center rounded-full bg-background/40 text-foreground backdrop-blur-md transition active:scale-95"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}

      {/* Pause icon */}
      <AnimatePresence>
        {paused && isVideoFile && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div className="rounded-full bg-foreground/15 p-6 backdrop-blur-md">
              <Play className="h-12 w-12 fill-foreground text-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heart bursts */}
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            className="pointer-events-none absolute"
            style={{ left: b.x - 48, top: b.y - 48 }}
            initial={{ scale: 0, rotate: -15, opacity: 1 }}
            animate={{ scale: 1.2, rotate: 0, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 12 }}
          >
            <Heart className="h-24 w-24 fill-neon-magenta text-neon-magenta drop-shadow-[0_0_20px_hsl(var(--neon-magenta)/0.8)]" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Caption + author info */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-3 px-4 pb-28">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Link
              to={`/u/${handle}`}
              className="font-display text-[17px] font-bold text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
            >
              @{handle}
            </Link>
            {verified && <BadgeCheck className="h-4 w-4 fill-neon-cyan text-background" />}
          </div>

          {item.caption && (
            <p className="line-clamp-2 text-[14px] leading-snug text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {item.caption}{" "}
              {item.tags.map((t) => (
                <span key={t} className="font-semibold text-neon-cyan">
                  #{t}{" "}
                </span>
              ))}
            </p>
          )}

          <div className="flex items-center gap-2 overflow-hidden">
            <Music2 className="h-3.5 w-3.5 shrink-0 text-foreground" />
            <span className="text-xs font-medium text-foreground/90">
              som original · @{handle}
            </span>
          </div>
        </div>

        {/* Right action rail */}
        <div className="z-30">
          <ActionRail
            videoId={item.id}
            authorId={item.author?.user_id ?? null}
            authorHandle={handle}
            authorAvatar={
              item.author?.avatar_url ??
              `https://api.dicebear.com/9.x/avataaars/svg?seed=${handle}`
            }
            stats={{
              likes: item.like_count + (liked ? 1 : 0),
              comments: item.comment_count,
              saves: item.save_count + (saved ? 1 : 0),
              shares: item.share_count,
            }}
            liked={liked}
            saved={saved}
            onLike={toggleLike}
            onSave={toggleSave}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute inset-x-0 bottom-[88px] z-20 h-[3px] bg-foreground/15">
        <div
          className="h-full bg-gradient-brand transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
};
