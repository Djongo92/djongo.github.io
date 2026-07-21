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
  const { user } = useAuth();
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
        body: JSON.stringify({ clientId, ...input }),
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
  }, [user?.id]);

  const publish = useCallback(async (auditId: string, isPublic = true) => {
    setPublishing(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-publish`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ clientId, auditId, isPublic }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Couldn't publish");
      setResult((r) => (r ? { ...r, isPublic: data.is_public } : r));
      return true;
    } catch {
      setError("Couldn't publish the audit");
      return false;
    } finally {
      setPublishing(false);
    }
  }, [user?.id]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, publishing, result, error, run, publish, reset };
};
