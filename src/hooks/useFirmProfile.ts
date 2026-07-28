// §5 — Firm profile: configure once, inherit everywhere. Server-persisted
// (firm_profiles table, one row per firm), unlike useFirmContext's
// localStorage-only practiceArea/firmSize/primaryGoal — this is the richer
// profile every tool/audit should read from instead of asking again.
// Requires a real firm membership (useFirmTeam); an anonymous or firm-less
// user gets `profile: null` and every write is a no-op, so nothing here
// breaks the existing anonymous-usage path.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface CompetitorEntry { [key: string]: string | undefined; name: string; domain: string }
export interface OfficeEntry { [key: string]: string | undefined; city: string; country: string; address?: string }
export interface LawyerEntry { [key: string]: string | undefined; name: string; title: string; practiceArea?: string; email?: string }
export interface ApprovedContentEntry { title: string; summary: string; approvedBy: string; approvedAt: string }

export interface FirmProfile {
  firm_id: string;
  jurisdictions: string[];
  offices: OfficeEntry[];
  practice_areas: string[];
  tone_of_voice: string | null;
  preferred_terminology: { prefer?: string[]; avoid?: string[] };
  competitor_set: CompetitorEntry[];
  website: string | null;
  linkedin_url: string | null;
  directory_profiles: { chambers?: string; legal500?: string; iflr1000?: string };
  lawyer_roster: LawyerEntry[];
  brand_rules: string | null;
  client_restrictions: string | null;
  approved_content: ApprovedContentEntry[];
  /** §11 — white-label branding: shown in the app chrome instead of the
   *  personal-browser useFirmLogo when a workspace has one set. */
  logo_data_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type FirmProfilePatch = Partial<Omit<FirmProfile, "firm_id" | "updated_at" | "updated_by">>;

export const useFirmProfile = () => {
  const { user, session } = useAuth();
  const { activeFirmId } = useActiveWorkspace();
  const [profile, setProfile] = useState<FirmProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!user || !session?.access_token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/firm-profile`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ accessToken: session.access_token, action: "get", activeFirmId }),
      });
      const data = await resp.json();
      setProfile(resp.ok ? data.profile ?? null : null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token, activeFirmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (patch: FirmProfilePatch): Promise<{ ok: true } | { error: string }> => {
    if (!session?.access_token) return { error: "Sign in to save the firm profile" };
    setSaving(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/firm-profile`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ accessToken: session.access_token, action: "save", activeFirmId, ...patch }),
      });
      const data = await resp.json();
      if (!resp.ok) return { error: data.error || "Couldn't save the firm profile" };
      setProfile(data.profile);
      return { ok: true };
    } catch {
      return { error: "Couldn't reach the firm profile service" };
    } finally {
      setSaving(false);
    }
  }, [session?.access_token, activeFirmId]);

  return { profile, loading, saving, save, reload };
};
