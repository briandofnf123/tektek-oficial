import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Music2, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const GENRES = ["Pop", "Hip Hop", "Eletrônica", "R&B", "Funk", "Sertanejo", "Rock", "Indie", "Lo-fi", "Jazz", "Latino"];

const ArtistUpload = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile && !artist) setArtist(profile.display_name);
  }, [profile, artist]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const onAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) {
      toast.error("Selecione um arquivo de áudio (mp3, wav, m4a)");
      return;
    }
    if (f.size > 30 * 1024 * 1024) {
      toast.error("Áudio muito grande (máx 30MB)");
      return;
    }
    setAudio(f);
  };
  const onCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCover(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user) return;
    if (!audio) {
      toast.error("Adicione o arquivo da faixa");
      return;
    }
    if (title.trim().length < 2) {
      toast.error("Título muito curto");
      return;
    }
    setSubmitting(true);

    try {
      // Get audio duration
      let duration = 30;
      try {
        duration = Math.round(
          await new Promise<number>((res, rej) => {
            const a = new Audio(URL.createObjectURL(audio));
            a.onloadedmetadata = () => res(a.duration || 30);
            a.onerror = () => rej(new Error("audio"));
          }),
        );
      } catch {
        /* fallback */
      }

      // Upload cover (optional) into thumbnails bucket
      let coverUrl: string | null = null;
      if (cover) {
        const ext = cover.name.split(".").pop() || "jpg";
        const path = `${user.id}/track-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("thumbnails")
          .upload(path, cover, { contentType: cover.type, cacheControl: "3600" });
        if (!error) {
          coverUrl = supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
        }
      }

      // NOTE: audio file storage will be added when audio bucket is wired.
      // For now we register the track metadata so it appears in the catalog.
      const { error } = await supabase.from("tracks").insert({
        title: title.trim(),
        artist: artist.trim() || profile?.display_name || "Artista",
        genre,
        cover_url: coverUrl,
        duration_seconds: duration,
        is_official: false,
        uploaded_by: user.id,
      });
      if (error) throw error;

      toast.success("Faixa enviada para revisão! 🎤");
      navigate("/music");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <h1 className="font-display text-lg font-bold">Distribuir faixa</h1>
        <button
          onClick={submit}
          disabled={!audio || submitting}
          className="rounded-full bg-gradient-brand px-4 py-1.5 text-sm font-bold text-background disabled:opacity-40"
        >
          {submitting ? "Enviando…" : "Enviar"}
        </button>
      </header>

      <main className="h-[calc(100dvh-56px)] overflow-y-auto no-scrollbar pb-12">
        <section className="px-6 pt-3">
          <p className="text-sm text-muted-foreground">
            Cadastre sua música no catálogo oficial do TekTek e seja descoberto por milhões de criadores.
          </p>
        </section>

        {/* Cover */}
        <section className="mt-6 flex flex-col items-center px-6">
          <button
            onClick={() => coverRef.current?.click()}
            className="group relative grid h-44 w-44 place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-card transition hover:border-primary"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Music2 className="h-8 w-8" />
                <span className="text-xs font-semibold">Capa do álbum</span>
              </div>
            )}
          </button>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={onCover} />
        </section>

        {/* Audio file picker */}
        <section className="mx-6 mt-6">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Arquivo da faixa
          </label>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-background">
              <UploadIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {audio ? audio.name : "Escolher MP3, WAV ou M4A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {audio ? `${(audio.size / 1024 / 1024).toFixed(1)} MB` : "Até 30MB"}
              </p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={onAudio} />
        </section>

        {/* Metadata */}
        <section className="mx-6 mt-5 space-y-4">
          <Field label="Título da faixa">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ex: Meia-noite em Lisboa"
              className="h-11 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
            />
          </Field>
          <Field label="Artista / Nome de palco">
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              maxLength={60}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
            />
          </Field>
          <Field label="Gênero">
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    genre === g
                      ? "border-primary bg-gradient-brand text-background"
                      : "border-border bg-card text-foreground/80"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
        </section>

        <p className="mx-6 mt-6 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
          Ao enviar, você confirma que detém os direitos da obra. Faixas passam por revisão antes de aparecerem no catálogo público.
        </p>
      </main>
    </div>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);

export default ArtistUpload;
