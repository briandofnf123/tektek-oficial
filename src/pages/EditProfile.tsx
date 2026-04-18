import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, loading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setUsername(profile.username);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !profile) {
    navigate("/auth");
    return null;
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Imagem grande demais (máx 5MB)");
      return;
    }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      toast.error("Usuário precisa ter ao menos 3 caracteres");
      return;
    }
    if (displayName.trim().length < 2) {
      toast.error("Nome de exibição muito curto");
      return;
    }
    setSaving(true);

    let avatarUrl = profile.avatar_url;

    // Upload avatar
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, cacheControl: "3600" });
      if (upErr) {
        toast.error("Falha ao subir avatar");
        setSaving(false);
        return;
      }
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    // Username unique check (only if changed)
    if (cleanUsername !== profile.username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();
      if (existing) {
        toast.error("Esse @ já está em uso");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar");
      return;
    }
    await refreshProfile();
    toast.success("Perfil atualizado ✨");
    navigate("/profile");
  };

  const currentAvatar =
    avatarPreview ??
    profile.avatar_url ??
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}`;

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Cancelar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold">Editar perfil</h1>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-gradient-brand px-4 py-1.5 text-sm font-bold text-background disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </header>

      <main className="h-[calc(100dvh-56px)] overflow-y-auto no-scrollbar pb-10">
        <section className="flex flex-col items-center pt-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative"
            aria-label="Trocar foto"
          >
            <div className="absolute inset-0 -m-1 rounded-full bg-gradient-brand opacity-50 blur-md transition group-hover:opacity-80" />
            <img
              src={currentAvatar}
              alt=""
              className="relative h-28 w-28 rounded-full border-2 border-background object-cover"
            />
            <span className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-background shadow-action">
              <Camera className="h-4 w-4" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
          <p className="mt-3 text-xs text-muted-foreground">Toque para mudar a foto</p>
        </section>

        <section className="mt-6 px-6">
          <Field label="Nome de exibição">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
            />
          </Field>
          <Field label="Nome de usuário">
            <div className="flex h-11 items-center rounded-xl border border-border bg-card pl-3">
              <span className="text-muted-foreground">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                className="h-full w-full bg-transparent pl-1 pr-3 outline-none"
              />
            </div>
          </Field>
          <Field label="Bio" hint={`${bio.length}/150`}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              rows={3}
              placeholder="Conta um pouco sobre você…"
              className="w-full resize-none rounded-xl border border-border bg-card p-3 outline-none focus:border-primary"
            />
          </Field>
        </section>
      </main>
    </div>
  );
};

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="mb-4">
    <div className="mb-1.5 flex items-center justify-between">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </div>
);

export default EditProfile;
