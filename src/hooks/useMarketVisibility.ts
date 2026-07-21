import { useCallback, useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { useAuth } from "@/hooks/useAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface CategoryResult {
  score: number;
  provenance: "api" | "ai_classified" | "self_reported" | "missing";
}

export interface AuditResult {
  id: string;
  isPublic: boolean;
  totalScore: number;
  categories: {
    performance: CategoryResult;
    social: CategoryResult;
    seoAuthority: CategoryResult;
    thoughtLeadership: CategoryResult;
    reputation: CategoryResult;
  };
  rawMetrics: Record<string, unknown>;
  percentile: number | null;
  peerCount: number;
}

export interface SocialSelfReport {
  followers: number;
  posts30d: number;
  engagementRate?: number;
  platforms: { linkedin: boolean; instagram: boolean; twitter: boolean; facebook: boolean };
}

export interface RunAuditInput {
  auditedDomain: string;
  displayName?: string;
  market: string;
  peerGroup: string;
  gbpListed: boolean;
  social?: SocialSelfReport;
}

export const useMarketVisibility = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (input: RunAuditInput): Promise<AuditResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-run`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, ...input }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Couldn't run the audit");
        return null;
      }
      setResult(data);
      return data as AuditResult;
    } catch {
      setError("Couldn't reach the audit service");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token]);

  const publish = useCallback(async (auditId: string, isPublic = true): Promise<{ ok: boolean; code?: string }> => {
    setPublishing(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-publish`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, auditId, isPublic }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Couldn't publish");
        return { ok: false, code: data.code };
      }
      setResult((r) => (r ? { ...r, isPublic: data.is_public } : r));
      return { ok: true };
    } catch {
      setError("Couldn't publish the audit");
      return { ok: false };
    } finally {
      setPublishing(false);
    }
  }, [user?.id, session?.access_token]);

  const verifyDomain = useCallback(async (auditId: string, action: "start" | "check") => {
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-verify-domain`, {
      method: "POST",
      headers: edgeHeaders("benchmark"),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, auditId, action }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Verification failed");
    return data as { verified: boolean; recordType?: string; recordHost?: string; recordValue?: string };
  }, [user?.id, session?.access_token]);

  const scheduleRerun = useCallback(async (auditId: string, autoRerun: boolean, rerunFrequencyDays?: number) => {
    const clientId = user?.id ?? getOrCreateClientId();
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-schedule`, {
      method: "POST",
      headers: edgeHeaders("benchmark"),
      body: JSON.stringify({ clientId, accessToken: session?.access_token, auditId, autoRerun, rerunFrequencyDays }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Couldn't update the schedule");
    return data as { auto_rerun: boolean; rerun_frequency_days: number | null };
  }, [user?.id, session?.access_token]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, publishing, result, error, run, publish, verifyDomain, scheduleRerun, reset };
};
