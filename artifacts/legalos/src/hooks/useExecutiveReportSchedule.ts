// §9 — Reports and exports: toggle the monthly scheduled snapshot and read
// back past snapshots. On-demand generation itself is entirely client-side
// (see executiveReportPdf/Pptx/Docx/Csv.ts) — this hook is only for the
// opt-in monthly cron path.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { isEdgeFunctionAvailable, recordEdgeFunctionStatus } from "@/lib/edgeFunctionAvailability";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FUNCTION_NAME = "executive-report-schedule";

export interface ExecutiveReportSnapshot {
  id: string;
  market: string;
  audited_domain: string;
  display_name: string | null;
  total_score: number;
  percentile: number | null;
  categories: Record<string, number>;
  source: "manual" | "scheduled";
  generated_at: string;
}

export const useExecutiveReportSchedule = () => {
  const { user, session } = useAuth();
  const { activeFirmId } = useActiveWorkspace();
  const [enabled, setEnabled] = useState(false);
  const [reports, setReports] = useState<ExecutiveReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // False when the backing edge function isn't deployed — the hook makes no
  // network calls and the UI should present scheduling as unavailable
  // instead of a toggle that silently does nothing.
  const [available, setAvailable] = useState(() => isEdgeFunctionAvailable(FUNCTION_NAME));

  const reload = useCallback(async () => {
    if (!isEdgeFunctionAvailable(FUNCTION_NAME)) {
      setAvailable(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "get", activeFirmId }),
      });
      recordEdgeFunctionStatus(FUNCTION_NAME, resp.status);
      if (resp.status === 404) {
        setAvailable(false);
        return;
      }
      const data = await resp.json();
      if (resp.ok) {
        setEnabled(data.schedule?.enabled ?? false);
        setReports(data.reports ?? []);
      }
    } catch {
      // Non-fatal — the toggle just shows its default state.
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token, activeFirmId]);

  useEffect(() => { reload(); }, [reload]);

  const setMonthlyEnabled = useCallback(async (next: boolean): Promise<{ ok: true } | { error: string }> => {
    if (!isEdgeFunctionAvailable(FUNCTION_NAME)) {
      setAvailable(false);
      return { error: "Monthly snapshots aren't available on this deployment yet." };
    }
    setSaving(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "toggle", enabled: next, activeFirmId }),
      });
      recordEdgeFunctionStatus(FUNCTION_NAME, resp.status);
      if (resp.status === 404) {
        setAvailable(false);
        return { error: "Monthly snapshots aren't available on this deployment yet." };
      }
      if (resp.ok) {
        setEnabled(next);
        return { ok: true };
      }
      return { error: "Couldn't update the monthly snapshot setting" };
    } catch {
      return { error: "Couldn't reach the report scheduling service" };
    } finally {
      setSaving(false);
    }
  }, [user?.id, session?.access_token, activeFirmId]);

  return { enabled, reports, loading, saving, available, setMonthlyEnabled, reload };
};
