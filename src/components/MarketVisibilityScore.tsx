import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, Loader2, TrendingUp, Share2, CheckCircle2, Globe } from "lucide-react";
import { toast } from "sonner";
import { useMarketVisibility, type AuditResult } from "@/hooks/useMarketVisibility";
import { saveVisibilityScore } from "@/hooks/useBattlePlanCache";
import { DMV_MARKETS, PEER_GROUPS } from "@/lib/marketVisibilityConfig";
import { isDemoMode } from "@/lib/demoMode";
import { DEMO_AUDIT, DEMO_VISIBILITY_SCORE, DEMO_DOMAIN, DEMO_DISPLAY_NAME } from "@/data/demoData";

// Demo mode never touches the real audit backend — running a live PageSpeed/
// directory/thought-leadership audit against whatever the visitor happens to
// type would (a) burn real API quota on garbage input and (b) can silently
// fuzzy-match a REAL firm from the seed data (e.g. a real Serbia firm), which
// then overwrites the demo's Battle Plan cache with an unrelated, real,
// low-scoring result — exactly the "wrong firm / score mismatch" bug this
// guards against. So in demo mode the intake is locked to the sample firm
// and "running" the audit just replays DEMO_AUDIT locally, no network call.
const buildDemoAuditResult = (): AuditResult => ({
  id: DEMO_AUDIT.id,
  isPublic: false,
  totalScore: DEMO_AUDIT.total_score,
  categories: DEMO_VISIBILITY_SCORE.categories as AuditResult["categories"],
  rawMetrics: (DEMO_AUDIT.raw_metrics ?? {}) as Record<string, unknown>,
  percentile: DEMO_VISIBILITY_SCORE.percentile,
  peerCount: DEMO_VISIBILITY_SCORE.peerCount,
});

const CATEGORY_LABELS: Record<string, { label: string; max: number }> = {
  performance: { label: "Performance", max: 20 },
  social: { label: "Social Media", max: 20 },
  seoAuthority: { label: "SEO & Authority", max: 60 },
  thoughtLeadership: { label: "Thought Leadership", max: 45 },
  reputation: { label: "Reputation", max: 55 },
};

const PROVENANCE_LABEL: Record<string, string> = {
  api: "Verified",
  ai_classified: "AI-classified",
  self_reported: "Self-reported",
  missing: "Pending setup",
};

