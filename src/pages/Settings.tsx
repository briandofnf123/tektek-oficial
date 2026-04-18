import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  if (!user || !profile) {
    navigate("/auth");
    return null;
  }

  const sections = [
    {
      title: "Conta",
      items: [
        {
          icon: User,
          label: "Editar perfil",
          onClick: () => navigate("/profile/edit"),
          chevron: true,
        },
        {
          icon: Lock,
          label: "Conta privada",
          toggle: privateAccount,
          onToggle: () => {
            setPrivateAccount((v) => !v);
            toast.success(
              privateAccount ? "Conta agora é pública" : "Conta agora é privada",
            );
          },
        },
        {
          icon: Shield,
          label: "Segurança e login",
          onClick: () => navigate("/profile/edit"),
          chevron: true,
        },
      ],
    },
    {
      title: "Preferências",
      items: [
        {
          icon: Bell,
          label: "Notificações push",
          toggle: notifications,
          onToggle: () => {
            setNotifications((v) => !v);
            toast.success(
              notifications ? "Notificações desativadas" : "Notificações ativas",
            );
          },
        },
        {
          icon: Moon,
          label: "Modo escuro",
          toggle: darkMode,
          onToggle: () => {
            setDarkMode((v) => !v);
            toast("Tema fixo no momento 🌙");
          },
        },
        {
          icon: Globe,
          label: "Idioma",
          value: "Português",
          onClick: () => toast.success("TekTek está em Português 🇧🇷"),
          chevron: true,
        },
      ],
    },
    {
      title: "Suporte",
      items: [
        {
          icon: HelpCircle,
          label: "Central de ajuda",
          onClick: () =>
            toast.success("Fale com a gente: suporte@tektek.app"),
          chevron: true,
        },
        {
          icon: Sparkles,
          label: "Sobre o TekTek",
          onClick: () =>
            toast.success("TekTek v1.0 — feito com 💜 para criadores"),
          chevron: true,
        },
      ],
    },
  ];

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
        <h1 className="font-display text-lg font-bold">Configurações</h1>
        <div className="w-10" />
      </header>

      <main className="h-[calc(100dvh-56px)] overflow-y-auto no-scrollbar pb-10">
        <div className="px-5 py-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Logado como
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
                    {"chevron" in item && item.chevron && (
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
              toast.success("Você saiu");
              navigate("/");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 py-3 font-display font-bold text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
