import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Loader2, Music2, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { captureVideoThumbnail, readImageDimensions } from "@/lib/media";

const MAX_VIDEO_MB = 100;
const MAX_IMAGE_MB = 10;

const Upload_ = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"video" | "photo">("video");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVid = f.type.startsWith("video/");
    const isImg = f.type.startsWith("image/");
    if (mode === "video" && !isVid) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    if (mode === "photo" && !isImg) {
      toast.error("Selecione uma imagem");
      return;
    }
    const maxMb = mode === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (f.size > maxMb * 1024 * 1024) {
      toast.error(`Arquivo muito grande (máx ${maxMb}MB)`);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setTagsInput("");
    setProgress(0);
  };

  const publish = async () => {
    if (!user || !file || uploading) return;
    setUploading(true);
    setProgress(8);

    try {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const stamp = Date.now();
      const folder = user.id;

      let videoUrl = "";
      let thumbUrl: string | null = null;
      let storagePath = "";
      let width: number | null = null;
      let height: number | null = null;
      let duration = 0;

      if (isVideo) {
        // 1) Upload video
        const path = `${folder}/${stamp}.${ext}`;
        const { error: vErr } = await supabase.storage
          .from("videos")
          .upload(path, file, { contentType: file.type, cacheControl: "3600" });
        if (vErr) throw vErr;
        videoUrl = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
        storagePath = path;
        setProgress(60);

        // 2) Generate + upload thumbnail
        try {
          const thumb = await captureVideoThumbnail(file, 0.5);
          width = thumb.width;
          height = thumb.height;
          duration = thumb.duration;
          const thumbPath = `${folder}/${stamp}.jpg`;
          const { error: tErr } = await supabase.storage
            .from("thumbnails")
            .upload(thumbPath, thumb.blob, {
              contentType: "image/jpeg",
              cacheControl: "3600",
            });
          if (!tErr) {
            thumbUrl = supabase.storage.from("thumbnails").getPublicUrl(thumbPath).data.publicUrl;
          }
        } catch {
          /* thumbnail optional */
        }
        setProgress(85);
      } else {
        // Photo: store as "video" record using image as both video_url and thumb
        const path = `${folder}/${stamp}.${ext}`;
        const { error: pErr } = await supabase.storage
          .from("thumbnails")
          .upload(path, file, { contentType: file.type, cacheControl: "3600" });
        if (pErr) throw pErr;
        thumbUrl = supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
        videoUrl = thumbUrl;
        storagePath = path;
        try {
          const dims = await readImageDimensions(file);
          width = dims.width;
          height = dims.height;
        } catch {
          /* ignore */
        }
        setProgress(80);
      }

      // 3) Insert row
      const tags = tagsInput
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#+/, "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10);

      const { error: iErr } = await supabase.from("videos").insert({
        user_id: user.id,
        storage_path: storagePath,
        video_url: videoUrl,
        thumbnail_url: thumbUrl,
        caption: caption.trim(),
        tags,
        duration_seconds: duration,
        width,
        height,
      });
      if (iErr) throw iErr;

      setProgress(100);
      toast.success(isVideo ? "Vídeo publicado! 🎬" : "Foto publicada! 📸");
      reset();
      navigate("/");
    } catch (e) {
      const msg = (e as Error)?.message ?? "Falha ao publicar";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !profile) return null;

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => (uploading ? null : navigate(-1))}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10 disabled:opacity-50"
          aria-label="Cancelar"
          disabled={uploading}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold">Novo post</h1>
        <button
          onClick={publish}
          disabled={!file || uploading}
          className="rounded-full bg-gradient-brand px-4 py-1.5 text-sm font-bold text-background disabled:opacity-40"
        >
          {uploading ? "Publicando…" : "Publicar"}
        </button>
      </header>

      {uploading && (
        <div className="mx-4 mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-brand transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <main className="h-[calc(100dvh-72px)] overflow-y-auto no-scrollbar pb-12">
        {/* Mode toggle */}
        <div className="mx-5 mt-2 flex gap-2 rounded-full border border-border bg-card p-1">
          {(
            [
              { id: "video", icon: Video, label: "Vídeo" },
              { id: "photo", icon: ImageIcon, label: "Foto" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                if (uploading) return;
                if (file) reset();
                setMode(id);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
                mode === id ? "bg-gradient-brand text-background" : "text-foreground/70"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Picker / Preview */}
        <section className="mx-5 mt-5">
          {!file ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="relative grid aspect-[9/16] w-full place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-card transition hover:border-primary"
            >
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand text-background">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="font-display text-lg font-bold">
                  {mode === "video" ? "Subir vídeo" : "Subir foto"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode === "video"
                    ? "MP4, MOV ou WebM até 100MB"
                    : "JPG, PNG ou WebP até 10MB"}
                </p>
              </div>
            </button>
          ) : (
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-black">
              {file.type.startsWith("video/") ? (
                <video
                  src={previewUrl ?? undefined}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={previewUrl ?? undefined}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              {!uploading && (
                <button
                  onClick={reset}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/70 backdrop-blur-md"
                  aria-label="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={mode === "video" ? "video/*" : "image/*"}
            className="hidden"
            onChange={onPick}
          />
        </section>

        {/* Caption */}
        <section className="mx-5 mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Legenda
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="Conte o que está rolando…"
            className="mt-2 w-full resize-none rounded-2xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
            disabled={uploading}
          />
          <div className="mt-1 text-right text-[11px] text-muted-foreground">
            {caption.length}/280
          </div>
        </section>

        {/* Tags */}
        <section className="mx-5 mt-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tags
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="fyp, dance, music"
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            disabled={uploading}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Separe por espaço ou vírgula. Sem # — colocamos pra você.
          </p>
        </section>

        {/* Music CTA */}
        <button
          onClick={() => navigate("/music")}
          disabled={uploading}
          className="mx-5 mt-5 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl border border-border bg-gradient-brand-soft p-3 text-left transition hover:border-primary"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-background">
            <Music2 className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold">Adicionar som</p>
            <p className="text-[11px] text-muted-foreground">
              Procure no catálogo TekTek Music
            </p>
          </div>
        </button>
      </main>
    </div>
  );
};

export default Upload_;
