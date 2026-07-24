// Live "what-if" score simulator: drag real inputs (PageSpeed scores,
// LinkedIn followers, posting cadence) and watch the total recompute
// instantly, using the exact same pure formula functions the backend
// scores audits with — not an approximation. This is only possible
// because performanceFormula/socialFormula/thoughtLeadershipFormula.ts are
// deliberately pure (no Deno globals, no network, no Supabase client), and
// because socialScore.ts/thoughtLeadershipScore.ts now persist the
// peer-max denominators they normalized against into raw_metrics — see
// those files' comments. Reputation and SEO & Authority aren't simulated:
// Reputation depends on a live directory-data DB lookup and SEO & Authority
// requires a paid Ahrefs/Moz subscription this build doesn't have — both
// stay pinned at their current values in the total.
import { useMemo, useState } from "react";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import ModalShell from "@/components/ui/modal-shell";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORY_META } from "@/lib/visibilityCategories";
import type { AuditRow } from "@/components/dashboard/CommandCenter";
import { calculatePerformanceScore } from "../../../supabase/functions/_shared/performanceFormula";
import { calculateSocialScore, MAX_FOLLOWERS, MAX_POSTS_30D, MAX_ENGAGEMENT_RATE } from "../../../supabase/functions/_shared/socialFormula";
import { calculateThoughtLeadershipScore } from "../../../supabase/functions/_shared/thoughtLeadershipFormula";

