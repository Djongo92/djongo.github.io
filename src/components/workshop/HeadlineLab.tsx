import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trophy, Copy, Swords, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import HandoffButton from "./HandoffButton";
import { useHandoffReceive } from "@/lib/handoff";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { saveHeadlineWinner } from "@/hooks/useBattlePlanCache";
import { isDemoMode } from "@/lib/demoMode";

interface Headline { text: string; angle: string; score: number; why: string; }

const HeadlineLab = () => {
  const { context } = useFirmContext();
  const [brief, setBrief] = useState("");
  const [audience, setAudience] = useState("");
  const [mustInclude, setMustInclude] = useState("");
  const [avoid, setAvoid] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [bracket, setBracket] = useState<Headline[]>([]);
  const [round, setRound] = useState(0);
  const [judging, setJudging] = useState(false);

  useHandoffReceive("headlines", (p) => {
    if (p.kind === "text") setBrief(p.text);
  });

  const generate = async () => {
    if (brief.trim().length < 10 || loading) return;
    setLoading(true); setHeadlines([]); setBracket([]); setRound(0);
    try {
      const resp = await fetch(fnUrl("workshop-headlines"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ mode: "generate", brief, audience, mustInclude, avoid, firmContext: context }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      const data = await resp.json();
      const sorted = (data.headlines as Headline[]).slice().sort((a, b) => b.score - a.score);
      setHeadlines(sorted);
      recordRun({
        toolId: "headlines",
        toolLabel: "Headline Lab",
        title: `20 headlines · ${brief.slice(0, 60)}`,
        preview: sorted[0]?.text,
        output: sorted.map((h) => `[${h.angle} · ${h.score}/10] ${h.text}`).join("\n"),
        payload: sorted,
      });
    } catch (e) { console.error(e); toast.error("Couldn't generate headlines."); }
    finally { setLoading(false); }
  };

  const startBracket = () => {
    // top 8 → single-elim
    const top8 = headlines.slice(0, 8);
    setBracket(top8);
    setRound(1);
  };

  const pickWinner = async (winnerIdx: 0 | 1, askAi = false) => {
    if (askAi) {
      setJudging(true);
      try {
        const resp = await fetch(fnUrl("workshop-headlines"), {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ mode: "judge", brief, audience, contenders: [bracket[0].text, bracket[1].text] }),
        });
        const err = await handleHttpError(resp);
        if (err) { toast.error(err); setJudging(false); return; }
        const j = await resp.json();
        const aiWinner = j.winner === "A" ? 0 : 1;
        toast.message(`AI picks ${j.winner}`, { description: j.reason });
        winnerIdx = aiWinner as 0 | 1;
      } catch (e) { console.error(e); toast.error("Judge failed."); setJudging(false); return; }
      setJudging(false);
    }
    const winner = bracket[winnerIdx];
    const rest = bracket.slice(2);
    if (rest.length === 0) {
      // tournament winner
      setBracket([winner]);
      setRound((r) => r + 1);
      toast.success("Champion crowned 🏆");
    } else {
      setBracket([...rest, winner]);
    }
  };

  const champion = bracket.length === 1 ? bracket[0] : null;

  // When a champion is crowned, persist for the Battle Plan — skipped in
  // demo mode so a real tournament run doesn't overwrite the demo's seeded
  // Battle Plan sample (see RoastHomepage.tsx for why).
  useEffect(() => {
    if (champion && !isDemoMode()) {
      saveHeadlineWinner({
        text: champion.text,
        angle: champion.angle,
        why: champion.why,
        brief,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champion]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          placeholder="E.g. Hero headline for a boutique M&A firm targeting founders of $20-100M SaaS companies considering an exit."
          className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary resize-none"
        />
      </div>
      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body">
        {advanced ? "− Hide" : "+ Add"} audience, must-include, must-avoid
      </button>
      {advanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          <input value={mustInclude} onChange={(e) => setMustInclude(e.target.value)} placeholder="Must include word/idea" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          <input value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="Must avoid" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
        </div>
      )}
      <div className="flex justify-center">
        <button onClick={generate} disabled={brief.trim().length < 10 || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating 20…</> : <><Sparkles className="w-4 h-4" /> Generate 20 headlines</>}
        </button>
      </div>

      {headlines.length > 0 && bracket.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body">Ranked by predicted strength</h3>
            <button onClick={startBracket} className="text-xs bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-sm font-body hover:bg-primary/20 flex items-center gap-1">
              <Swords className="w-3 h-3" /> Run tournament (top 8)
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {headlines.map((h, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-sm p-4 flex items-start gap-4 hover:border-primary/30 transition-colors">
                <div className="flex-shrink-0 text-center">
                  <div className={`font-display text-2xl ${h.score >= 8 ? "text-primary" : h.score >= 6 ? "text-foreground" : "text-muted-foreground"}`}>{h.score}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-body">{h.angle}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base text-foreground mb-1">{h.text}</p>
                  <p className="text-[11px] text-muted-foreground font-body italic">{h.why}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(h.text); toast.success("Copied"); }} className="text-muted-foreground hover:text-primary flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {bracket.length >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body flex items-center justify-center gap-2"><Swords className="w-3 h-3" /> Round {round} · {bracket.length} contenders left</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  onClick={() => pickWinner(idx as 0 | 1)}
                  disabled={judging}
                  className="text-left bg-card border-2 border-border hover:border-primary p-6 rounded-sm transition-all hover:-translate-y-0.5"
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-2">{bracket[idx].angle} · Predicted {bracket[idx].score}/10</div>
                  <p className="font-display text-xl text-foreground">{bracket[idx].text}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <button disabled={judging} onClick={() => pickWinner(0, true)} className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1 disabled:opacity-40">
                {judging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Let AI judge this match
              </button>
            </div>
          </motion.div>
        )}

        {champion && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-primary/10 border-2 border-primary rounded-sm p-8 text-center">
            {isDemoMode() && (
              <p className="text-[11px] text-muted-foreground font-body italic mb-3">
                Demo mode — this champion won't be saved to your Battle Plan sample.
              </p>
            )}
            <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-2">Champion headline</div>
            <p className="font-display text-3xl text-foreground mb-3">{champion.text}</p>
            <p className="text-xs text-muted-foreground font-body italic mb-4">{champion.angle} · {champion.why}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { navigator.clipboard.writeText(champion.text); toast.success("Copied"); }} className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-sm font-body flex items-center gap-1"><Copy className="w-3 h-3" /> Copy champion</button>
              <HandoffButton payload={{ kind: "text", text: champion.text, source: "Headline Lab" }} exclude="headlines" size="md" label="Send champion to" />
              <button onClick={() => { setBracket([]); setRound(0); }} className="text-xs text-muted-foreground hover:text-foreground font-body">← Back to ranked list</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeadlineLab;