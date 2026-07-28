// §6 — Evidence and corrections: submits a dispute for one specific metric
// on an already-scored audit. Same edge-function-calling shape as
// useMarketVisibility.ts (clientId + accessToken, "benchmark" scope).
import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface CorrectionRow {
  id: string;
  audit_id: string;
  category: string;
  metric_path: string;
  previous_value: unknown;
  corrected_value: unknown;
  reason: string;
  corrected_by_label: string | null;
  previous_total_score: number;
  new_total_score: number;
  created_at: string;
}

export const useMetricCorrection = () => {
  const { user, session } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (
    auditId: string,
    category: string,
    metricPath: string,
    correctedValue: number | boolean,
    reason: string,
  ): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-dispute`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({
          clientId, accessToken: session?.access_token,
          auditId, category, metricPath, correctedValue, reason,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Couldn't submit the correction");
        return false;
      }
      return true;
    } catch {
      setError("Couldn't reach the correction service");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, session?.access_token]);

  return { submit, submitting, error };
};
