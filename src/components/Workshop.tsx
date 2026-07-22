import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Hammer, Copy, Loader2, Filter, ArrowRight, Sparkles, Wand2 } from "lucide-react";
import {
  SwipeIcon, CopywriterIcon, RewriteIcon, AutopsyIcon, AuditIcon,
  HeadlinesIcon, TeardownIcon, PitchDeckIcon, BioIcon, CalendarIcon, DeckRoastIcon,
} from "./workshop/icons";
import ReactMarkdown from "react-markdown";
import { swipeFile, SwipeItem } from "@/data/swipeFile";
import { chapters } from "@/data/chapters";
import { useFirmContext } from "@/hooks/useFirmContext";
import { streamSSE } from "@/lib/streamSSE";
import { toast } from "sonner";
import CopyAutopsy from "./workshop/CopyAutopsy";
import PracticePageAudit from "./workshop/PracticePageAudit";
import HeadlineLab from "./workshop/HeadlineLab";
import CompetitorTeardown from "./workshop/CompetitorTeardown";
import PitchDeck from "./workshop/PitchDeck";
import BioRewriter from "./workshop/BioRewriter";
import MarketingCalendar from "./workshop/MarketingCalendar";
import DeckRoast from "./workshop/DeckRoast";
import ModalShell from "@/components/ui/modal-shell";
import MyWorkshopDrawer from "./workshop/MyWorkshopDrawer";
import HandoffButton from "./workshop/HandoffButton";
import { useHandoffReceive } from "@/lib/handoff";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { verifyPassword, hasValidAccess, edgeHeaders } from "@/lib/edgeAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Props {
  onBack: () => void;
  initialToolId?: string | null;
}

