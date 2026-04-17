import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Track = {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  genre: string | null;
  cover_url: string | null;
  use_count: number;
  is_official: boolean;
};

export const useTracks = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("tracks")
      .select("*")
      .order("use_count", { ascending: false })
      .then(({ data }) => {
        if (mounted) {
          setTracks((data as Track[]) ?? []);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { tracks, loading };
};

export const formatPlays = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
  return String(n);
};
