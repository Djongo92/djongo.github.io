// Offers to re-key an audit run anonymously (before this browser had a real
// account) onto the account that just signed in. Only relevant the first
// time someone with pre-existing anonymous data creates/logs into a real
// account — visibility-audit-claim does the actual re-keying server-side.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ShieldCheck, X } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const DISMISSED_KEY = "legalos_claim_banner_dismissed";

interface ClaimDataBannerProps {
  session: Session;
  onClaimed: () => void;
}

const ClaimDataBanner = ({ session, onClaimed }: ClaimDataBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const anonymousClientId = getOrCreateClientId();

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    if (anonymousClientId === session.user.id) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-get`, {
          method: "POST",
          headers: edgeHeaders("benchmark"),
          body: JSON.stringify({ clientId: anonymousClientId }),
        });
        const data = await resp.json();
        if (!cancelled && resp.ok && data.audits?.length > 0) setVisible(true);
      } catch {
        // Not worth surfacing — worst case the offer to claim doesn't appear.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const claim = async () => {
    setClaiming(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-claim`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ anonymousClientId, accessToken: session.access_token }),
      });
      if (resp.ok) {
        onClaimed();
        dismiss();
      }
    } finally {
      setClaiming(false);
    }
  };

  if (!visible) return null;

  // In-flow strip above the app shell — the previous fixed bottom overlay
  // covered Workshop tool output exactly where users read results. Rendered
  // as a sibling BEFORE <AppShell> in Index.tsx so it pushes content down
  // instead of floating over it.
  return (
    <div className="relative z-40 w-full bg-card border-b border-primary/30">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-sm text-foreground font-body">We found an audit run on this browser before you signed in.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={claim}
              disabled={claiming}
              className="text-xs font-body font-medium text-primary hover:text-gold-light disabled:opacity-40"
            >
              {claiming ? "Claiming…" : "Attach it to my account"}
            </button>
            <button onClick={dismiss} className="text-xs font-body text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ClaimDataBanner;
