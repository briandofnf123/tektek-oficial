import { Compass, Home, Inbox, Plus, User } from "lucide-react";
import { useState } from "react";

const items = [
  { id: "home", icon: Home, label: "Início" },
  { id: "discover", icon: Compass, label: "Descobrir" },
  { id: "create", icon: Plus, label: "Criar", primary: true },
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "profile", icon: User, label: "Perfil" },
] as const;

export const BottomNav = () => {
  const [active, setActive] = useState<string>("home");
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 bg-gradient-overlay px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-3">
      <div className="flex items-end justify-around">
        {items.map(({ id, icon: Icon, label, primary }) => {
          const isActive = active === id;
          if (primary) {
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className="group relative -mt-2"
                aria-label={label}
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-brand opacity-70 blur-md transition group-hover:opacity-100" />
                <span className="relative flex h-10 w-14 items-center justify-center rounded-xl bg-foreground text-background shadow-action">
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </span>
              </button>
            );
          }
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
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
