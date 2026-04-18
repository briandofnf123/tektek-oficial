import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/contexts/AuthContext";

export type VideoRow = {
  id: string;
  user_id: string;
  storage_path: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string;
  tags: string[];
  track_id: string | null;
  duration_seconds: number;
  width: number | null;
  height: number | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  share_count: number;
  view_count: number;
  created_at: string;
};

export type VideoWithAuthor = VideoRow & { author: Profile | null };

export const useVideoFeed = () => {
  const [videos, setVideos] = useState<VideoWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: rows } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!mounted) return;
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      const { data: authors } = ids.length
        ? await supabase.from("profiles").select("*").in("user_id", ids)
        : { data: [] as Profile[] };
      const map = new Map((authors ?? []).map((a) => [a.user_id, a as Profile]));
      setVideos(
        ((rows ?? []) as VideoRow[]).map((r) => ({
          ...r,
          author: map.get(r.user_id) ?? null,
        })),
      );
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("videos-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "videos" },
        () => load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { videos, loading };
};

export const useUserVideos = (userId: string | undefined) => {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!mounted) return;
        setVideos((data ?? []) as VideoRow[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  return { videos, loading };
};
