import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/translations";
import { SUPPORT_BOT } from "@/lib/supportBot";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { t, lang, setLang, languages } = useI18n();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  if (!user || !profile) {
    navigate("/auth");
    return null;
  }

  const currentLang = languages.find((l) => l.code === lang);

  const sections = [
    {
      title: t("settings.account"),
      items: [
        {
          icon: User,
          label: t("settings.edit_profile"),
          onClick: () => navigate("/profile/edit"),
          chevron: true,
        },
        {
          icon: Lock,
          label: t("settings.private"),
          toggle: privateAccount,
          onToggle: () => {
            setPrivateAccount((v) => !v);
            toast.success(privateAccount ? "Public" : "Private");
          },
        },
        {
          icon: Shield,
          label: t("settings.security"),
          onClick: () => toast(t("settings.soon")),
          badge: t("settings.soon"),
        },
      ],
    },
    {
      title: t("settings.prefs"),
      items: [
        {
          icon: Bell,
          label: t("settings.notifications"),
          toggle: notifications,
          onToggle: () => setNotifications((v) => !v),
        },
        {
          icon: Moon,
          label: t("settings.dark"),
          toggle: darkMode,
          onToggle: () => {
            setDarkMode((v) => !v);
            toast("🌙");
          },
        },
        {
          icon: Globe,
          label: t("settings.language"),
          value: `${currentLang?.flag ?? ""} ${currentLang?.label ?? ""}`,
          onClick: () => setLangOpen(true),
          chevron: true,
        },
      ],
    },
    {
      title: t("settings.support"),
      items: [
        {
          icon: HelpCircle,
          label: t("settings.help"),
          onClick: () =>
            navigate(`/inbox/${SUPPORT_BOT.username}`, {
              state: {
                peer: {
                  id: SUPPORT_BOT.user_id,
                  user_id: SUPPORT_BOT.user_id,
                  username: SUPPORT_BOT.username,
                  display_name: SUPPORT_BOT.display_name,
                  avatar_url: SUPPORT_BOT.avatar_url,
                  bio: SUPPORT_BOT.bio,
                  verified: true,
                  follower_count: 0,
                  following_count: 0,
                },
              },
            }),
          chevron: true,
        },
        {
          icon: Sparkles,
          label: t("settings.about"),
          onClick: () => toast.success("TekTek v1.0 💜"),
          chevron: true,
        },
      ],
    },
  ];

  const handlePickLang = (l: Lang) => {
    setLang(l);
    setLangOpen(false);
    setTimeout(() => toast.success(t("settings.lang_changed")), 100);
  };

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold">{t("settings.title")}</h1>
        <div className="w-10" />
      </header>

      <main className="h-[calc(100dvh-56px)] overflow-y-auto no-scrollbar pb-10">
        <div className="px-5 py-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("settings.logged_as")}
          </p>
          <p className="mt-1 font-display text-lg font-bold">@{profile.username}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {sections.map((section) => (
          <section key={section.title} className="mt-3">
            <h2 className="px-5 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h2>
            <ul className="border-y border-border bg-card">
              {section.items.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={"onToggle" in item ? item.onToggle : item.onClick}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-muted"
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm font-semibold">{item.label}</span>
                    {"value" in item && item.value && (
                      <span className="text-sm text-muted-foreground">{item.value}</span>
                    )}
                    {"badge" in item && item.badge && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                    {"toggle" in item && (
                      <span
                        className={`relative h-6 w-10 rounded-full transition ${
                          item.toggle ? "bg-gradient-brand" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${
                            item.toggle ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </span>
                    )}
                    {"chevron" in item && item.chevron && !("badge" in item) && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-6 px-5">
          <button
            onClick={async () => {
              await signOut();
              toast.success("👋");
              navigate("/");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 py-3 font-display font-bold text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {t("settings.signout")}
          </button>
        </div>
      </main>

      {/* Language picker */}
      <AnimatePresence>
        {langOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm"
            onClick={() => setLangOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full rounded-t-3xl border-t border-border bg-card p-2 pb-[max(env(safe-area-inset-bottom),16px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 pb-2 pt-2">
                <h3 className="font-display text-base font-bold">
                  {t("settings.choose_language")}
                </h3>
                <button
                  onClick={() => setLangOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="max-h-[60dvh] overflow-y-auto no-scrollbar">
                {languages.map((l) => (
                  <li key={l.code}>
                    <button
                      onClick={() => handlePickLang(l.code)}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-muted"
                    >
                      <span className="text-2xl">{l.flag}</span>
                      <span className="flex-1 text-sm font-semibold">{l.label}</span>
                      {lang === l.code && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
