// Firm membership + invite management for a real signed-in account. Reads
// firms/firm_members directly via supabase-js (RLS already scopes both to
// "firms/memberships you belong to" for `authenticated`, see
// 20260722040000_firms_foundation.sql) — writes go through the firm-invite
// and visibility-audit-share-with-firm edge functions, same service-role-only
// posture as the rest of this app.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface FirmMember {
  user_id: string;
  role: "owner" | "member";
}

export interface FirmTeam {
  firmId: string;
  firmName: string;
  members: FirmMember[];
}

export const useFirmTeam = () => {
  const { user, session } = useAuth();
  const [team, setTeam] = useState<FirmTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setTeam(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: ownRows } = await supabase.from("firm_members").select("firm_id").eq("user_id", user.id);
    const firmId = ownRows?.[0]?.firm_id;
    if (!firmId) {
      setTeam(null);
      setLoading(false);
      return;
    }
    const [{ data: firm }, { data: members }] = await Promise.all([
      supabase.from("firms").select("id, name").eq("id", firmId).maybeSingle(),
      supabase.from("firm_members").select("user_id, role").eq("firm_id", firmId),
    ]);
    setTeam(firm ? { firmId: firm.id, firmName: firm.name, members: (members as FirmMember[]) ?? [] } : null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createInvite = useCallback(async (): Promise<{ token: string; expiresInDays: number } | { error: string }> => {
    setInviting(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/firm-invite`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ accessToken: session?.access_token, action: "create" }),
      });
      const data = await resp.json();
      if (!resp.ok) return { error: data.error || "Couldn't create an invite" };
      return data;
    } catch {
      return { error: "Couldn't reach the invite service" };
    } finally {
      setInviting(false);
    }
  }, [session?.access_token]);

  const shareAuditsWithFirm = useCallback(async (): Promise<{ shared: number; skipped: number } | { error: string }> => {
    setSharing(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-share-with-firm`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ accessToken: session?.access_token }),
      });
      const data = await resp.json();
      if (!resp.ok) return { error: data.error || "Couldn't share audits" };
      return data;
    } catch {
      return { error: "Couldn't reach the share service" };
    } finally {
      setSharing(false);
    }
  }, [session?.access_token]);

  return { team, loading, inviting, sharing, createInvite, shareAuditsWithFirm, reload };
};
