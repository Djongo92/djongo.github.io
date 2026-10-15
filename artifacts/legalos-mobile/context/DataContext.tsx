import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loadSignedInData } from '@/lib/auditData';
import { AuditLoadError } from '@/components/AuditLoadError';
import { getCategories } from '@/lib/categories';

// getCategories moved to lib/categories.ts so the audit-load seam
// (lib/auditData.ts) can share it without a runtime import cycle —
// re-exported here so existing consumers (ShareCard, FirmRow, screens)
// keep importing from '@/context/DataContext' unchanged.
export { getCategories } from '@/lib/categories';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  key: string;
  label: string;
  score: number;
  max: number;
  color: string;
  /** "missing" means this category couldn't be measured (e.g. no GBP match,
   *  no paid SEO data source) — never a real, earned zero. Any surface
   *  that shows this category must distinguish "not yet scored" from 0. */
  provenance: string;
}

// Per-category provenance, keyed the same as the score fields below.
// "api" (or any non-"missing" string) = actually measured; "missing" =
// the audit couldn't measure it, so it must be excluded from totals
// rather than counted as an earned zero.
export type Provenance = Record<'performance' | 'social' | 'seoAuthority' | 'thoughtLeadership' | 'reputation', string>;

export interface Firm {
  id: string;
  rank: number;
  name: string;
  domain: string;
  score: number;
  percentile: number;
  isYou?: boolean;
  /** Measured score ÷ measured max — the fair cross-source ranking metric;
   *  the leaderboard sorts by this, matching the web Visibility Index. */
  visibilityPercent: number;
  /** False for directory-standing rows (Chambers/Legal 500/IFLR-tracked firms
   *  that never ran a full audit): score is directory points out of 45, not a
   *  200-point audit — label it as such wherever it renders. */
  hasFullAudit: boolean;
  performance: number;
  social: number;
  seoAuthority: number;
  thoughtLeadership: number;
  reputation: number;
  provenance: Provenance;
  /** When this firm's audit was last scored (market_visibility_audits
   *  .updated_at). Drives the "stale data" badge on the leaderboard row when
   *  older than the web's AUDIT_STALE_AFTER_DAYS window. Absent on demo rows
   *  and directory-only rows (which carry no audit timestamp). */
  auditedAt?: string | null;
  /** 0–1 fraction of this audit's peer-normalized metrics that met the
   *  minimum-sample rule (market_visibility_audits.confidence_score). < 1
   *  flags a thin peer group, the same treatment as the score-history chart. */
  confidenceScore?: number | null;
  /** Smallest peer-comparison sample behind any metric in this audit
   *  (market_visibility_audits.sample_size). */
  sampleSize?: number | null;
}

export interface AuditHistoryEntry {
  score: number;
  recordedAt: string; // ISO date string
  /** Frozen raw_metrics snapshot — the observable evidence behind each
   *  category score at that point (visibility-audit-get already returns
   *  it); null on rows predating the freeze. */
  rawMetrics: Record<string, any> | null;
  /** Per-category provenance frozen at scoring time — "missing" gates the
   *  evidence line so an unmeasured category never shows a fabricated raw
   *  value (same gate as the web score-history chart). */
  provenance: Partial<Provenance> | null;
  /** Methodology that scored this snapshot — pre-v3 totals were out of 200. */
  methodologyVersion?: number | null;
  /** 0–1 confidence for this snapshot; < 1 flags thin-sampled peer metrics
   *  (the web chart's "Some points thin-sampled" treatment). */
  confidenceScore: number | null;
  /** Smallest peer sample behind any metric in this snapshot. */
  sampleSize: number | null;
}

// ─── Static demo data ─────────────────────────────────────────────────────────

// All categories actually measured — the default provenance for every
// representative/demo and leaderboard firm. Live audit rows carry their
// persisted provenance separately, so genuinely missing sources still remain
// denominator-honest outside this fixture.
const FULL_PROVENANCE: Provenance = {
  performance: 'api', social: 'api', seoAuthority: 'api', thoughtLeadership: 'api', reputation: 'api',
};

export const DEMO_FIRM: Firm = {
  id: 'demo',
  rank: 7,
  name: 'Petrović & Partners',
  domain: 'petrovic-partners.rs',
  score: 295,
  percentile: 15,
  isYou: true,
  // 295 measured points ÷ 500 measured max, including Search Authority.
  visibilityPercent: 59,
  hasFullAudit: true,
  performance: 30,
  social: 52,
  seoAuthority: 50,
  thoughtLeadership: 90,
  reputation: 73,
  // The representative SEO ranking is now available, so it contributes to
  // both the full score and its honest measured denominator.
  provenance: FULL_PROVENANCE,
};

