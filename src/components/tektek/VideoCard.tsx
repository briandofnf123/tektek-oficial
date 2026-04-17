import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Pause, BadgeCheck, Music2 } from "lucide-react";
import type { FeedItem } from "@/data/feed";
import { ActionRail } from "./ActionRail";

type Burst = { id: number; x: number; y: number };

export const VideoCard = ({ item, isFirst }: { item: FeedItem; isFirst?: boolean }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [progress] = useState(() => 20 + Math.random() * 60);

  const triggerLike = () => setLiked((v) => !v);

  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now();
    setBursts((b) => [...b, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setLiked(true);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 800);
  };

  return (
    <section className="snap-item relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Poster (stand-in for video) */}
      <img
        src={item.poster}
        alt={item.caption}
        className="absolute inset-0 h-full w-full object-cover"
        loading={isFirst ? "eager" : "lazy"}
        width={576}
        height={1024}
        decoding={isFirst ? "sync" : "async"}
      />

      {/* Subtle vignette + bottom fade */}
      <div className="absolute inset-0 bg-gradient-overlay" />

      {/* Tap layer */}
      <div
        className="absolute inset-0"
        onClick={() => setPaused((p) => !p)}
        onDoubleClick={handleDoubleTap}
      />

      {/* Pause icon */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div className="rounded-full bg-foreground/15 p-6 backdrop-blur-md">
              <Pause className="h-12 w-12 fill-foreground text-foreground" />
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
            <span className="font-display text-[17px] font-bold text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              @{item.author.handle}
            </span>
            {item.author.verified && (
              <BadgeCheck className="h-4 w-4 fill-neon-cyan text-background" />
            )}
            <span className="text-foreground/70">·</span>
            <button className="rounded-full border border-foreground/70 px-3 py-0.5 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background">
              Seguir
            </button>
          </div>

          <p className="line-clamp-2 text-[14px] leading-snug text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {item.caption}{" "}
            {item.tags.map((t) => (
              <span key={t} className="font-semibold text-neon-cyan">
                {t}{" "}
              </span>
            ))}
          </p>

          {/* Music marquee */}
          <div className="flex items-center gap-2 overflow-hidden">
            <Music2 className="h-3.5 w-3.5 shrink-0 text-foreground" />
            <div className="overflow-hidden whitespace-nowrap">
              <div className="marquee inline-block">
                <span className="text-xs font-medium text-foreground/90">
                  {item.music} &nbsp;·&nbsp; {item.music} &nbsp;·&nbsp;
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right action rail */}
        <div className="z-30">
          <ActionRail
            item={item}
            liked={liked}
            saved={saved}
            onLike={triggerLike}
            onSave={() => setSaved((v) => !v)}
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
