// Score-to-outcome tracking (see client_wins migration): a one-click,
// self-reported log of "we got a new client, roughly from here" — not a
// CRM, just enough signal to show alongside the score trend the firm
// already has. Real accounts only; demo mode never reads or writes this.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { fnUrl } from "@/components/workshop/shared";

export type WinSource = "organic_search" | "directory" | "referral" | "social" | "other";

export interface ClientWin {
  id: string;
  market: string;
  audited_domain: string;
  source: WinSource;
  logged_at: string;
}

export const useClientWins = (market?: string, auditedDomain?: string) => {
  const { user, session } = useAuth();
  const [wins, setWins] = useState<ClientWin[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const resp = await fetch(fnUrl("client-wins-get"), {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token }),
      });
      const data = await resp.json();
      setWins(data.wins ?? []);
    } catch {
      // Best-effort — the widget just shows whatever it last had.
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logWin = useCallback(
    async (source: WinSource) => {
      if (!user || !market || !auditedDomain) return false;
      try {
        await fetch(fnUrl("client-win-log"), {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token, market, auditedDomain, source }),
        });
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [user, session?.access_token, market, auditedDomain, refresh],
  );

  return { wins, loading, logWin, enabled: !!user };
};
