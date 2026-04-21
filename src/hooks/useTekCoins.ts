import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LedgerEntry = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  ref_video_id: string | null;
  ref_user_id: string | null;
  ref_withdrawal_id: string | null;
  created_at: string;
};

export const useTekCoins = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async (uid: string) => {
    const [{ data: bal }, { data: rows }] = await Promise.all([
      supabase.from("tekcoins_balance").select("balance").eq("user_id", uid).maybeSingle(),
      supabase
        .from("tekcoins_ledger")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setBalance(Number(bal?.balance ?? 0));
    setEntries((rows ?? []) as LedgerEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void reload(user.id);
    const channel = supabase
      .channel(`tekcoins-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tekcoins_ledger",
          filter: `user_id=eq.${user.id}`,
        },
        () => void reload(user.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { balance, entries, loading };
};
