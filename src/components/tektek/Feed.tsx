import { feed } from "@/data/feed";
import { VideoCard } from "./VideoCard";

export const Feed = () => {
  return (
    <main className="snap-feed no-scrollbar h-[100dvh] overflow-y-auto">
      {feed.map((item, i) => (
        <VideoCard key={item.id} item={item} isFirst={i === 0} />
      ))}
    </main>
  );
};
