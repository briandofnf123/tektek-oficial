import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Loader2, Music2, Plus, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { captureVideoThumbnail, readImageDimensions } from "@/lib/media";

const MAX_VIDEO_MB = 500;
const MAX_IMAGE_MB = 25;
const MAX_PHOTOS = 20;

type PickedPhoto = { file: File; previewUrl: string };

const Upload_ = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"video" | "photo">("video");

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Photos state (multiple)
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

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
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (mode === "video") {
      const f = files[0];
      if (!f.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(f.name)) {
        toast.error("Selecione um arquivo de vídeo");
        return;
      }
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        toast.error(`Vídeo muito grande (máx ${MAX_VIDEO_MB}MB)`);
        return;
      }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoFile(f);
      setVideoPreviewUrl(URL.createObjectURL(f));
    } else {
      const remaining = MAX_PHOTOS - photos.length;
      if (remaining <= 0) {
        toast.error(`Máximo de ${MAX_PHOTOS} fotos`);
        return;
      }
      const valid: PickedPhoto[] = [];
      for (const f of files.slice(0, remaining)) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
          toast.error(`"${f.name}" passa de ${MAX_IMAGE_MB}MB`);
          continue;
        }
        valid.push({ file: f, previewUrl: URL.createObjectURL(f) });
      }
      setPhotos((prev) => [...prev, ...valid]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const reset = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setPhotos([]);
    setCaption("");
    setTagsInput("");
    setProgress(0);
  };

  const switchMode = (m: "video" | "photo") => {
    if (uploading) return;
    if (videoFile || photos.length) reset();
    setMode(m);
  };

  const hasContent = mode === "video" ? !!videoFile : photos.length > 0;

  const publish = async () => {
    if (!user || uploading) return;
    if (!hasContent) return;

    setUploading(true);
    setProgress(5);

    const tags = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#+/, "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);

    try {
      if (mode === "video" && videoFile) {
        const ext = (videoFile.name.split(".").pop() || "mp4").toLowerCase();
        const stamp = Date.now();
        const folder = user.id;

        // 1) Upload video file
        const path = `${folder}/${stamp}.${ext}`;
        const { error: vErr } = await supabase.storage
          .from("videos")
          .upload(path, videoFile, {
            contentType: videoFile.type || "video/mp4",
            cacheControl: "3600",
            upsert: false,
          });
        if (vErr) {
          console.error("[upload-video]", vErr);
          throw new Error(`Falha ao subir vídeo: ${vErr.message}`);
        }
        const videoUrl = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
        setProgress(60);

        // 2) Thumbnail (best effort)
        let thumbUrl: string | null = null;
        let width: number | null = null;
        let height: number | null = null;
        let duration = 0;
        try {
          const thumb = await captureVideoThumbnail(videoFile, 0.5);
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
        } catch (e) {
          console.warn("[upload-thumb]", e);
        }
        setProgress(85);

        const { error: iErr } = await supabase.from("videos").insert({
          user_id: user.id,
          storage_path: path,
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
        toast.success("Vídeo publicado! 🎬");
      } else {
        // Photo carousel — upload each photo, create one row per photo (simple model)
        const stamp = Date.now();
        const folder = user.id;
        const total = photos.length;
        for (let i = 0; i < total; i++) {
          const p = photos[i];
          const ext = (p.file.name.split(".").pop() || "jpg").toLowerCase();
          const path = `${folder}/${stamp}-${i}.${ext}`;
          const { error: pErr } = await supabase.storage
            .from("thumbnails")
            .upload(path, p.file, {
              contentType: p.file.type || "image/jpeg",
              cacheControl: "3600",
              upsert: false,
            });
          if (pErr) {
            console.error("[upload-photo]", pErr);
            throw new Error(`Falha na foto ${i + 1}: ${pErr.message}`);
          }
          const url = supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
          let width: number | null = null;
          let height: number | null = null;
          try {
            const dims = await readImageDimensions(p.file);
            width = dims.width;
            height = dims.height;
          } catch {
            /* ignore */
          }

          const { error: iErr } = await supabase.from("videos").insert({
            user_id: user.id,
            storage_path: path,
            video_url: url,
            thumbnail_url: url,
            caption: i === 0 ? caption.trim() : "",
            tags: i === 0 ? tags : [],
            duration_seconds: 0,
            width,
            height,
          });
          if (iErr) throw iErr;

          setProgress(Math.round(((i + 1) / total) * 95));
        }
        setProgress(100);
        toast.success(
          total > 1 ? `${total} fotos publicadas! 📸` : "Foto publicada! 📸",
        );
      }

      reset();
      navigate("/");
    } catch (e) {
      const msg = (e as Error)?.message ?? "Falha ao publicar";
      console.error("[publish]", e);
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
          disabled={!hasContent || uploading}
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
              onClick={() => switchMode(id)}
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
          {mode === "video" ? (
            !videoFile ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="relative grid aspect-[9/16] w-full place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-card transition hover:border-primary"
              >
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand text-background">
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="font-display text-lg font-bold">Subir vídeo</p>
                  <p className="text-sm text-muted-foreground">
                    MP4, MOV ou WebM até 500MB
                  </p>
                </div>
              </button>
            ) : (
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-black">
                <video
                  src={videoPreviewUrl ?? undefined}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
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
            )
          ) : (
            // Photos grid
            <div>
              {photos.length === 0 ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="relative grid aspect-[9/16] w-full place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-card transition hover:border-primary"
                >
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand text-background">
                      <Upload className="h-7 w-7" />
                    </div>
                    <p className="font-display text-lg font-bold">Subir fotos</p>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG ou WebP até 25MB cada · até {MAX_PHOTOS} fotos
                    </p>
                  </div>
                </button>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, idx) => (
                      <div
                        key={p.previewUrl}
                        className="relative aspect-square overflow-hidden rounded-xl bg-card"
                      >
                        <img
                          src={p.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {!uploading && (
                          <button
                            onClick={() => removePhoto(idx)}
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/80 backdrop-blur"
                            aria-label="Remover"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {idx === 0 && (
                          <span className="absolute left-1 top-1 rounded-full bg-gradient-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-background">
                            capa
                          </span>
                        )}
                      </div>
                    ))}
                    {photos.length < MAX_PHOTOS && !uploading && (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-foreground"
                        aria-label="Adicionar mais fotos"
                      >
                        <Plus className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {photos.length} / {MAX_PHOTOS} fotos
                  </p>
                </>
              )}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={mode === "video" ? "video/*" : "image/*"}
            multiple={mode === "photo"}
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
            <p className="text-sm font-bold">Adicionar som (opcional)</p>
            <p className="text-[11px] text-muted-foreground">
              Pode publicar sem música — o áudio original será mantido
            </p>
          </div>
        </button>
      </main>
    </div>
  );
};

export default Upload_;