interface Props {
  open: boolean;
  onClose: () => void;
  audit: AuditRow;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const WhatIfSimulator = ({ open, onClose, audit }: Props) => {
  const perf = audit.raw_metrics?.performance;
  const social = audit.raw_metrics?.social;
  const tl = audit.raw_metrics?.thoughtLeadership;

  const initialPerf = {
    desktop: perf?.desktop?.performance ?? 0,
    mobile: perf?.mobile?.performance ?? 0,
  };
  const initialSocial = {
    followers: social?.followers ?? 0,
    posts30d: social?.posts30d ?? 0,
    engagementRate: social?.engagementRate ?? 0,
    platforms: social?.platforms ?? { linkedin: false, instagram: false, twitter: false, facebook: false },
  };
  const initialTl = {
    postsCount: tl?.postsCount ?? 0,
    newsCount: tl?.newsCount ?? 0,
    bylinePct: Math.round((tl?.bylinePct ?? 0) * 100),
  };

  const [desktopPerf, setDesktopPerf] = useState(initialPerf.desktop);
  const [mobilePerf, setMobilePerf] = useState(initialPerf.mobile);
  const [followers, setFollowers] = useState(initialSocial.followers);
  const [posts30d, setPosts30d] = useState(initialSocial.posts30d);
  const [engagementRate, setEngagementRate] = useState(initialSocial.engagementRate);
  const [platforms, setPlatforms] = useState(initialSocial.platforms);
  const [postsCount, setPostsCount] = useState(initialTl.postsCount);
  const [newsCount, setNewsCount] = useState(initialTl.newsCount);
  const [bylinePct, setBylinePct] = useState(initialTl.bylinePct);

  const reset = () => {
    setDesktopPerf(initialPerf.desktop);
    setMobilePerf(initialPerf.mobile);
    setFollowers(initialSocial.followers);
    setPosts30d(initialSocial.posts30d);
    setEngagementRate(initialSocial.engagementRate);
    setPlatforms(initialSocial.platforms);
    setPostsCount(initialTl.postsCount);
    setNewsCount(initialTl.newsCount);
    setBylinePct(initialTl.bylinePct);
  };

  const performanceResult = useMemo(() => {
    if (!perf?.desktop || !perf?.mobile) return null;
    return calculatePerformanceScore(
      { performance: desktopPerf, accessibility: perf.desktop.accessibility, seo: perf.desktop.seo },
      { performance: mobilePerf, accessibility: perf.mobile.accessibility, seo: perf.mobile.seo },
    );
  }, [perf, desktopPerf, mobilePerf]);

  const socialResult = useMemo(() => {
    if (!social) return null;
    // The real backend's peer-max only ever grows — a hypothetical value
    // above the last-known max would itself become the new max, exactly
    // like peerMaxFor() behaves against a live query. Mirroring that here
    // keeps a "what if I doubled my followers" scenario honest instead of
    // silently capping at the old ceiling.
    const followersPeerMax = Math.max(social.followersPeerMax ?? 0, followers);
    const postsPeerMax = Math.max(social.postsPeerMax ?? 0, posts30d);
    const erPeerMax = Math.max(social.erPeerMax ?? 0, engagementRate);
    return calculateSocialScore(followers, posts30d, engagementRate, platforms, followersPeerMax, postsPeerMax, erPeerMax);
  }, [social, followers, posts30d, engagementRate, platforms]);

  const tlResult = useMemo(() => {
    if (!tl) return null;
    const postsPeerMax = Math.max(tl.postsPeerMax ?? 0, postsCount);
    const newsPeerMax = Math.max(tl.newsPeerMax ?? 0, newsCount);
    return calculateThoughtLeadershipScore(postsCount, newsCount, bylinePct / 100, postsPeerMax, newsPeerMax);
  }, [tl, postsCount, newsCount, bylinePct]);

  const whatIfTotal = useMemo(() => {
    const performanceScore = performanceResult?.score ?? audit.performance_score;
    const socialScore = socialResult?.score ?? audit.social_score;
    const tlScore = tlResult ?? audit.thought_leadership_score;
    return performanceScore + socialScore + tlScore + audit.seo_authority_score + audit.reputation_score;
  }, [performanceResult, socialResult, tlResult, audit]);

  const delta = round1(whatIfTotal - audit.total_score);

  const platformKeys: { key: keyof typeof platforms; label: string }[] = [
    { key: "linkedin", label: "LinkedIn" },
    { key: "instagram", label: "Instagram" },
    { key: "twitter", label: "X / Twitter" },
    { key: "facebook", label: "Facebook" },
  ];

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClass="max-w-2xl">
      <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="font-display text-lg text-foreground">What if?</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={reset} className="p-1.5 text-muted-foreground hover:text-foreground" title="Reset to your actual numbers">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-6 py-5 space-y-6">
        <p className="text-xs text-muted-foreground font-body leading-relaxed">
          Drag any input to see how it moves your real score, computed with the exact same formula the audit
          uses — not an estimate. Reputation and SEO &amp; Authority stay fixed here: one needs a live directory
          lookup, the other a paid data subscription this instance doesn't have configured yet.
        </p>

        <div className="flex items-center justify-between bg-secondary/30 rounded-sm p-4">
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">What-if total</p>
            <p className="font-display text-3xl text-foreground font-semibold">
              {round1(whatIfTotal)} <span className="text-sm text-muted-foreground">/ 200</span>
            </p>
          </div>
          {delta !== 0 && (
            <span className={`font-body text-sm font-medium ${delta > 0 ? "text-emerald-500" : "text-destructive"}`}>
              {delta > 0 ? "+" : ""}{delta} vs your actual {round1(audit.total_score)}
            </span>
          )}
        </div>

        {/* Performance */}
        <div className="space-y-4">
          <p className="text-xs font-body text-foreground flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full bg-sky-500`} />
            {CATEGORY_META.performance.label}
            {performanceResult && <span className="text-muted-foreground ml-auto">{round1(performanceResult.score)} / {CATEGORY_META.performance.max}</span>}
          </p>
          {!perf?.desktop || !perf?.mobile ? (
            <p className="text-xs text-muted-foreground font-body">Run a real audit to unlock this slider.</p>
          ) : (
            <>
              <SliderRow label="Desktop PageSpeed" value={desktopPerf} onChange={setDesktopPerf} max={100} />
              <SliderRow label="Mobile PageSpeed" value={mobilePerf} onChange={setMobilePerf} max={100} />
            </>
          )}
        </div>

        {/* Social */}
        <div className="space-y-4">
          <p className="text-xs font-body text-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {CATEGORY_META.social.label}
            {socialResult && <span className="text-muted-foreground ml-auto">{round1(socialResult.score)} / {CATEGORY_META.social.max}</span>}
          </p>
          {!social ? (
            <p className="text-xs text-muted-foreground font-body">Run a real audit to unlock these sliders.</p>
          ) : (
            <>
              <SliderRow
                label="LinkedIn followers"
                value={followers}
                onChange={setFollowers}
                max={Math.max((social.followersPeerMax ?? 0) * 2, followers * 2, 1000)}
                format={(v) => v.toLocaleString()}
              />
              <SliderRow
                label="Posts in last 30 days"
                value={posts30d}
                onChange={setPosts30d}
                max={Math.max((social.postsPeerMax ?? 0) * 2, posts30d * 2, 20, 1)}
              />
              <SliderRow
                label="Engagement rate"
                value={engagementRate}
                onChange={setEngagementRate}
                max={Math.max((social.erPeerMax ?? 0) * 2, engagementRate * 2, 5)}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <div className="flex flex-wrap gap-4">
                {platformKeys.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-xs font-body text-secondary-foreground/80 cursor-pointer">
                    <Checkbox
                      checked={platforms[key]}
                      onCheckedChange={(checked) => setPlatforms((p) => ({ ...p, [key]: checked === true }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thought Leadership */}
        <div className="space-y-4">
          <p className="text-xs font-body text-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {CATEGORY_META.thoughtLeadership.label}
            {tlResult != null && <span className="text-muted-foreground ml-auto">{round1(tlResult)} / {CATEGORY_META.thoughtLeadership.max}</span>}
          </p>
          {!tl ? (
            <p className="text-xs text-muted-foreground font-body">Run a real audit to unlock these sliders.</p>
          ) : (
            <>
              <SliderRow
                label="Blog posts published"
                value={postsCount}
                onChange={setPostsCount}
                max={Math.max((tl.postsPeerMax ?? 0) * 2, postsCount * 2, 20, 1)}
              />
              <SliderRow
                label="Press mentions found"
                value={newsCount}
                onChange={setNewsCount}
                max={Math.max((tl.newsPeerMax ?? 0) * 2, newsCount * 2, 10, 1)}
              />
              <SliderRow
                label="Carry a named byline"
                value={bylinePct}
                onChange={setBylinePct}
                max={100}
                format={(v) => `${Math.round(v)}%`}
              />
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  step?: number;
  format?: (v: number) => string;
}

const SliderRow = ({ label, value, onChange, max, step = 1, format }: SliderRowProps) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-body text-secondary-foreground/80">{label}</span>
      <span className="text-xs font-body text-foreground font-medium">{format ? format(value) : Math.round(value)}</span>
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={0} max={max} step={step} />
  </div>
);

export default WhatIfSimulator;
