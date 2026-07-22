import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import LiveScoreTeaser from "@/components/LiveScoreTeaser";

const Teaser = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">LegalOS</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Free teaser
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl text-foreground mb-3 leading-tight">Market Visibility Score — free teaser</h1>
        <p className="text-sm text-muted-foreground font-body mb-10">
          A quick, real look at two of the five categories in the full Market Visibility Score: your site's actual
          PageSpeed performance, plus your real Reputation standing (Chambers, Legal 500, IFLR1000, and Google
          Business Profile). No password, no account — just real data.
        </p>

        <LiveScoreTeaser variant="compact" />

        <div className="mt-10 text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 font-body">
            Explore the full guidebook
          </Link>
        </div>

        <p className="mt-10 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body text-center">
          For Authorized Use Only
        </p>
      </main>
    </div>
  );
};

export default Teaser;
