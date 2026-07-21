import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Calendar, Download, Copy, Flame, Pause, Activity } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { recordRun } from "@/hooks/useWorkshopHistory";

interface Month {
  month: string;
  tempo: "push" | "steady" | "slow";
  theme: string;
  flagshipContent: string;
  supportingContent: string[];
  channelPushes: string[];
  keyMoments?: string[];
}
interface Result {
  annualTheme: string;
  pillars: string[];
  months: Month[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const tempoIcon = (t: string) => t === "push" ? <Flame className="w-3 h-3" /> : t === "slow" ? <Pause className="w-3 h-3" /> : <Activity className="w-3 h-3" />;
const tempoColor = (t: string) => t === "push" ? "text-primary" : t === "slow" ? "text-muted-foreground" : "text-foreground";

const MarketingCalendar = () => {
  const { context } = useFirmContext();
  const [practiceAreas, setPracticeAreas] = useState("");
  const [jurisdictions, setJurisdictions] = useState("");
  const [knownEvents, setKnownEvents] = useState("");
  const [slowSeasons, setSlowSeasons] = useState("");
  const [startMonth, setStartMonth] = useState(MONTHS[new Date().getMonth()]);
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!practiceAreas.trim() || loading) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch(fnUrl("workshop-calendar"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ practiceAreas, jurisdictions, knownEvents, slowSeasons, startMonth, firmContext: context }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      const r: Result = await resp.json();
      setResult(r);
      recordRun({
        toolId: "calendar",
        toolLabel: "12-Month Calendar",
        title: `Calendar · ${r.annualTheme.slice(0, 60)}`,
        preview: r.pillars.join(" · "),
        payload: r,
      });
    } catch (e) { console.error(e); toast.error("Couldn't generate calendar."); }
    finally { setLoading(false); }
  };

  const downloadCSV = () => {
    if (!result) return;
    const rows = [["Month", "Tempo", "Theme", "Flagship", "Supporting", "Channels", "Key Moments"]];
    result.months.forEach((m) => rows.push([
      m.month, m.tempo, m.theme, m.flagshipContent,
      m.supportingContent.join(" | "), m.channelPushes.join(" | "), (m.keyMoments || []).join(" | "),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "marketing-calendar.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={practiceAreas} onChange={(e) => setPracticeAreas(e.target.value)} placeholder="Practice areas (M&A, IP litigation, employment…)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
        <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary">
          {MONTHS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body">
        {advanced ? "− Hide" : "+ Add"} jurisdictions, known events, slow seasons
      </button>
      {advanced && (
        <div className="grid grid-cols-1 gap-3">
          <input value={jurisdictions} onChange={(e) => setJurisdictions(e.target.value)} placeholder="Jurisdictions (Delaware, NY, EU, UK…)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          <input value={knownEvents} onChange={(e) => setKnownEvents(e.target.value)} placeholder="Fixed events / launches (e.g. ABA Annual in August, our partner retreat in May)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          <input value={slowSeasons} onChange={(e) => setSlowSeasons(e.target.value)} placeholder="Slow seasons (e.g. mid-Dec to mid-Jan, August)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
        </div>
      )}
      <div className="flex justify-center">
        <button onClick={run} disabled={!practiceAreas.trim() || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Building…</> : <><Calendar className="w-4 h-4" /> Build 12-month calendar</>}
        </button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-2">Annual theme</div>
            <p className="font-display text-xl text-foreground italic mb-4">"{result.annualTheme}"</p>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-2">Pillars</div>
            <div className="flex flex-wrap gap-2">{result.pillars.map((p, i) => <span key={i} className="text-[11px] font-body px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary">{p}</span>)}</div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("Copied JSON"); }} className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1"><Copy className="w-3 h-3" /> JSON</button>
            <button onClick={downloadCSV} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.months.map((m, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display text-lg text-foreground">{m.month}</h4>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-body ${tempoColor(m.tempo)}`}>
                    {tempoIcon(m.tempo)} {m.tempo}
                  </span>
                </div>
                <p className="text-sm font-display italic text-primary mb-3">{m.theme}</p>
                <div className="mb-3">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-body mb-1">Flagship</div>
                  <p className="text-xs font-body text-foreground/90">{m.flagshipContent}</p>
                </div>
                <div className="mb-3">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-body mb-1">Supporting</div>
                  <ul className="space-y-1">{m.supportingContent.map((s, j) => <li key={j} className="text-[11px] font-body text-muted-foreground flex gap-2"><span className="text-primary">·</span>{s}</li>)}</ul>
                </div>
                <div className="mb-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-body mb-1">Channels</div>
                  <div className="flex flex-wrap gap-1">{m.channelPushes.map((c, j) => <span key={j} className="text-[10px] font-body px-2 py-0.5 rounded border border-border text-foreground/80">{c}</span>)}</div>
                </div>
                {m.keyMoments && m.keyMoments.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-body mb-1">Key moments</div>
                    <ul className="space-y-0.5">{m.keyMoments.map((k, j) => <li key={j} className="text-[11px] font-body text-foreground/70">→ {k}</li>)}</ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MarketingCalendar;