// Every demo-roster row is fully measured, so visibilityPercent = score ÷ 500.
export const LEADERBOARD: Firm[] = [
  { id: '1',  rank: 1,  name: 'Joksović & Associates',  domain: 'joksovic-law.rs',    score: 426, percentile: 2,  visibilityPercent: 85, hasFullAudit: true, performance: 45, social: 71, seoAuthority: 75, thoughtLeadership: 133, reputation: 102, provenance: FULL_PROVENANCE },
  { id: '2',  rank: 2,  name: 'Živković Partnership',   domain: 'zivkovic-law.rs',    score: 403, percentile: 5,  visibilityPercent: 81, hasFullAudit: true, performance: 42, social: 64, seoAuthority: 70, thoughtLeadership: 127, reputation: 100, provenance: FULL_PROVENANCE },
  { id: '3',  rank: 3,  name: 'Marković Legal Group',   domain: 'markovic-legal.rs',  score: 385, percentile: 7,  visibilityPercent: 77, hasFullAudit: true, performance: 40, social: 60, seoAuthority: 67, thoughtLeadership: 123, reputation: 95, provenance: FULL_PROVENANCE },
  { id: '4',  rank: 4,  name: 'Nikolić & Savić',        domain: 'nikolic-savic.rs',   score: 365, percentile: 9,  visibilityPercent: 73, hasFullAudit: true, performance: 38, social: 56, seoAuthority: 63, thoughtLeadership: 117, reputation: 91, provenance: FULL_PROVENANCE },
  { id: '5',  rank: 5,  name: 'Đorđević Law Group',     domain: 'djordjevic-law.rs',  score: 348, percentile: 11, visibilityPercent: 70, hasFullAudit: true, performance: 38, social: 52, seoAuthority: 62, thoughtLeadership: 110, reputation: 86, provenance: FULL_PROVENANCE },
  { id: '6',  rank: 6,  name: 'Stefanović Partners',    domain: 'stefanovic.rs',      score: 324, percentile: 14, visibilityPercent: 65, hasFullAudit: true, performance: 35, social: 52, seoAuthority: 57, thoughtLeadership: 103, reputation: 77, provenance: FULL_PROVENANCE },
  { ...DEMO_FIRM },
  { id: '8',  rank: 8,  name: 'Simić Legal',            domain: 'simic-legal.rs',     score: 279, percentile: 18, visibilityPercent: 56, hasFullAudit: true, performance: 30, social: 49, seoAuthority: 45, thoughtLeadership: 87, reputation: 68, provenance: FULL_PROVENANCE },
  { id: '9',  rank: 9,  name: 'Popović Law Office',     domain: 'popovic-law.rs',     score: 265, percentile: 20, visibilityPercent: 53, hasFullAudit: true, performance: 28, social: 49, seoAuthority: 42, thoughtLeadership: 80, reputation: 66, provenance: FULL_PROVENANCE },
  { id: '10', rank: 10, name: 'Ivanović & Co',          domain: 'ivanovic.rs',        score: 251,  percentile: 23, visibilityPercent: 50, hasFullAudit: true, performance: 25, social: 45, seoAuthority: 40, thoughtLeadership: 77, reputation: 64, provenance: FULL_PROVENANCE },
  { id: '11', rank: 11, name: 'Milošević Attorneys',    domain: 'milosevic-law.rs',   score: 235,  percentile: 25, visibilityPercent: 47, hasFullAudit: true, performance: 25, social: 41, seoAuthority: 37, thoughtLeadership: 73, reputation: 59, provenance: FULL_PROVENANCE },
  { id: '12', rank: 12, name: 'Vasić Law Firm',         domain: 'vasic-law.rs',       score: 224,  percentile: 27, visibilityPercent: 45, hasFullAudit: true, performance:  22, social: 41, seoAuthority: 35, thoughtLeadership: 67, reputation: 59, provenance: FULL_PROVENANCE },
  { id: '13', rank: 13, name: 'Lukić & Partners',       domain: 'lukic-law.rs',       score: 210,  percentile: 30, visibilityPercent: 42, hasFullAudit: true, performance:  22, social: 38, seoAuthority: 32, thoughtLeadership: 63, reputation: 55, provenance: FULL_PROVENANCE },
  { id: '14', rank: 14, name: 'Đukić Legal',            domain: 'djukic-legal.rs',    score: 197,  percentile: 32, visibilityPercent: 39, hasFullAudit: true, performance:  20, social: 38, seoAuthority: 30, thoughtLeadership: 57, reputation: 52, provenance: FULL_PROVENANCE },
  { id: '15', rank: 15, name: 'Pavlović Office',        domain: 'pavlovic-law.rs',    score: 183,  percentile: 34, visibilityPercent: 37, hasFullAudit: true, performance:  20, social:  34, seoAuthority: 28, thoughtLeadership: 53, reputation: 48, provenance: FULL_PROVENANCE },
];

