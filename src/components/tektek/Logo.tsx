export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-1.5 font-display font-bold ${className}`}>
    <span className="relative">
      <span className="absolute inset-0 text-neon-cyan blur-[2px] translate-x-[-2px]">TekTek</span>
      <span className="absolute inset-0 text-neon-magenta blur-[2px] translate-x-[2px]">TekTek</span>
      <span className="relative text-foreground">TekTek</span>
    </span>
  </div>
);
