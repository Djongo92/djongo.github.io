// Score-to-outcome tracking (see useClientWins.ts / client_wins migration):
// a one-click way to log "we got a new client" with a rough source, so the
// score trend chart isn't the only story this app tells — over time this
// becomes the honest version of "did the score actually produce clients."
import { useState } from "react";
import { PartyPopper, ChevronDown } from "lucide-react";
import { useClientWins, type WinSource } from "@/hooks/useClientWins";

interface Props {
  market: string;
  auditedDomain: string;
}

const SOURCES: { key: WinSource; label: string }[] = [
  { key: "organic_search", label: "Organic search" },
  { key: "directory", label: "Directory (Chambers/Legal 500)" },
  { key: "referral", label: "Referral" },
  { key: "social", label: "Social media" },
  { key: "other", label: "Other" },
];

const ClientWinLog = ({ market, auditedDomain }: Props) => {
  const { wins, logWin, enabled } = useClientWins(market, auditedDomain);
  const [picking, setPicking] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  if (!enabled) return null;

  const handlePick = async (source: WinSource) => {
    setPicking(false);
    const ok = await logWin(source);
    if (ok) {
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 2500);
    }
  };

  const attributable = wins.filter((w) => w.source === "organic_search" || w.source === "directory").length;
  const attributablePct = wins.length > 0 ? Math.round((attributable / wins.length) * 100) : 0;

  return (
    <div className="bg-card/40 border border-border/30 rounded-sm p-4">
      <h2 className="font-display text-base text-foreground mb-3">New Client Log</h2>

      {wins.length > 0 && (
        <p className="text-xs text-secondary-foreground/80 font-body mb-3">
          {wins.length} client{wins.length === 1 ? "" : "s"} logged · {attributablePct}% from organic search or directory listing
        </p>
      )}

      {justLogged ? (
        <p className="text-xs text-emerald-500 font-body inline-flex items-center gap-1.5">
          <PartyPopper className="w-3.5 h-3.5" /> Logged — thanks for the signal.
        </p>
      ) : picking ? (
        <div className="space-y-1.5">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              onClick={() => handlePick(s.key)}
              className="w-full text-left text-xs font-body px-2.5 py-1.5 rounded-sm border border-border/40 text-secondary-foreground/80 hover:border-primary/40 hover:text-foreground transition-colors"
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setPicking(false)}
            className="text-[10px] text-muted-foreground hover:text-foreground font-body mt-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-gold-light font-body"
        >
          Log a new client <ChevronDown className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default ClientWinLog;
