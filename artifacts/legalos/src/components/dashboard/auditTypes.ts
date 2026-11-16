// Shapes of a visibility audit row (market_visibility_audits) and a score
// history row as the dashboard reads them. Moved out of CommandCenter.tsx so
// the many modules that only need the types don't point at the component.
import type { PeerStats } from "../../../supabase/functions/_shared/percentileFormula";

export interface ThoughtLeadershipItem {
  title: string;
  date: string;
  type: "blog" | "news" | "other";
  hasNamedByline: boolean;
}

export interface DirectorySubScore {
  points: number;
  count: number;
  avgRank: number | null;
  qualityStats?: PeerStats | null;
}

export interface SiteHealthRaw {
  hasContactForm: boolean;
  copyrightYear: number | null;
  copyrightStale: boolean;
  brokenLinks: string[];
  checkedLinks: number;
}

export interface PerformanceRaw {
  desktop?: { performance: number; accessibility: number; seo: number };
  mobile?: { performance: number; accessibility: number; seo: number };
  perfAvg?: number;
  accessAvg?: number;
  seoAvg?: number;
}

export interface SocialRaw {
  followers?: number;
  posts30d?: number;
  engagementRate?: number | null;
  platforms?: { linkedin: boolean; instagram: boolean; twitter: boolean; facebook: boolean };
  platformCount?: number;
  /** Full six-value peer comparison (raw value, peer median, 90th-percentile
   *  threshold, highest observed, sample size, comparison date) this score
   *  was benchmarked against — persisted so a client can re-run the formula
   *  (e.g. a what-if simulator) without a live query, and so it's auditable. */
  followersStats?: PeerStats;
  postsStats?: PeerStats;
  erStats?: PeerStats | null;
}

export interface PressMention {
  title: string;
  source: string;
  link: string;
  date: string;
}

export interface ThoughtLeadershipRaw {
  /** All own output (articles + own news). */
  postsCount?: number;
  /** Own analysis/insight pieces on the firm's site. */
  articlesCount?: number;
  /** Own announcements (deals, hires, awards) on the firm's site. */
  ownNewsCount?: number;
  /** Independent press mentions (own domain excluded). */
  newsCount?: number;
  /** Fraction 0-1, not a percentage. */
  bylinePct?: number;
  /** Months of the content window with any own output, and the window's length in months. */
  activeMonths?: number;
  windowMonths?: number;
  measuredAt?: string;
  items?: ThoughtLeadershipItem[];
  pressMentions?: PressMention[];
  /** Full six-value peer comparisons — see SocialRaw's comment. */
  articlesStats?: PeerStats;
  ownNewsStats?: PeerStats;
  /** Pre-v3 audits: one blended own-output comparison. */
  postsStats?: PeerStats;
  newsStats?: PeerStats;
  /** Which press sources answered. Absent on audits from before it was recorded. */
  pressCoverage?: { checked: string[]; unavailable: string[] };
  /** Some press sources didn't answer: newsCount is a floor, and it's kept
   *  out of peer benchmarks. */
  pressPartial?: boolean;
}

export interface ReputationRaw {
  gbpListed?: boolean;
  /** 0–10 sub-score from Google Business Profile (Places API or self-reported fallback). */
  gbpScore?: number;
  /** "google_places_api" when scored from live Places data; "self_reported" when
   *  falling back to the intake boolean. Drives the Verified / Self-reported badge. */
  gbpSource?: "google_places_api" | "self_reported";
  /** Populated when gbpSource is "google_places_api". */
  gbpRating?: number | null;
  gbpReviewCount?: number | null;
  gbpOperational?: boolean | null;
  gbpScoreBreakdown?: {
    operationalPts: number;
    ratingPts: number;
    reviewPts: number;
    completenessPts: number;
  } | null;
  matchedFirmName?: string;
  matchedFirmDomain?: string | null;
  /** market_directory_data.last_verified_at for the matched row — reviewed
   *  quarterly, not refreshed automatically. Present only when a directory
   *  match was found (undefined while directory match is still pending). */
  directoryLastVerifiedAt?: string | null;
  chambers?: DirectorySubScore;
  legal500?: DirectorySubScore;
  iflr1000?: DirectorySubScore;
  chambersRankedTables?: Record<string, number> | null;
  legal500RankedTables?: Record<string, number> | null;
  iflr1000RankedTables?: Record<string, number> | null;
}

export interface AuditRow {
  id: string;
  audited_domain: string;
  display_name: string | null;
  market: string;
  peer_group: string;
  performance_score: number;
  social_score: number;
  seo_authority_score: number;
  thought_leadership_score: number;
  reputation_score: number;
  total_score: number;
  provenance: Record<string, string>;
  raw_metrics?: {
    siteHealth?: SiteHealthRaw | null;
    performance?: PerformanceRaw;
    social?: SocialRaw;
    seoAuthority?: Record<string, unknown>;
    thoughtLeadership?: ThoughtLeadershipRaw;
    reputation?: ReputationRaw;
  };
  updated_at: string;
  percentile?: number | null;
  peer_count?: number;
  /** Data-integrity metadata (CLAUDE.md §3) — which formula version scored
   *  this, what data window it drew from, and how much to trust the number. */
  methodology_version?: number;
  data_window_start?: string | null;
  data_window_end?: string | null;
  sample_size?: number | null;
  confidence_score?: number | null;
  review_status?: "unreviewed" | "reviewed" | "flagged";
  reviewed_by?: string | null;
  manual_override?: boolean;
  manual_override_reason?: string | null;
  /** §7 — optional peer-group refinement, self-reported at intake. Only
   *  firm_size narrows the live Social/Thought Leadership peer comparison
   *  today; the rest are captured for future use. */
  firm_size?: string | null;
  office_count?: string | null;
  service_model?: string | null;
  specialization?: string | null;
  market_tier?: string | null;
  /** The signed-in score uses the published census row when it has equal or
   * greater category coverage than the account's private row. */
  dashboard_source?: "private" | "public_census";
  private_audit_id?: string;
  public_audit_id?: string | null;
  public_audit_available?: boolean;
}

export interface HistoryRow {
  audited_domain: string;
  market: string;
  total_score: number;
  performance_score?: number;
  social_score?: number;
  seo_authority_score?: number;
  thought_leadership_score?: number;
  reputation_score?: number;
  recorded_at: string;
  /** Frozen at scoring time — never recomputed against today's peer group
   *  when this snapshot is redisplayed later (see percentileFormula.ts's
   *  PeerStats and runVisibilityAudit.ts). Same shape as AuditRow's
   *  raw_metrics/provenance, since both tables are written from the same
   *  scoring run. Optional because rows recorded before this metadata
   *  existed have neither. */
  raw_metrics?: AuditRow["raw_metrics"];
  provenance?: AuditRow["provenance"];
  /** Rolled-up per-audit confidence for THIS historical snapshot, not the
   *  current audit's — lets the history chart flag a thin-peer-group point
   *  without recomputing anything live. */
  confidence_score?: number | null;
  sample_size?: number | null;
  /** Which methodology scored this snapshot — pre-v3 totals were out of 200. */
  methodology_version?: number | null;
}