const MarketVisibilityScore = () => {
  const demoMode = isDemoMode();
  const [open, setOpen] = useState(false);
  const [auditedDomain, setAuditedDomain] = useState(demoMode ? DEMO_DOMAIN : "");
  const [displayName, setDisplayName] = useState(demoMode ? DEMO_DISPLAY_NAME : "");
  const [market, setMarket] = useState(demoMode ? DEMO_VISIBILITY_SCORE.market : "serbia");
  const [peerGroup, setPeerGroup] = useState(demoMode ? DEMO_VISIBILITY_SCORE.peerGroup : "regional");
  const [gbpListed, setGbpListed] = useState(demoMode);
  const [followers, setFollowers] = useState("");
  const [posts30d, setPosts30d] = useState("");
  const [engagementRate, setEngagementRate] = useState("");
  const [platforms, setPlatforms] = useState({ linkedin: false, instagram: false, twitter: false, facebook: false });
  const { loading, publishing, result: liveResult, error, run, publish, verifyDomain, scheduleRerun, reset } = useMarketVisibility();
  const [demoResult, setDemoResult] = useState<AuditResult | null>(null);
  const result = demoMode ? demoResult : liveResult;
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [verifyRecord, setVerifyRecord] = useState<{ recordHost: string; recordValue: string } | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [autoRerun, setAutoRerun] = useState(false);
  const [rerunFrequencyDays, setRerunFrequencyDays] = useState(30);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditedDomain.trim() || loading) return;

    if (demoMode) {
      // No network call, no real fuzzy-match against real seed data — just
      // replay the sample firm's audit so the Dashboard and Battle Plan PDF
      // always agree on the same number while in demo mode.
      setDemoResult(buildDemoAuditResult());
      toast.info(`Demo mode — showing the sample audit for ${DEMO_DISPLAY_NAME}.`);
      return;
    }

    const hasSocialInput = followers.trim() !== "" || posts30d.trim() !== "" || Object.values(platforms).some(Boolean);
    const audit = await run({
      auditedDomain: auditedDomain.trim(),
      displayName: displayName.trim() || undefined,
      market,
      peerGroup,
      gbpListed,
      social: hasSocialInput
        ? {
          followers: Number(followers) || 0,
          posts30d: Number(posts30d) || 0,
          engagementRate: engagementRate.trim() !== "" ? Number(engagementRate) : undefined,
          platforms,
        }
        : undefined,
    });
    if (!audit) {
      toast.error(error || "Couldn't run the audit");
      return;
    }
    saveVisibilityScore({
      auditedDomain: auditedDomain.trim(),
      displayName: displayName.trim() || undefined,
      market,
      peerGroup,
      totalScore: audit.totalScore,
      categories: audit.categories,
      percentile: audit.percentile,
      peerCount: audit.peerCount,
      rawMetrics: audit.rawMetrics,
    });
  };

  const handlePublish = async () => {
    if (!result) return;
    setConfirmingPublish(false);
    if (demoMode) {
      toast.info("Publishing isn't available in demo mode — this is what it'll look like with your real firm.");
      return;
    }
    const { ok, code } = await publish(result.id, true);
    if (ok) {
      toast.success("Published to the Visibility Index");
      return;
    }
    if (code === "unverified") {
      // Not an error — kick off the verification flow instead of a toast.
      try {
        const data = await verifyDomain(result.id, "start");
        if (data.recordHost && data.recordValue) setVerifyRecord({ recordHost: data.recordHost, recordValue: data.recordValue });
      } catch {
        toast.error("Couldn't start domain verification");
      }
      return;
    }
    toast.error("Couldn't publish");
  };

  const handleCheckVerification = async () => {
    if (!result || demoMode) return;
    setCheckingVerification(true);
    setVerifyError(null);
    try {
      const data = await verifyDomain(result.id, "check");
      if (data.verified) {
        setVerifyRecord(null);
        toast.success("Domain verified — publishing…");
        const { ok } = await publish(result.id, true);
        if (ok) toast.success("Published to the Visibility Index");
        else toast.error("Couldn't publish");
      } else {
        setVerifyError("That TXT record isn't showing up yet — DNS changes can take a few minutes to propagate.");
      }
    } catch {
      setVerifyError("Couldn't check verification right now.");
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleUnpublish = async () => {
    if (!result) return;
    setConfirmingUnpublish(false);
    if (demoMode) return;
    const { ok } = await publish(result.id, false);
    if (ok) toast.success("Removed from the Visibility Index");
    else toast.error("Couldn't unpublish");
  };

  const handleToggleAutoRerun = async (next: boolean) => {
    if (!result) return;
    if (demoMode) {
      toast.info("Re-run scheduling isn't available in demo mode.");
      return;
    }
    setSavingSchedule(true);
    try {
      await scheduleRerun(result.id, next, next ? rerunFrequencyDays : undefined);
      setAutoRerun(next);
      toast.success(next ? `Will re-run automatically every ${rerunFrequencyDays} days` : "Automatic re-run turned off");
    } catch {
      toast.error("Couldn't update the re-run schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const startOver = () => {
    reset();
    setDemoResult(null);
    setAuditedDomain(demoMode ? DEMO_DOMAIN : "");
    setDisplayName(demoMode ? DEMO_DISPLAY_NAME : "");
    setConfirmingPublish(false);
    setConfirmingUnpublish(false);
    setStep(1);
    setVerifyRecord(null);
    setVerifyError(null);
    setAutoRerun(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-sm text-left hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-600 text-white text-[9px] tracking-[0.2em] uppercase font-body">
          Verified
        </div>
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-emerald-500/15 text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Market Visibility Score</h3>
            <p className="text-xs text-muted-foreground font-body">
              Externally-sourced, peer-group-normalized — PageSpeed, directory rankings, thought leadership. Not an AI opinion.
            </p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl max-h-[90vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-display text-lg text-foreground">Market Visibility Score</h3>
                </div>
                <button onClick={() => !loading && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!result && (
                  <form onSubmit={submit} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex items-center gap-2 flex-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-body shrink-0 ${
                              n <= step ? "bg-emerald-600 text-white" : "border border-border text-muted-foreground"
                            }`}
                          >
                            {n}
                          </div>
                          {n < 3 && <div className={`h-px flex-1 ${n < step ? "bg-emerald-600" : "bg-border"}`} />}
                        </div>
                      ))}
                    </div>

                    {step === 1 && (
                      <>
                        <p className="text-sm text-muted-foreground font-body">
                          Runs a real, externally-sourced audit — PageSpeed, legal-directory presence, thought-leadership cadence — and
                          benchmarks it against your peer group. Persisted centrally, so it gets more meaningful as more firms run it.
                        </p>

                        {demoMode && (
                          <p className="text-xs text-emerald-600 font-body bg-emerald-500/10 border border-emerald-500/30 rounded-sm px-3 py-2">
                            Demo mode — the domain and firm name below are locked to the sample firm so this always matches the rest
                            of the demo. Exit demo mode to audit a real firm.
                          </p>
                        )}

                        <div>
                          <label className="block text-xs text-muted-foreground font-body mb-1.5">Firm domain</label>
                          <input
                            type="text"
                            value={auditedDomain}
                            onChange={(e) => setAuditedDomain(e.target.value)}
                            placeholder="yourlawfirm.com"
                            autoFocus
                            disabled={demoMode}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50 disabled:opacity-60"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-muted-foreground font-body mb-1.5">Firm name (optional)</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your Firm LLP"
                            disabled={demoMode}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50 disabled:opacity-60"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          disabled={!auditedDomain.trim()}
                          className="w-full bg-emerald-600 text-white py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-emerald-500 transition-colors"
                        >
                          Next
                        </button>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-muted-foreground font-body mb-1.5">Market</label>
                            <select
                              value={market}
                              onChange={(e) => setMarket(e.target.value)}
                              disabled={demoMode}
                              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50 disabled:opacity-60"
                            >
                              {Object.keys(DMV_MARKETS).map((m) => (
                                <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground font-body mb-1.5">Peer group</label>
                            <select
                              value={peerGroup}
                              onChange={(e) => setPeerGroup(e.target.value)}
                              disabled={demoMode}
                              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50 disabled:opacity-60"
                            >
                              {PEER_GROUPS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm font-body text-secondary-foreground/80 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gbpListed}
                            onChange={(e) => setGbpListed(e.target.checked)}
                            disabled={demoMode}
                            className="accent-emerald-600"
                          />
                          We have a claimed, active Google Business Profile
                        </label>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-4 py-3 rounded-sm font-body text-sm border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="flex-1 bg-emerald-600 text-white py-3 rounded-sm font-body text-sm hover:bg-emerald-500 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <div>
                          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body mb-3">
                            Social presence (optional, self-reported — no clean LinkedIn API exists)
                          </p>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-muted-foreground font-body mb-1.5">LinkedIn followers</label>
                              <input
                                type="number"
                                min={0}
                                value={followers}
                                onChange={(e) => setFollowers(e.target.value)}
                                placeholder="0"
                                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
                                disabled={loading}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground font-body mb-1.5">Posts in last 30 days</label>
                              <input
                                type="number"
                                min={0}
                                value={posts30d}
                                onChange={(e) => setPosts30d(e.target.value)}
                                placeholder="0"
                                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
                                disabled={loading}
                              />
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs text-muted-foreground font-body mb-1.5">
                              Engagement rate % (optional — only if you have your own LinkedIn analytics)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={engagementRate}
                              onChange={(e) => setEngagementRate(e.target.value)}
                              placeholder="e.g. 3.5"
                              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
                              disabled={loading}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(["linkedin", "instagram", "twitter", "facebook"] as const).map((p) => (
                              <label key={p} className="flex items-center gap-2 text-xs font-body text-secondary-foreground/80 cursor-pointer capitalize">
                                <input
                                  type="checkbox"
                                  checked={platforms[p]}
                                  onChange={(e) => setPlatforms((prev) => ({ ...prev, [p]: e.target.checked }))}
                                  disabled={loading}
                                  className="accent-emerald-600"
                                />
                                {p === "twitter" ? "X / Twitter" : p}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            disabled={loading}
                            className="px-4 py-3 rounded-sm font-body text-sm border border-border/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={!auditedDomain.trim() || loading}
                            className="flex-1 bg-emerald-600 text-white py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                          >
                            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Running audit…</>) : "Run Market Visibility Score"}
                          </button>
                        </div>
                        {loading && (
                          <p className="text-xs text-muted-foreground font-body italic text-center">
                            Fetching PageSpeed data, matching directory rankings, scanning for thought leadership… (15-30s)
                          </p>
                        )}
                      </>
                    )}
                  </form>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-center mb-6 pb-6 border-b border-border/50">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-500/30 mb-3 relative">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle cx="48" cy="48" r="44" fill="none" stroke="rgb(16 185 129)" strokeWidth="4"
                            strokeDasharray={`${(result.totalScore / 200) * 276.4} 276.4`} strokeLinecap="round" />
                        </svg>
                        <span className="font-display text-2xl font-semibold text-foreground">{Math.round(result.totalScore)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-body mb-1">Score / 200 · {auditedDomain}</p>
                      {result.percentile !== null ? (
                        <p className="font-display text-base text-foreground italic flex items-center justify-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          Better than {result.percentile}% of {result.peerCount} other {PEER_GROUPS.find((p) => p.value === peerGroup)?.label.toLowerCase()} firms in {market}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground font-body italic">
                          Not enough public audits in this peer group yet to rank against — publish yours to help build it.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 mb-6">
                      {Object.entries(result.categories).map(([key, cat]) => {
                        const meta = CATEGORY_LABELS[key];
                        const pct = meta ? Math.min(100, (cat.score / meta.max) * 100) : 0;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-body text-foreground">{meta?.label ?? key}</span>
                              <span className="text-[10px] font-body text-muted-foreground">
                                {Math.round(cat.score * 10) / 10} / {meta?.max ?? "—"} · {PROVENANCE_LABEL[cat.provenance] ?? cat.provenance}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${cat.provenance === "missing" ? "bg-muted-foreground/30" : "bg-emerald-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {verifyRecord ? (
                      <div className="border border-primary/30 bg-primary/5 rounded-sm p-3 space-y-2">
                        <p className="text-xs text-foreground font-body flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-primary shrink-0" /> Verify you control {auditedDomain} before publishing
                        </p>
                        <p className="text-[11px] text-muted-foreground font-body">
                          Add a TXT record on <span className="font-mono text-foreground">{verifyRecord.recordHost}</span> with this value:
                        </p>
                        <code className="block text-[11px] font-mono bg-background border border-border/50 rounded-sm px-2 py-1.5 break-all text-foreground">
                          {verifyRecord.recordValue}
                        </code>
                        {verifyError && <p className="text-[11px] text-amber-500 font-body">{verifyError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={handleCheckVerification}
                            disabled={checkingVerification}
                            className="flex-1 bg-primary text-primary-foreground py-2 rounded-sm font-body text-xs disabled:opacity-30 hover:bg-gold-light transition-colors flex items-center justify-center gap-1.5"
                          >
                            {checkingVerification ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</>) : "I've added it — check now"}
                          </button>
                          <button
                            onClick={() => { setVerifyRecord(null); setVerifyError(null); }}
                            className="px-3 py-2 rounded-sm font-body text-xs border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : result.isPublic ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-body py-2">
                          <CheckCircle2 className="w-4 h-4" /> Published to the Visibility Index
                        </div>
                        {confirmingUnpublish ? (
                          <div className="border border-destructive/30 bg-destructive/5 rounded-sm p-3 space-y-2">
                            <p className="text-xs text-foreground font-body">
                              This removes your score from the public {market} ranking. You can publish again later.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={handleUnpublish}
                                disabled={publishing}
                                className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-sm font-body text-xs disabled:opacity-30 hover:bg-destructive/90 transition-colors"
                              >
                                {publishing ? "Removing…" : "Yes, remove it"}
                              </button>
                              <button
                                onClick={() => setConfirmingUnpublish(false)}
                                className="px-3 py-2 rounded-sm font-body text-xs border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingUnpublish(true)}
                            className="w-full text-xs text-muted-foreground hover:text-destructive font-body py-1.5 transition-colors"
                          >
                            Remove from Visibility Index
                          </button>
                        )}
                      </div>
                    ) : confirmingPublish ? (
                      <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-sm p-3 space-y-2">
                        <p className="text-xs text-foreground font-body">
                          This makes your score visible on the public {market} ranking, alongside your peer group. Anyone can see it.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="flex-1 bg-emerald-600 text-white py-2 rounded-sm font-body text-xs disabled:opacity-30 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {publishing ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing…</>) : "Yes, publish it"}
                          </button>
                          <button
                            onClick={() => setConfirmingPublish(false)}
                            className="px-3 py-2 rounded-sm font-body text-xs border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingPublish(true)}
                        className="w-full bg-emerald-600 text-white py-3 rounded-sm font-body text-sm hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-4 h-4" /> Publish to the Visibility Index
                      </button>
                    )}

                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs font-body text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRerun}
                          onChange={(e) => handleToggleAutoRerun(e.target.checked)}
                          disabled={savingSchedule}
                          className="accent-emerald-600"
                        />
                        Re-run automatically
                      </label>
                      {autoRerun && (
                        <select
                          value={rerunFrequencyDays}
                          onChange={(e) => {
                            const days = Number(e.target.value);
                            setRerunFrequencyDays(days);
                            if (result) scheduleRerun(result.id, true, days).catch(() => toast.error("Couldn't update the re-run schedule"));
                          }}
                          disabled={savingSchedule}
                          className="bg-background border border-border rounded-sm px-2 py-1 text-xs font-body focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value={7}>Every 7 days</option>
                          <option value={14}>Every 14 days</option>
                          <option value={30}>Every 30 days</option>
                          <option value={90}>Every 90 days</option>
                        </select>
                      )}
                    </div>

                    <button onClick={startOver} className="mt-4 text-xs text-emerald-600 hover:text-emerald-500 font-body block mx-auto">
                      ← Run another audit
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MarketVisibilityScore;
