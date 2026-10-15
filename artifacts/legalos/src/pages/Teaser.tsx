import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import LiveScoreTeaser from "@/components/LiveScoreTeaser";
import { MARKETING_HOME } from "@/lib/marketingSite";

const Teaser = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <a
            href={MARKETING_HOME}
            aria-label="Back to the Uvid website"
            className="eyebrow text-[10px] text-primary"
          >
            Uvid
          </a>
          <span className="eyebrow text-[10px] text-emerald-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Free teaser
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl text-foreground mb-3 leading-tight">Market Visibility Score — free teaser</h1>
        <p className="text-sm text-muted-foreground font-body mb-10">
          A quick, real look at two of the five categories in the full Market Visibility Score: your site's actual
          PageSpeed performance (Website Experience), plus your real Recognition standing (Chambers, Legal 500, IFLR1000, and Google
          Business Profile). No password, no account — just real data.
        </p>

        {/* Hand off to the sign-in FORM, not the gate's teaser hero — the
            visitor just finished a teaser run; landing on another "Get my
            free score" box reads as a loop. #signin opens the auth form
            directly (SignInGate's authOpen initializer honors the hash),
            and the prefill set by the CTA carries their domain forward. */}
        <LiveScoreTeaser variant="compact" onGetFullScore={() => navigate("/#signin")} />

        <div className="mt-10 text-center">
          {/* The previous "Explore the full guidebook" link went to the app
              root — a sign-in wall for exactly the unauthenticated visitors
              this page serves. The public index is the honest next step. */}
          <Link to="/visibility-index/serbia?live=1" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 font-body">
            See the live Serbia Visibility Index — no account needed
          </Link>
        </div>

        <p className="eyebrow mt-10 text-[10px] text-muted-foreground text-center">
          For Authorized Use Only
        </p>
      </main>
    </div>
  );
};

export default Teaser;