// ─── Data seams ───────────────────────────────────────────────────────────────
// The signed-in load lives in lib/auditData.ts (loadSignedInData) and the
// peer-leaderboard wiring in lib/peerLeaderboard.ts (fetchPeerLeaderboard +
// applyPeerResult) — both extracted with injectable sources so their failure
// paths are unit-tested without a live Supabase connection or React context
// (lib/auditData.test.ts, lib/peerLeaderboard.test.ts).

// ─── Context ──────────────────────────────────────────────────────────────────

interface DataContextValue {
  firm: Firm;
  leaderboard: Firm[];
  categories: Category[];
  auditHistory: AuditHistoryEntry[];
  isDemo: boolean;
  isLoading: boolean;
  /** Set when a SIGNED-IN user's audit fetch threw or returned badly —
   *  never set for signed-out demo browsing. Combined with isDemo in the
   *  provider to decide between the app and the couldn't-load gate. */
  loadError: string | null;
  /** Set when a refresh FAILS but real (non-demo) data is already loaded:
   *  the current firm/leaderboard/history are KEPT and this drives a compact,
   *  non-blocking stale-data banner (not the blocking AuditLoadError gate).
   *  Cleared on the next successful refresh. Never set on the initial
   *  signed-in load failure — that still swaps in the couldn't-load gate. */
  refreshError: string | null;
  /** True only for a signed-in account whose load SUCCEEDED but returned no
   *  audit yet (result.hasAudit === false) — the cue to nudge the user toward
   *  the Firm Profile screen. Never inferred from isDemo, and reset on
   *  sign-out. */
  hasNoAudit: boolean;
  /** Re-fetch the signed-in user's data. Debounced by default so a fetch in
   *  flight or one that completed < REFRESH_MIN_INTERVAL_MS ago is skipped —
   *  the screen-focus refetch (useFocusEffect on the DataContext consumers)
   *  relies on this to avoid duplicate network calls when tabs are switched
   *  rapidly. Pass { force: true } for user-initiated refreshes (pull-to-
   *  refresh, the error-banner Retry) that must always run. */
  refresh: (opts?: { force?: boolean }) => Promise<void>;
}

/** A focus/auto refresh is skipped if the last one finished this recently. */
export const REFRESH_MIN_INTERVAL_MS = 30_000;

