// §11 — Consultant layer: save a named before/after snapshot of an audit.
// The list itself comes bundled in visibility-audit-get's response (see
// Index.tsx's visibilityData.snapshots) rather than a second fetch here.
import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface AuditSnapshot {
  id: string;
  audit_id: string | null;
  label: string;
  market: string;
  audited_domain: string;
  display_name: string | null;
  total_score: number;
  categories: Record<string, number>;
  created_at: string;
}

export const useAuditSnapshots = () => {
  const { user, session } = useAuth();
  const { activeFirmId } = useActiveWorkspace();
  const [saving, setSaving] = useState(false);

  const saveSnapshot = useCallback(async (auditId: string, label: string): Promise<{ ok: true } | { error: string }> => {
    setSaving(true);
    try {
      const clientId = user?.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/audit-snapshot-save`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session?.access_token, activeFirmId, auditId, label }),
      });
      const data = await resp.json();
      if (!resp.ok) return { error: data.error || "Couldn't save the snapshot" };
      return { ok: true };
    } catch {
      return { error: "Couldn't reach the snapshot service" };
    } finally {
      setSaving(false);
    }
  }, [user?.id, session?.access_token, activeFirmId]);

  return { saveSnapshot, saving };
};
