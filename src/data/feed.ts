export type FeedItem = {
  id: string;
  poster: string;
  author: { handle: string; name: string; avatar: string; verified?: boolean };
  caption: string;
  tags: string[];
  music: string;
  stats: { likes: number; comments: number; shares: number; saves: number };
};

// Plataforma nova: aguardando os primeiros vídeos dos criadores.
export const feed: FeedItem[] = [];

export const formatCount = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
  return String(n);
};
