// §9 — Reports and exports: toggle the monthly scheduled snapshot and read
// back past snapshots. On-demand generation itself is entirely client-side
// (see executiveReportPdf/Pptx/Docx/Csv.ts) — this hook is only for the
// opt-in monthly cron path.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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
  const [enabled, setEnabled] = useState(false);
  const [reports, setReports] = useState<ExecutiveReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/executive-report-schedule`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "get" }),
      });
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
  }, [user?.id, session?.access_token]);

  useEffect(() => { reload(); }, [reload]);

  const setMonthlyEnabled = useCallback(async (next: boolean) => {
    setSaving(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/executive-report-schedule`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, action: "toggle", enabled: next }),
      });
      if (resp.ok) setEnabled(next);
    } finally {
      setSaving(false);
    }
  }, [user?.id, session?.access_token]);

  return { enabled, reports, loading, saving, setMonthlyEnabled, reload };
};
