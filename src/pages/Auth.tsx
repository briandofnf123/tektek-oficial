import { z } from "zod";
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/tektek/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z
  .string()
  .min(6, "Mínimo 6 caracteres")
  .max(72, "Máximo 72 caracteres");
const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres")
  .max(40, "Máximo 40 caracteres");

type Mode = "signin" | "signup";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(
    (location.state as { mode?: Mode })?.mode ?? "signin",
  );
  const prefillEmail = (location.state as { email?: string })?.email ?? "";
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in → home
  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const eParsed = emailSchema.safeParse(email);
      if (!eParsed.success) throw new Error(eParsed.error.issues[0].message);
      const pParsed = passwordSchema.safeParse(password);
      if (!pParsed.success) throw new Error(pParsed.error.issues[0].message);

      if (mode === "signup") {
        const dParsed = displayNameSchema.safeParse(displayName);
        if (!dParsed.success) throw new Error(dParsed.error.issues[0].message);

        const { error } = await supabase.auth.signUp({
          email: eParsed.data,
          password: pParsed.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: dParsed.data },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            throw new Error("Esse email já está cadastrado. Faça login.");
          }
          throw error;
        }
        toast.success("Bem-vindo ao TekTek! 🎬");
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: eParsed.data,
          password: pParsed.data,
        });
        if (error) {
          if (error.message.toLowerCase().includes("invalid")) {
            throw new Error("Email ou senha incorretos");
          }
          throw error;
        }
        toast.success("De volta ao feed! ⚡");
        navigate("/", { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo deu errado");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result.error) throw result.error;
      // success: session is set, redirect happens via auth listener
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login Google");
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-glow opacity-70" />

      <header className="relative z-10 flex items-center px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <Link
          to="/"
          aria-label="Voltar"
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 text-center">
          <Logo />
        </div>
        <div className="w-10" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-6 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {mode === "signin" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Entre para curtir, comentar e seguir criadores."
                : "Junte-se à comunidade TekTek e comece a postar."}
            </p>
          </motion.div>
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {mode === "signup" && (
            <Field
              icon={<UserIcon className="h-4 w-4" />}
              type="text"
              placeholder="Nome de exibição"
              value={displayName}
              onChange={setDisplayName}
              autoComplete="name"
            />
          )}
          <Field
            icon={<Mail className="h-4 w-4" />}
            type="email"
            placeholder="Email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            icon={<Lock className="h-4 w-4" />}
            type="password"
            placeholder="Senha"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />

          <button
            type="submit"
            disabled={busy}
            className="relative mt-2 w-full overflow-hidden rounded-full bg-gradient-brand py-3.5 font-display font-bold text-background shadow-action transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : mode === "signin" ? (
              "Entrar"
            ) : (
              "Criar conta"
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            ou
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card py-3.5 font-medium transition hover:bg-muted active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleIcon />
          Continuar com Google
        </button>

        <p className="mt-auto pb-8 pt-10 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Novo no TekTek?" : "Já tem conta?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-gradient-brand"
          >
            {mode === "signin" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </main>
    </div>
  );
};

const Field = ({
  icon,
  ...props
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) => (
  <label className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition focus-within:border-primary focus-within:glow-cyan">
    <span className="text-muted-foreground group-focus-within:text-primary">
      {icon}
    </span>
    <input
      type={props.type}
      placeholder={props.placeholder}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      autoComplete={props.autoComplete}
      className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
    />
  </label>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);

export default Auth;
