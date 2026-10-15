// Senior-PM idea: a light "what are we working on" layer — see the
// campaigns migration for why this is deliberately not a CRM/PM tool.
// Real accounts only; demo mode never reads or writes this.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { fnUrl } from "@/components/workshop/shared";

export type CampaignStatus = "planned" | "live" | "done";

export interface CampaignLinkedRun {
  runId: string;
  toolId: string;
  toolLabel: string;
  title: string;
  preview?: string;
}

export interface Campaign {
  id: string;
  market: string;
  audited_domain: string;
  name: string;
  status: CampaignStatus;
  started_at: string | null;
  ended_at: string | null;
  linked_runs: CampaignLinkedRun[];
  created_at: string;
  updated_at: string;
}

export interface CampaignSaveInput {
  id?: string;
  market?: string;
  auditedDomain?: string;
  name: string;
  status?: CampaignStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  linkedRuns?: CampaignLinkedRun[];
}

export const useCampaigns = () => {
  const { user, session } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const resp = await fetch(fnUrl("campaigns-get"), {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token }),
      });
      const data = await resp.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      // Best-effort — the card just shows whatever it last had.
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: CampaignSaveInput): Promise<Campaign | null> => {
      if (!user) return null;
      try {
        const resp = await fetch(fnUrl("campaigns-save"), {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token, ...input }),
        });
        const data = await resp.json();
        await refresh();
        return data.campaign ?? null;
      } catch {
        return null;
      }
    },
    [user, session?.access_token, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await fetch(fnUrl("campaigns-delete"), {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token, id }),
        });
        await refresh();
      } catch {
        // Best-effort.
      }
    },
    [user, session?.access_token, refresh],
  );

  return { campaigns, loading, save, remove, enabled: !!user };
};
