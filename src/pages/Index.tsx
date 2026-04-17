import { Feed } from "@/components/tektek/Feed";
import { TopBar } from "@/components/tektek/TopBar";
import { BottomNav } from "@/components/tektek/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AccountSwitcher } from "@/components/tektek/AccountSwitcher";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background shadow-[0_0_60px_hsl(var(--neon-cyan)/0.15)]">
      <h1 className="sr-only">TekTek — Feed de vídeos curtos</h1>
      <Feed />
      <TopBar />

      {/* Floating account chip / sign-in CTA */}
      <button
        onClick={() => (user ? setSwitcherOpen(true) : navigate("/auth"))}
        className="absolute right-3 top-[max(env(safe-area-inset-top),12px)] z-40 flex items-center gap-2 rounded-full bg-foreground/10 px-2 py-1 backdrop-blur-md transition hover:bg-foreground/20"
      >
        {!loading && user && profile ? (
          <>
            <img
              src={
                profile.avatar_url ??
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}`
              }
              alt={profile.username}
              className="h-7 w-7 rounded-full bg-card object-cover"
            />
            <span className="pr-1 text-xs font-semibold">@{profile.username}</span>
          </>
        ) : (
          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-foreground">
            Entrar
          </span>
        )}
      </button>

      <BottomNav active="home" />
      <AccountSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
};

export default Index;
