import { Search } from "lucide-react";
import { useState } from "react";

const tabs = ["Seguindo", "Para Você", "Ao Vivo"] as const;

export const TopBar = () => {
  const [active, setActive] = useState<(typeof tabs)[number]>("Para Você");
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="bg-gradient-top-fade pointer-events-auto px-4 pb-6 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center justify-between">
          <button className="text-foreground/80 transition hover:text-foreground" aria-label="Live">
            <div className="h-6 w-6 rounded-full border-2 border-foreground/70" />
          </button>

          <nav className="flex items-center gap-5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActive(t)}
                className="relative font-display text-[15px] font-semibold tracking-tight transition"
              >
                <span
                  className={
                    active === t
                      ? "text-foreground"
                      : "text-foreground/55 hover:text-foreground/80"
                  }
                >
                  {t}
                </span>
                {active === t && (
                  <span className="absolute -bottom-1.5 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-gradient-brand" />
                )}
              </button>
            ))}
          </nav>

          {/* right side reserved for floating account chip */}
          <div className="w-6" />
        </div>
      </div>
    </header>
  );
};
