// On-demand GBP refresh (#28): the "Refresh GBP data" button in Analytics →
// Reputation. Calls firm-signals-refresh's single-domain mode (the same edge
// function the weekly batch job uses), which re-fetches Google Places for
// the audit's domain and re-scores the audit in place — so a firm that just
// improved its profile sees the score move immediately instead of waiting
// up to a week. The server derives the domain from the audit row itself
// (audits store audited_domain as entered, sometimes a full URL), so the
// client only sends the audit id. Server rate-limits to one refresh per
// domain per 24h; the hook surfaces that 429 message verbatim.
// Same edge-function-calling shape as useMetricCorrection.
import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { isEdgeFunctionAvailable, recordEdgeFunctionStatus } from "@/lib/edgeFunctionAvailability";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FUNCTION_NAME = "firm-signals-refresh";

export interface GbpRefreshResult {
  ok: true;
  refreshed: boolean;
  auditUpdated: boolean;
  newTotalScore?: number;
  reputationScore?: number;
  unverifiable?: boolean;
}

export const useGbpRefresh = () => {
  const { user, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (auditId: string): Promise<GbpRefreshResult | null> => {
    if (!isEdgeFunctionAvailable(FUNCTION_NAME)) {
      setError("GBP refresh isn't available yet — the refresh service hasn't been switched on.");
      return null;
    }
    setRefreshing(true);
    setError(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({
          clientId: user?.id ?? getOrCreateClientId(),
          accessToken: session?.access_token,
          auditId,
        }),
      });
      recordEdgeFunctionStatus(FUNCTION_NAME, resp.status);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data.error || "Couldn't refresh GBP data");
        return null;
      }
      return data as GbpRefreshResult;
    } catch {
      setError("Couldn't reach the refresh service");
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, session?.access_token]);

  return { refresh, refreshing, error, available: isEdgeFunctionAvailable(FUNCTION_NAME) };
};
