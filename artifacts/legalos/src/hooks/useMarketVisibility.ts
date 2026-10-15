import { useCallback, useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { useAuth } from "@/hooks/useAuth";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function readEdgeResponse(resp: Response): Promise<Record<string, unknown>> {
  const text = await resp.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (!resp.ok) {
      return { error: `The audit service returned ${resp.status} ${resp.statusText || "without details"}. Please try again.` };
    }
    throw new Error("The audit service returned an unreadable response. Please try again.");
  }
}

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
  // §7 — optional peer-group refinement, self-reported like everything else
  // at intake (see peerDimensions.ts). Omitting these scores exactly as
  // before; they only narrow the live Social/Thought Leadership peer
  // comparison further when there's enough sample to do so meaningfully.
  firmSize?: string;
  officeCount?: string;
  serviceModel?: string;
  specialization?: string;
  marketTier?: string;
}

export type AuditRunOutcome =
  | { ok: true; audit: AuditResult }
  | { ok: false; error: string };

export const useMarketVisibility = () => {
  const { user, session } = useAuth();
  const { activeFirmId } = useActiveWorkspace();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (input: RunAuditInput): Promise<AuditRunOutcome> => {
    setLoading(true);
    setError(null);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-run`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, ...input }),
      });
      const data = await readEdgeResponse(resp);
      if (!resp.ok) {
        const message = typeof data.error === "string" ? data.error : "Couldn't run the audit";
        setError(message);
        return { ok: false, error: message };
      }
      if (!data.id || !data.categories) {
        const message = "The audit finished, but its result was incomplete. Please try again.";
        setError(message);
        return { ok: false, error: message };
      }
      const audit = data as unknown as AuditResult;
      setResult(audit);
      return { ok: true, audit };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      const error = message || "Couldn't reach the audit service. Check your connection and try again.";
      setError(error);
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token, activeFirmId]);

  const publish = useCallback(async (auditId: string, isPublic = true): Promise<{ ok: boolean; code?: string }> => {
    setPublishing(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-publish`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, auditId, isPublic }),
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
  }, [user?.id, session?.access_token, activeFirmId]);

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
      body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, auditId, autoRerun, rerunFrequencyDays }),
    });
    const data = await readEdgeResponse(resp);
    if (!resp.ok) {
      const message = typeof data.error === "string" ? data.error : "Couldn't update the schedule";
      throw new Error(message);
    }
    return data as { auto_rerun: boolean; rerun_frequency_days: number | null };
  }, [user?.id, session?.access_token, activeFirmId]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, publishing, result, error, run, publish, verifyDomain, scheduleRerun, reset };
};
