import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/tektek/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleOAuth = async (provider: "google" | "apple") => {
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${provider} error`);
      setBusy(null);
    }
  };

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-glow opacity-70" />

      <header className="relative z-10 flex items-center px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <Link
          to="/"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 text-center">
          <Logo />
        </div>
        <div className="w-10" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-6 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("auth.welcome_back")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.welcome_sub")}
          </p>
        </motion.div>

        <div className="mt-12 space-y-3">
          <ProviderButton
            onClick={() => handleOAuth("google")}
            busy={busy === "google"}
            disabled={!!busy}
            icon={<GoogleIcon />}
            label={t("auth.continue_google")}
          />

          <ProviderButton
            onClick={() => handleOAuth("apple")}
            busy={busy === "apple"}
            disabled={!!busy}
            icon={<AppleIcon />}
            label={t("auth.continue_apple")}
            variant="dark"
          />

          <ProviderButton
            onClick={() => toast(t("auth.facebook_soon"))}
            busy={false}
            disabled={!!busy}
            icon={<FacebookIcon />}
            label={t("auth.continue_facebook")}
            variant="facebook"
            soon
          />
        </div>

        <p className="mt-auto pb-10 pt-12 text-center text-xs text-muted-foreground">
          {t("auth.terms")}
        </p>
      </main>
    </div>
  );
};

const ProviderButton = ({
  onClick,
  busy,
  disabled,
  icon,
  label,
  variant = "light",
  soon = false,
}: {
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: "light" | "dark" | "facebook";
  soon?: boolean;
}) => {
  const styles =
    variant === "dark"
      ? "bg-foreground text-background"
      : variant === "facebook"
        ? "bg-[#1877F2] text-white"
        : "border border-border bg-card text-foreground hover:bg-muted";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex w-full items-center justify-center gap-3 rounded-full py-3.5 font-medium transition active:scale-[0.98] disabled:opacity-60 ${styles}`}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      <span>{label}</span>
      {soon && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          soon
        </span>
      )}
    </button>
  );
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
  </svg>
);

export default Auth;
