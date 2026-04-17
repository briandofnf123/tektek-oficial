import { Compass, Home, Inbox, Music2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

type NavItem = {
  id: string;
  icon: typeof Home;
  label: string;
  primary?: boolean;
  to?: string;
};

const items: NavItem[] = [
  { id: "home", icon: Home, label: "Início", to: "/" },
  { id: "discover", icon: Compass, label: "Descobrir" },
  { id: "music", icon: Music2, label: "Music", primary: true, to: "/music" },
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "profile", icon: User, label: "Perfil", to: "/profile" },
];

export const BottomNav = ({ active = "home" }: { active?: string }) => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<string>(active);
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 bg-gradient-overlay px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-3">
      <div className="flex items-end justify-around">
        {items.map(({ id, icon: Icon, label, primary, to }) => {
          const isActive = current === id;
          const handle = () => {
            setCurrent(id);
            if (to) {
              navigate(to);
            } else {
              toast(`${label} chegando em breve ✨`);
            }
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
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold">Music</span>
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
