import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Globe, Clipboard, Target, Crosshair, Lightbulb } from "lucide-react";
import { LoadingTips } from "@/components/LoadingTips";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { SegmentedControl } from "../ui/segmented-control";
import { useHandoffReceive } from "@/lib/handoff";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { styleMemoryIdentity } from "@/lib/styleFeedback";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/visibilityCategories";

interface PeerRow {
  audited_domain: string;
  display_name: string | null;
  performance_score: number | null;
  social_score: number | null;
  seo_authority_score: number | null;
  thought_leadership_score: number | null;
  reputation_score: number | null;
}
const SCORE_COL = {
  performance: "performance_score", social: "social_score", seoAuthority: "seo_authority_score",
  thoughtLeadership: "thought_leadership_score", reputation: "reputation_score",
} as const;

interface Result {
  positioning: string;
  idealClient: string;
  proofTactics: string[];
  strongMoves: string[];
  weakSpots: string[];
  gaps: string[];
  differentiationAngles: { angle: string; proofWeWouldNeed: string }[];
  ifIWereThem: string;
  meta?: { source: string; url?: string };
}

const CompetitorTeardown = () => {
  const { context } = useFirmContext();
  const [input, setInput] = useState<"url" | "paste">("url");
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [ourAngle, setOurAngle] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  // Named peer from the public visibility list (anchors the teardown to real scores).
  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [peer, setPeer] = useState<PeerRow | null>(null);

  useEffect(() => {
    const market = (context?.market || "serbia").trim().toLowerCase();
    let cancelled = false;
    supabase
      .from("market_visibility_audits")
      .select("audited_domain, display_name, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score")
      .eq("market", market)
      .eq("is_public", true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPeers((data as PeerRow[]).sort((a, b) => (a.display_name || a.audited_domain).localeCompare(b.display_name || b.audited_domain)));
      });
    return () => { cancelled = true; };
  }, [context?.market]);

  const choosePeer = (domain: string) => {
    const row = peers.find((p) => p.audited_domain === domain) ?? null;
    setPeer(row);
    if (row) { setInput("url"); setUrl(`https://${row.audited_domain.replace(/^https?:\/\//, "")}`); }
  };
  const peerScores = peer
    ? Object.fromEntries(CATEGORY_ORDER.map((k) => {
        const raw = peer[SCORE_COL[k]];
        return [CATEGORY_META[k].label, raw == null ? null : Math.round((raw / CATEGORY_META[k].max) * 100)];
      }).filter(([, v]) => v !== null))
    : undefined;

  useHandoffReceive("teardown", (p) => {
    if (p.kind === "url") { setInput("url"); setUrl(p.url); }
    else if (p.kind === "text") { setInput("paste"); setPasted(p.text); }
  });

  const ready = input === "url" ? url.trim().length > 4 : pasted.trim().length > 50;

  const run = async () => {
    if (!ready || loading) return;
    setLoading(true); setResult(null);
    const identity = styleMemoryIdentity();
    try {
      const resp = await fetch(fnUrl("workshop-competitor-teardown"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          competitorUrl: input === "url" ? url : undefined,
          pastedContent: input === "paste" ? pasted : undefined,
          ourAngle, firmContext: context,
          peer: peer ? { name: peer.display_name || peer.audited_domain, scores: peerScores } : undefined,
          ...identity,
        }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      const r: Result = await resp.json();
      setResult(r);
      recordRun({
        toolId: "teardown",
        toolLabel: "Competitor Teardown",
        title: `Teardown · ${r.meta?.url || "pasted"}`,
        preview: r.positioning,
        output: `Positioning: ${r.positioning}\n\nGaps:\n${r.gaps.map((g) => `- ${g}`).join("\n")}\n\nIf I were them: ${r.ifIWereThem}`,
        payload: r,
      }, identity);
    } catch (e) { console.error(e); toast.error("Couldn't teardown."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <SegmentedControl ariaLabel="Competitor source" value={input} onChange={(v) => setInput(v as "url" | "paste")}
          options={[
            { label: "Competitor URL", value: "url", icon: <Globe className="w-3 h-3" /> },
            { label: "Paste content", value: "paste", icon: <Clipboard className="w-3 h-3" /> },
          ]} />
      </div>
      {input === "url" && peers.length > 0 && (
        <div className="space-y-1">
          <label className="eyebrow text-[10px] text-muted-foreground" htmlFor="teardown-peer">Or pick a firm from the visibility list</label>
          <select id="teardown-peer" value={peer?.audited_domain ?? ""} onChange={(e) => choosePeer(e.target.value)}
            className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary">
            <option value="">— none —</option>
            {peers.map((p) => <option key={p.audited_domain} value={p.audited_domain}>{p.display_name || p.audited_domain}</option>)}
          </select>
          {peer && <p className="text-[11px] text-muted-foreground font-body">The teardown will be anchored to {peer.display_name || peer.audited_domain}'s measured scores.</p>}
        </div>
      )}
      {input === "url" ? (
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://competitorfirm.com" className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary" />
      ) : (
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} placeholder="Paste their homepage / about / practice page content here." className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary resize-none" />
      )}
      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body">
        {advanced ? "− Hide" : "+ Add"} our current angle (sharpens differentiation)
      </button>
      {advanced && (
        <textarea value={ourAngle} onChange={(e) => setOurAngle(e.target.value)} rows={2} placeholder="How we currently position — or want to. E.g. 'The only IP boutique in the SE focused exclusively on biotech.'" className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none" />
      )}
      <div className="flex justify-center">
        <button onClick={run} disabled={!ready || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Tearing down…</> : <><Crosshair className="w-4 h-4" /> Teardown competitor</>}
        </button>
      </div>

      <LoadingTips active={loading} />

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <div className="eyebrow text-[10px] text-primary mb-2 flex items-center gap-2"><Target className="w-3 h-3" /> Their positioning</div>
            <p className="font-display text-xl text-foreground mb-3">"{result.positioning}"</p>
            <p className="text-xs text-muted-foreground font-body"><span className="text-foreground/80">Hunting:</span> {result.idealClient}</p>
            {result.meta?.url && <p className="text-[10px] text-muted-foreground font-body mt-2">{result.meta.url}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="eyebrow text-[10px] text-primary mb-3">Strong moves</div>
              <ul className="space-y-2">{result.strongMoves.map((s, i) => <li key={i} className="text-xs text-foreground/90 font-body flex items-start gap-2"><span className="text-primary mt-0.5">▸</span>{s}</li>)}</ul>
            </div>
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="eyebrow text-[10px] text-muted-foreground mb-3">Weak spots</div>
              <ul className="space-y-2">{result.weakSpots.map((s, i) => <li key={i} className="text-xs text-foreground/90 font-body flex items-start gap-2"><span className="text-destructive/70 mt-0.5">▸</span>{s}</li>)}</ul>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-sm p-5">
            <div className="eyebrow text-[10px] text-muted-foreground mb-3">Proof tactics they lean on</div>
            <ul className="space-y-2">{result.proofTactics.map((s, i) => <li key={i} className="text-xs text-foreground/90 font-body flex items-start gap-2"><span className="text-muted-foreground mt-0.5">▸</span>{s}</li>)}</ul>
          </div>

          <div className="bg-primary/5 border border-primary/30 rounded-sm p-5">
            <div className="eyebrow text-[10px] text-primary mb-3 flex items-center gap-2"><Lightbulb className="w-3 h-3" /> Gaps we can own</div>
            <ul className="space-y-2 mb-4">{result.gaps.map((s, i) => <li key={i} className="text-sm text-foreground font-body flex items-start gap-2"><span className="text-primary mt-0.5">▸</span>{s}</li>)}</ul>
          </div>

          <div>
            <div className="eyebrow text-[10px] text-muted-foreground mb-3">Differentiation angles</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.differentiationAngles.map((d, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-sm p-4">
                  <p className="font-display text-base text-foreground mb-2">{d.angle}</p>
                  <p className="text-[11px] text-muted-foreground font-body"><span className="text-foreground/80">Proof we'd need:</span> {d.proofWeWouldNeed}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border-l-2 border-primary pl-5 py-3">
            <div className="eyebrow text-[10px] text-primary mb-2">If I were them</div>
            <p className="text-sm font-display italic text-foreground/90">{result.ifIWereThem}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CompetitorTeardown;