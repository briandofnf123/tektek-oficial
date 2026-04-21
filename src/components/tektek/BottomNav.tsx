import { Compass, Home, Inbox, Plus, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  id: string;
  icon: typeof Home;
  label: string;
  primary?: boolean;
  to: string;
};

const items: NavItem[] = [
  { id: "home", icon: Home, label: "Início", to: "/" },
  { id: "discover", icon: Compass, label: "Descobrir", to: "/discover" },
  { id: "upload", icon: Plus, label: "Postar", primary: true, to: "/upload" },
  { id: "inbox", icon: Inbox, label: "Inbox", to: "/inbox" },
  { id: "profile", icon: User, label: "Perfil", to: "/profile" },
];

export const BottomNav = ({
  active = "home",
  hidden = false,
}: {
  active?: string;
  hidden?: boolean;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [current, setCurrent] = useState<string>(active);

  if (hidden) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] bg-gradient-overlay px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-3">
      <div className="flex items-end justify-around">
        {items.map(({ id, icon: Icon, label, primary, to }) => {
          const isActive = current === id;
          const handle = () => {
            setCurrent(id);
            if (id === "upload" && !user) {
              navigate("/auth");
              return;
            }
            navigate(to);
          };
          if (primary) {
            return (
              <button
                key={id}
                onClick={handle}
                className="group relative -mt-2"
                aria-label={label}
              >
                <span className="absolute inset-0 rounded-2xl bg-gradient-brand opacity-70 blur-md transition group-hover:opacity-100" />
                <span className="relative flex h-11 w-16 items-center justify-center gap-1 rounded-2xl bg-gradient-brand text-background shadow-action">
                  <Icon className="h-6 w-6" strokeWidth={2.8} />
                </span>
              </button>
            );
          }
          return (
            <button
              key={id}
              onClick={handle}
              className="flex flex-col items-center gap-1 px-2"
              aria-label={label}
            >
              <Icon
                className={`h-6 w-6 transition ${
                  isActive ? "text-foreground" : "text-foreground/60"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-medium transition ${
                  isActive ? "text-foreground" : "text-foreground/55"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
