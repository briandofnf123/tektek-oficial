import v1 from "@/assets/video-1.jpg";
import v2 from "@/assets/video-2.jpg";
import v3 from "@/assets/video-3.jpg";
import v4 from "@/assets/video-4.jpg";
import v5 from "@/assets/video-5.jpg";

export type FeedItem = {
  id: string;
  poster: string;
  author: { handle: string; name: string; avatar: string; verified?: boolean };
  caption: string;
  tags: string[];
  music: string;
  stats: { likes: number; comments: number; shares: number; saves: number };
};

const av = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=00d9ff,ff2a8a,a855f7`;

export const feed: FeedItem[] = [
  {
    id: "1",
    poster: v1,
    author: { handle: "yumi.exe", name: "Yumi Tanaka", avatar: av("yumi"), verified: true },
    caption: "tokyo nights hit different 🌃 quem mais ama essa vibe?",
    tags: ["#tokyo", "#dance", "#neon"],
    music: "NEON BLOOD — Crystal Castles (remix)",
    stats: { likes: 284_300, comments: 4_120, shares: 9_800, saves: 22_400 },
  },
  {
    id: "2",
    poster: v2,
    author: { handle: "rooftop_kai", name: "Kai Mendes", avatar: av("kai") },
    caption: "first try kickflip no por do sol 🛹🔥 quase quebrei tudo",
    tags: ["#skate", "#sunset", "#firsttry"],
    music: "Gravity — LANY",
    stats: { likes: 152_900, comments: 2_840, shares: 5_200, saves: 11_300 },
  },
  {
    id: "3",
    poster: v3,
    author: { handle: "chefluna", name: "Chef Luna", avatar: av("luna"), verified: true },
    caption: "fondant de chocolate 70% que derrete na boca 🍫 receita nos comentarios",
    tags: ["#receita", "#chocolate", "#asmr"],
    music: "Original sound — chefluna",
    stats: { likes: 891_200, comments: 12_400, shares: 45_900, saves: 198_000 },
  },
  {
    id: "4",
    poster: v4,
    author: { handle: "neo.gamer", name: "Neo", avatar: av("neo") },
    caption: "novo setup RGB ta absurdo 💜 tour completo no perfil",
    tags: ["#setup", "#gaming", "#cyberpunk"],
    music: "Synthwave Mix — Vol. 7",
    stats: { likes: 67_800, comments: 1_920, shares: 3_400, saves: 8_900 },
  },
  {
    id: "5",
    poster: v5,
    author: { handle: "wave.rider", name: "Marina Costa", avatar: av("marina"), verified: true },
    caption: "barrel da minha vida 🌊 nazaré tem alma",
    tags: ["#surf", "#nazare", "#bigwave"],
    music: "Ocean Eyes — Billie Eilish",
    stats: { likes: 423_100, comments: 6_780, shares: 18_200, saves: 54_300 },
  },
];

export const formatCount = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
  return String(n);
};