const DataContext = createContext<DataContextValue>({
  firm: DEMO_FIRM,
  leaderboard: LEADERBOARD,
  categories: getCategories(DEMO_FIRM),
  auditHistory: [],
  isDemo: true,
  isLoading: false,
  loadError: null,
  refreshError: null,
  hasNoAudit: false,
  refresh: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [firm, setFirm] = useState<Firm>(DEMO_FIRM);
  const [leaderboard, setLeaderboard] = useState<Firm[]>(LEADERBOARD);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [hasNoAudit, setHasNoAudit] = useState(false);

  // Debounce state for the focus/auto refetch: whether a fetch is in flight
  // and when the last one finished. Refs (not state) so the guard reads the
  // latest values without adding them to refresh()'s dependency list, which
  // must stay stable so useFocusEffect on the consumers doesn't re-subscribe.
  const inFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  // Whether real (non-demo) data is currently on screen — read inside the
  // stable refresh() without widening its deps.
  const hasLiveDataRef = useRef(false);

  // Identity guards. epochRef invalidates in-flight requests when the
  // authenticated identity changes (sign-out or account switch): a fetch
  // started for user A must never write A's firm/leaderboard/history into
  // user B's session. ownerId stamps who the live data on screen belongs to,
  // so the render below can refuse to expose it across an identity change
  // even in the one frame before the reset effect runs.
  const epochRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Reset ALL per-account state synchronously-ish on identity change, and
  // free the in-flight slot so the new identity's forced refresh can start.
  useEffect(() => {
    const id = user?.id ?? null;
    if (userIdRef.current === id) return;
    userIdRef.current = id;
    epochRef.current += 1;
    inFlightRef.current = false;
    lastFetchAtRef.current = 0;
    hasLiveDataRef.current = false;
    setOwnerId(null);
    setLoadError(null);
    setRefreshError(null);
    setHasNoAudit(false);
    setFirm(DEMO_FIRM);
    setLeaderboard(LEADERBOARD);
    setAuditHistory([]);
    setIsDemo(true);
  }, [user?.id]);

  const refresh = useCallback(async (opts?: { force?: boolean }) => {
    if (!user || !session) {
      setFirm(DEMO_FIRM);
      setLeaderboard(LEADERBOARD);
      setAuditHistory([]);
      setIsDemo(true);
      setLoadError(null);
      setRefreshError(null);
      setHasNoAudit(false);
      hasLiveDataRef.current = false;
      return;
    }

    // Debounce: never overlap an in-flight fetch, and skip a non-forced
    // refresh that ran within the last REFRESH_MIN_INTERVAL_MS — this is what
    // keeps the screen-focus refetch from firing duplicate network calls when
    // the user flips between tabs. User-initiated refreshes pass force.
    const force = opts?.force ?? false;
    if (inFlightRef.current) return;
    if (!force && Date.now() - lastFetchAtRef.current < REFRESH_MIN_INTERVAL_MS) return;

    inFlightRef.current = true;
    setIsLoading(true);
    setLoadError(null);
    // Capture the request identity up front: if the user signs out or the
    // account switches while this fetch is in flight, the epoch/userId check
    // below discards the result instead of writing one account's data into
    // another's session.
    const epochAtStart = epochRef.current;
    const requestUserId = user.id;
    try {
      const result = await loadSignedInData(user.id, session.access_token);

      if (epochRef.current !== epochAtStart || userIdRef.current !== requestUserId) {
        return; // stale request — identity changed mid-flight
      }

      if (!result.ok) {
        console.warn('[DataContext] audit fetch failed:', result.error);
        if (hasLiveDataRef.current) {
          // Real data is already on screen — keep it and surface a compact,
          // non-blocking stale-data banner instead of the blocking gate.
          // A signed-in user acting on their real (if slightly stale) numbers
          // is fine; wiping the screen for a transient refresh failure isn't.
          setRefreshError(result.error);
        } else {
          // Initial signed-in load failure: keep today's gating behavior —
          // the render gate below swaps the whole app for a couldn't-load
          // state, since the only alternative on screen is the demo firm.
          setLoadError(result.error);
        }
        return;
      }

      // Success — a previous refresh error is now resolved.
      setRefreshError(null);

      if (result.hasAudit && result.firm && result.leaderboard) {
        setIsDemo(false);
        setHasNoAudit(false);
        setLeaderboard(result.leaderboard);
        setFirm(result.firm);
        hasLiveDataRef.current = true;
        setOwnerId(requestUserId);
      } else {
        // Load succeeded but the account has no audit yet — NOT a failure.
        // Flag it so the Score tab can nudge toward the Firm Profile screen.
        // Derived only from a successful load, never from isDemo.
        setHasNoAudit(true);
      }

      if (result.auditHistory.length > 0) {
        setAuditHistory(result.auditHistory);
      }
    } finally {
      if (epochRef.current === epochAtStart) {
        inFlightRef.current = false;
        lastFetchAtRef.current = Date.now();
      }
      setIsLoading(false);
    }
  }, [user, session]);

  // Re-fetch whenever auth state changes — always force, it's a real change.
  useEffect(() => {
    refresh({ force: true });
  }, [refresh]);

  // Identity-owned at render: live data is exposed only while the account it
  // belongs to is still the signed-in one. In the frame between an identity
  // change and the reset effect above, fall back to the demo shape rather
  // than flash the previous account's firm at the new one.
  const identityMismatch = !isDemo && ownerId !== (user?.id ?? null);

  const value: DataContextValue = {
    firm: identityMismatch ? DEMO_FIRM : firm,
    leaderboard: identityMismatch ? LEADERBOARD : leaderboard,
    categories: getCategories(identityMismatch ? DEMO_FIRM : firm),
    auditHistory: identityMismatch ? [] : auditHistory,
    isDemo: identityMismatch ? true : isDemo,
    isLoading,
    loadError,
    refreshError: identityMismatch ? null : refreshError,
    hasNoAudit: identityMismatch ? false : hasNoAudit,
    refresh,
  };

  return (
    <DataContext.Provider value={value}>
      {/* The gate: only when the alternative on screen would be the fictional
          demo firm (loadError requires a session; isDemo means no real data
          ever loaded). A failed refresh with real data already on screen
          keeps that real data rather than swapping in an error wall. */}
      {loadError && isDemo ? (
        <AuditLoadError onRetry={() => refresh({ force: true })} isRetrying={isLoading} />
      ) : (
        children
      )}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
