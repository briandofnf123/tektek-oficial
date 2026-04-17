import { Feed } from "@/components/tektek/Feed";
import { TopBar } from "@/components/tektek/TopBar";
import { BottomNav } from "@/components/tektek/BottomNav";

const Index = () => {
  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-background shadow-[0_0_60px_hsl(var(--neon-cyan)/0.15)]">
      <h1 className="sr-only">TekTek — Feed de vídeos curtos</h1>
      <Feed />
      <TopBar />
      <BottomNav />
    </div>
  );
};

export default Index;
