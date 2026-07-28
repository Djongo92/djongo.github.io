// §11 — Consultant layer: every firm this signed-in user belongs to, for
// the workspace switcher. Direct supabase-js query — firm_members/firms
// already have SELECT RLS scoped to "memberships you belong to" for
// `authenticated` (20260722040000_firms_foundation.sql), same pattern
// useFirmTeam.ts already uses for its own single-firm read.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FirmRole } from "@/lib/roles";

export interface ConsultantWorkspace {
  firmId: string;
  firmName: string;
  role: FirmRole;
  accessExpiresAt: string | null;
}

export const useConsultantWorkspaces = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<ConsultantWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("firm_members")
      .select("firm_id, role, access_expires_at, firms(name)")
      .eq("user_id", user.id);

    if (!error && data) {
      const now = Date.now();
      const rows = (data as unknown as { firm_id: string; role: FirmRole; access_expires_at: string | null; firms: { name: string } | null }[])
        .filter((r) => !r.access_expires_at || new Date(r.access_expires_at).getTime() > now)
        .map((r) => ({ firmId: r.firm_id, firmName: r.firms?.name ?? "Untitled firm", role: r.role, accessExpiresAt: r.access_expires_at }));
      setWorkspaces(rows);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { workspaces, loading, reload };
};