const Workshop = ({ onBack, initialToolId }: Props) => {
  const [authed, setAuthed] = useState(() => hasValidAccess("workshop"));
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  // initialToolId covers the deep-link-into-a-fresh-mount case reliably
  // (Workshop is now lazy-loaded, so a caller can no longer assume it's
  // already mounted and listening by the time it dispatches an event);
  // the event listener below still covers switching tools while Workshop
  // is already open and mounted.
  const [tool, setTool] = useState<string | null>(initialToolId ?? null);

  // Cross-tool handoff: another tool / drawer can request a tool switch
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ toolId: string }>;
      if (ce.detail?.toolId) setTool(ce.detail.toolId);
    };
    window.addEventListener("workshop:switch-tool", handler);
    return () => window.removeEventListener("workshop:switch-tool", handler);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await verifyPassword("workshop", pw).catch(() => false);
    setBusy(false);
    if (ok) {
      setAuthed(true);
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 600);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-16 bg-primary/40" />
            <Hammer className="w-5 h-5 text-primary" />
            <div className="h-px w-16 bg-primary/40" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-foreground mb-3">The Workshop</h1>
          <p className="font-display text-lg text-primary italic mb-2">Practitioner's Vault</p>
          <p className="text-sm text-muted-foreground font-body mb-8">
            A working room with the tools and templates I only share with practitioners.
          </p>
          <motion.form
            onSubmit={submit}
            animate={err ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
            className="space-y-3"
          >
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(false); }}
              placeholder="Workshop password"
              autoFocus
              className="w-full bg-secondary/80 border border-border text-foreground px-5 py-3.5 text-sm font-body tracking-wide focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-sm"
            />
            {err && <p className="text-destructive text-xs font-body">Incorrect password.</p>}
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-3.5 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm"
            >
              Enter Workshop
            </button>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-muted-foreground hover:text-primary font-body mt-3 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Dashboard
            </button>
          </motion.form>
        </motion.div>
      </div>
    );
  }

  const TOOLS: { id: string; title: string; tag: string; blurb: string; icon: React.ReactNode; render: () => JSX.Element }[] = [
    { id: "swipe", tag: "Library", title: "Swipe File", blurb: "Field-tested templates from real firms — heroes, bios, emails, ads.", icon: <SwipeIcon size={18} />, render: () => <SwipeFileLibrary /> },
    { id: "copywriter", tag: "Generate", title: "AI Copywriter", blurb: "Three on-brand variations for hero, email, LinkedIn, ad or bio copy.", icon: <CopywriterIcon size={18} />, render: () => <Copywriter /> },
    { id: "rewrite", tag: "Improve", title: "Rewrite Tool", blurb: "Paste copy; rewrite with the framework from any chapter.", icon: <RewriteIcon size={18} />, render: () => <Rewriter /> },
    { id: "autopsy", tag: "Diagnose", title: "Copy Autopsy", blurb: "6-axis scoring with weak-spot highlights and drop-in fixes.", icon: <AutopsyIcon size={18} />, render: () => <CopyAutopsy /> },
    { id: "audit", tag: "Diagnose", title: "Practice Page Audit", blurb: "Score any practice page against the Chapter 8 framework.", icon: <AuditIcon size={18} />, render: () => <PracticePageAudit /> },
    { id: "headlines", tag: "Test", title: "Headline Lab", blurb: "20 angles, then a head-to-head tournament judged by AI.", icon: <HeadlinesIcon size={18} />, render: () => <HeadlineLab /> },
    { id: "teardown", tag: "Strategy", title: "Competitor Teardown", blurb: "Strong moves, weak spots, gaps you can own — and how.", icon: <TeardownIcon size={18} />, render: () => <CompetitorTeardown /> },
    { id: "deck", tag: "Pitch", title: "Pitch Deck Drafter", blurb: "Pick your sections, draft a deck sized to fit — with a real .pptx download.", icon: <PitchDeckIcon size={18} />, render: () => <PitchDeck /> },
    { id: "deckroast", tag: "Diagnose", title: "Roast My Deck", blurb: "Upload an existing pitch deck — brutally honest, slide-by-slide critique.", icon: <DeckRoastIcon size={18} />, render: () => <DeckRoast /> },
    { id: "bio", tag: "Profile", title: "Bio Rewriter", blurb: "Rewrite an attorney bio with emphasis you control.", icon: <BioIcon size={18} />, render: () => <BioRewriter /> },
    { id: "calendar", tag: "Plan", title: "12-Month Calendar", blurb: "Themed content calendar with tempo, channels, and key moments.", icon: <CalendarIcon size={18} />, render: () => <MarketingCalendar /> },
  ];

  const active = TOOLS.find((t) => t.id === tool);

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {active ? (
            <button onClick={() => setTool(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-body">
              <ArrowLeft className="w-4 h-4" /> All tools
            </button>
          ) : (
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-body">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
          )}
          <div className="flex items-center gap-3">
            <MyWorkshopDrawer onOpenTool={(id) => setTool(id)} />
            <div className="hidden sm:flex items-center gap-2">
              <Hammer className="w-4 h-4 text-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body">Workshop</span>
            </div>
          </div>
        </div>
      </nav>

      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h1 className="font-display text-5xl font-semibold text-foreground mb-3">
            {active ? active.title : "The Workshop"}
          </h1>
          <p className="font-display text-xl text-primary italic mb-3">
            {active ? active.blurb : "Where the guidebook becomes practice"}
          </p>
          {!active && (
            <p className="text-sm text-muted-foreground font-body max-w-xl mx-auto">
              {TOOLS.length} tools built for practitioners. Pick one and ship.
            </p>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {!active ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TOOLS.map((t, i) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setTool(t.id)}
                  className="group text-left p-6 bg-card border border-border/50 rounded-sm hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-primary">
                      {t.icon}
                      <span className="text-[10px] uppercase tracking-[0.3em] font-body">{t.tag}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-display text-xl text-foreground mb-1.5">{t.title}</h3>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{t.blurb}</p>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div key={active.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {active.render()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SwipeFileLibrary = () => {
  const [filter, setFilter] = useState<string>("All");
  const categories = ["All", ...Array.from(new Set(swipeFile.map((s) => s.category)))];
  const items = filter === "All" ? swipeFile : swipeFile.filter((s) => s.category === filter);
  const [opened, setOpened] = useState<SwipeItem | null>(null);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-[11px] font-body px-3 py-1.5 rounded-full border transition-all ${
              filter === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setOpened(item)}
            className="text-left p-5 bg-card border border-border/50 rounded-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-primary font-body">{item.category}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-[10px] text-muted-foreground font-body">{item.practiceArea}</span>
            </div>
            <h3 className="font-display text-base text-foreground mb-2">{item.title}</h3>
            <p className="text-xs text-muted-foreground font-body line-clamp-2">{item.why}</p>
          </motion.button>
        ))}
      </div>

      <ModalShell open={!!opened} onClose={() => setOpened(null)} maxWidthClass="max-w-2xl">
        {opened && (
          <>
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-primary font-body">{opened.category} · {opened.practiceArea}</span>
                <h3 className="font-display text-xl text-foreground mt-1">{opened.title}</h3>
              </div>
              <button onClick={() => setOpened(null)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body">Why it works</span>
                <p className="text-sm text-foreground/90 font-body mt-2 leading-relaxed">{opened.why}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body">Steal this</span>
                  <button
                    onClick={() => copy(opened.copy)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-gold-light font-body"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <pre className="text-xs font-body whitespace-pre-wrap bg-muted/40 border border-border/50 rounded-sm p-4 text-foreground/90 leading-relaxed">{opened.copy}</pre>
              </div>
            </div>
          </>
        )}
      </ModalShell>
    </div>
  );
};

const FORMATS = ["Website hero (H1, sub, CTA)", "Email subject + opener", "LinkedIn post", "Google Ad (3 headlines + 2 descriptions)", "Bio paragraph", "Case study summary", "Newsletter intro"];
const TONES = ["Direct & confident", "Warm & human", "Provocative", "Analytical & precise", "Story-led"];

const Copywriter = () => {
  const { context } = useFirmContext();
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState(FORMATS[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  useHandoffReceive("copywriter", (p) => {
    if (p.kind === "text") setBrief(p.text);
  });

  const generate = async () => {
    if (!brief.trim() || loading) return;
    setLoading(true);
    setOutput("");
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/workshop-copywriter`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ brief, format, tone, firmContext: context }),
      });
      if (resp.status === 429) { toast.error("Rate limit reached."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok) throw new Error("Stream failed");
      await streamSSE(resp, (full) => setOutput(full));
      const finalOut = (typeof window !== "undefined" ? "" : ""); // placeholder; we record below using output state
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate copy.");
    } finally {
      setLoading(false);
    }
  };

  // Record once when streaming completes
  useEffect(() => {
    if (!loading && output && brief) {
      recordRun({
        toolId: "copywriter",
        toolLabel: "AI Copywriter",
        title: brief.slice(0, 80),
        preview: `${format} · ${tone}`,
        output,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary"
          >
            {FORMATS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary"
          >
            {TONES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Brief</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={6}
            placeholder="What do you need? E.g. 'Hero for a boutique commercial litigation firm in Dallas focused on bet-the-company disputes for tech companies'"
            className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none"
          />
        </div>
        <button
          onClick={generate}
          disabled={!brief.trim() || loading}
          className="w-full bg-primary text-primary-foreground py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing…</> : <><Sparkles className="w-4 h-4" /> Generate 3 variations</>}
        </button>
        {!context && (
          <p className="text-[11px] text-muted-foreground font-body italic">
            Tip: Set your firm context from the dashboard for sharper, personalized copy.
          </p>
        )}
      </div>

      <div className="lg:col-span-3">
        <div className="bg-card border border-border/50 rounded-sm p-6 min-h-[420px]">
          {!output && !loading && (
            <div className="text-center py-20 text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-3 text-primary/40" />
              <p className="text-sm font-body">Your copy variations will appear here.</p>
            </div>
          )}
          {loading && !output && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-body">
              <Loader2 className="w-4 h-4 animate-spin" /> Drafting variations…
            </div>
          )}
          {output && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground">
              <ReactMarkdown>{output}</ReactMarkdown>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-end gap-2">
                <HandoffButton payload={{ kind: "text", text: output, source: "Copywriter" }} exclude="copywriter" />
                <button
                  onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }}
                  className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workshop;

const Rewriter = () => {
  const { context } = useFirmContext();
  const [original, setOriginal] = useState("");
  const [chapterId, setChapterId] = useState(chapters[5]?.id ?? chapters[0].id);
  const [goal, setGoal] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const chapter = chapters.find((c) => c.id === chapterId) ?? chapters[0];

  useHandoffReceive("rewrite", (p) => {
    if (p.kind === "text") setOriginal(p.text);
  });

  useEffect(() => {
    if (!loading && output && original) {
      recordRun({
        toolId: "rewrite",
        toolLabel: "Rewrite Tool",
        title: `Rewritten with Ch. ${chapter.number}`,
        preview: original.slice(0, 120),
        output,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const run = async () => {
    if (original.trim().length < 10 || loading) return;
    setLoading(true);
    setOutput("");
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/workshop-rewrite`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({
          original,
          chapterTitle: `Chapter ${chapter.number}: ${chapter.title}`,
          chapterFramework: `${chapter.title} — ${chapter.subtitle}${chapter.hook ? `. Core idea: ${chapter.hook}.` : "."}`,
          goal,
          firmContext: context,
        }),
      });
      if (resp.status === 429) { toast.error("Rate limit reached."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok) throw new Error("Stream failed");
      await streamSSE(resp, (full) => setOutput(full));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't rewrite copy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Apply framework from</label>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary"
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>Chapter {c.number} — {c.title}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground font-body italic mt-2">{chapter.subtitle}</p>
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Specific goal (optional)</label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="E.g. drive consults for IP litigation"
            className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body">Before — your current copy</span>
            {original && (
              <button
                onClick={() => { setOriginal(""); setOutput(""); }}
                className="text-[10px] text-muted-foreground hover:text-primary font-body"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            rows={18}
            placeholder="Paste a section of your current website, bio, practice area page, email, or LinkedIn copy…"
            className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary resize-none min-h-[420px] leading-relaxed text-foreground/90"
          />
          <p className="text-[11px] text-muted-foreground font-body mt-2">{original.length} characters</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-body">After — rewritten with framework</span>
            {output && !loading && (
              <div className="flex items-center gap-2">
                <HandoffButton payload={{ kind: "text", text: output, source: "Rewrite" }} exclude="rewrite" />
                <button
                  onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }}
                  className="text-[10px] text-primary hover:text-gold-light font-body inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            )}
          </div>
          <div className="bg-card border border-border/50 rounded-sm p-4 min-h-[420px] max-h-[560px] overflow-y-auto">
            {!output && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-20">
                <Wand2 className="w-6 h-6 mx-auto mb-3 text-primary/40" />
                <p className="text-sm font-body">Your rewrite will appear here.</p>
                <p className="text-[11px] font-body mt-1 opacity-70">Side-by-side, ready to compare.</p>
              </div>
            )}
            {loading && !output && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-body">
                <Loader2 className="w-4 h-4 animate-spin" /> Applying {chapter.title}…
              </div>
            )}
            {output && (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={run}
          disabled={original.trim().length < 10 || loading}
          className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Rewriting…</>
          ) : (
            <>Rewrite with this framework <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
};