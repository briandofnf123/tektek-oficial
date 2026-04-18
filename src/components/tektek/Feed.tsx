import { Sparkles, Upload as UploadIcon, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVideoFeed } from "@/hooks/useVideos";
import { useAuth } from "@/contexts/AuthContext";
import { VideoCard } from "./VideoCard";

export const Feed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { videos, loading } = useVideoFeed();

  if (loading) {
    return (
      <main className="grid h-[100dvh] place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (videos.length === 0) {
    return (
      <main className="grid h-[100dvh] place-items-center bg-background px-8">
        <div className="flex max-w-xs flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-gradient-brand opacity-50 blur-2xl" />
            <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-brand text-background shadow-action">
              <Video className="h-9 w-9" strokeWidth={2.2} />
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            O feed está esperando
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Seja o primeiro criador a postar no TekTek. Vídeos enviados pelos usuários aparecerão aqui.
          </p>
          <button
            onClick={() => navigate(user ? "/upload" : "/auth")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 font-display text-sm font-bold text-background shadow-action"
          >
            <UploadIcon className="h-4 w-4" />
            Postar primeiro vídeo
          </button>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            MP4, MOV ou WebM até 100MB
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="snap-feed no-scrollbar h-[100dvh] overflow-y-auto">
      {videos.map((item, i) => (
        <VideoCard key={item.id} item={item} isFirst={i === 0} />
      ))}
    </main>
  );
};
