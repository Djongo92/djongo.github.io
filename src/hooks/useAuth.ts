// Real Supabase Auth session (email + password), separate from demo mode's
// sample-data flag and from the anonymous per-browser client_id used before
// any real account existed. supabase-js already persists the session
// (localStorage, autoRefreshToken) — this hook just exposes it as state.
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setCurrentUser } from "@/lib/currentUser";

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes "you clicked sign out" from "your session quietly expired"
  // (a refresh-token failure surfaces as the same SIGNED_OUT event) — the
  // gate should say something different in each case.
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadSessionRef = useRef(false);
  const explicitSignOutRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      hadSessionRef.current = !!data.session;
      setCurrentUser(data.session?.user?.id ?? null, data.session?.access_token ?? null);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" && hadSessionRef.current && !explicitSignOutRef.current) {
        setSessionExpired(true);
      }
      if (newSession) setSessionExpired(false);
      hadSessionRef.current = !!newSession;
      explicitSignOutRef.current = false;
      setCurrentUser(newSession?.user?.id ?? null, newSession?.access_token ?? null);
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    explicitSignOutRef.current = true;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    return { error: error?.message ?? null };
  };

  const clearSessionExpired = () => setSessionExpired(false);

  return { session, user: session?.user ?? null, loading, sessionExpired, clearSessionExpired, signUp, signIn, signOut, resetPassword };
};
