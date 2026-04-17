import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  verified: boolean;
};

/**
 * "Saved accounts" — stored locally as a quick-switch list.
 * NEVER stores passwords. Only metadata used to render avatars in the switcher.
 * Real session swap requires re-auth (we open the auth screen prefilled).
 */
const STORAGE_KEY = "tektek.saved_accounts";

export type SavedAccount = {
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

const loadSaved = (): SavedAccount[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
const persistSaved = (a: SavedAccount[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(a));

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  savedAccounts: SavedAccount[];
  signOut: () => Promise<void>;
  removeSavedAccount: (email: string) => void;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(loadSaved);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    return data as Profile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    // 1) Subscribe FIRST (sync only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Defer Supabase calls to avoid deadlocks
      if (s?.user) {
        setTimeout(async () => {
          const p = await fetchProfile(s.user.id);
          setProfile(p);
          if (p && s.user.email) {
            const acc: SavedAccount = {
              email: s.user.email,
              username: p.username,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            };
            setSavedAccounts((prev) => {
              const next = [acc, ...prev.filter((x) => x.email !== acc.email)].slice(0, 5);
              persistSaved(next);
              return next;
            });
          }
        }, 0);
      } else {
        setProfile(null);
      }
    });

    // 2) Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) setProfile(await fetchProfile(s.user.id));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const removeSavedAccount = useCallback((email: string) => {
    setSavedAccounts((prev) => {
      const next = prev.filter((x) => x.email !== email);
      persistSaved(next);
      return next;
    });
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        session,
        user,
        profile,
        loading,
        savedAccounts,
        signOut,
        removeSavedAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
