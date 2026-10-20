// Firm Context Profile — assembled server-side per call and injected into
// every workshop/narrative/planning system prompt. This is the "firm memory"
// layer: it synthesises firm_profiles fields, recent audit history, and
// recent workshop run history into a plain-text context block that tells the
// model who this firm is, what they've done, and how they've been scored.
//
// Identity: the caller resolves the firm via the existing
// resolveClientIdGuarded / resolveVerifiedClientId pattern before calling
// this module. The firmId passed here is already verified — this module
// never does its own auth resolution.
//
// The block is deliberately plain text (not JSON) so it reads naturally
// inside a system prompt. Sections are omitted entirely when there is no
// data, so a brand-new firm gets a minimal prompt, not a wall of empty
// headers.
//
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

import { synthesisNoteLine, SYNTHESIS_NOTES_IN_CONTEXT, type SynthesisNote } from "./postRunSynthesis.ts";
import { TOTAL_MAX, categoryMaxForVersion, totalMaxForVersion } from "./methodology.ts";
import { getVoiceProfileBlock } from "./voiceProfile.ts";

interface AuditRow {
  total_score: number | null;
  performance_score: number | null;
  social_score: number | null;
  seo_authority_score: number | null;
  thought_leadership_score: number | null;
  reputation_score: number | null;
  market: string;
  peer_group: string;
  confidence_score: number | null;
  sample_size: number | null;
  created_at: string;
  methodology_version: number | null;
}

/** A stored total on the 500-point scale, whichever methodology produced it. */
const to500 = (total: number, version: number | null): number =>
  Math.round((total * TOTAL_MAX) / totalMaxForVersion(version));

interface WorkshopRun {
  toolId: string;
  toolLabel: string;
  title: string;
  preview?: string;
  createdAt: number;
}

interface FirmProfileRow {
  tone_of_voice: string | null;
  brand_rules: string | null;
  client_restrictions: string | null;
  practice_areas: string[];
  jurisdictions: string[];
  competitor_set: { name: string; domain: string }[];
  preferred_terminology: { prefer?: string[]; avoid?: string[] };
  approved_content: { title: string; summary: string }[];
  lawyer_roster: { name: string; title: string }[];
  synthesis_notes?: SynthesisNote[];
}

const TOOL_LABELS: Record<string, string> = {
  autopsy: "Copy Autopsy",
  headlines: "Headline Lab",
  "bio-rewrite": "Bio Rewriter",
  copywriter: "Copywriter",
  calendar: "Marketing Calendar",
  teardown: "Competitor Teardown",
  "practice-audit": "Practice Page Audit",
  "pitch-deck": "Pitch Deck",
  rewrite: "Rewrite",
  "deck-roast": "Deck Roast",
  "style-feedback": "Style Feedback",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// History renders as percentages of category potential — the public
// convention, matching the dashboard. Maxima follow the methodology version
// that produced each row, so older readings stay comparable.
function auditLine(a: AuditRow): string {
  const max = categoryMaxForVersion(a.methodology_version);
  const pct = (v: number, m: number) => `${Math.round((v / m) * 100)}%`;
  const scores = [
    a.performance_score != null && `Website ${pct(a.performance_score, max.performance)}`,
    a.social_score != null && `Social ${pct(a.social_score, max.social)}`,
    a.seo_authority_score != null && `Search ${pct(a.seo_authority_score, max.seoAuthority)}`,
    a.thought_leadership_score != null && `Thought ${pct(a.thought_leadership_score, max.thoughtLeadership)}`,
    a.reputation_score != null && `Recognition ${pct(a.reputation_score, max.reputation)}`,
  ].filter(Boolean).join(", ");
  const confidence = a.confidence_score != null
    ? ` (confidence: ${a.confidence_score >= 0.7 ? "high" : a.confidence_score >= 0.4 ? "medium" : "low"})`
    : "";
  return `- ${formatDate(a.created_at)}: total ${a.total_score != null ? to500(a.total_score, a.methodology_version) : "?"}/${TOTAL_MAX} — ${scores}${confidence}`;
}

function trendLine(audits: AuditRow[]): string {
  if (audits.length < 2) return "";
  const [latest, ...rest] = audits;
  const oldest = rest[rest.length - 1];
  if (latest.total_score == null || oldest.total_score == null) return "";
  // Points on the public 500 scale — the models quoting this block must
  // never say a number the dashboard wouldn't.
  const latest500 = to500(latest.total_score, latest.methodology_version);
  const oldest500 = to500(oldest.total_score, oldest.methodology_version);
  const delta = latest500 - oldest500;
  if (Math.abs(delta) < 5) return `- Trend: stable across ${audits.length} audits`;
  const dir = delta > 0 ? "up" : "down";
  return `- Trend: ${dir} ${Math.abs(delta)} pts since ${formatDate(oldest.created_at)} (${oldest500} → ${latest500})`;
}

function workshopLine(r: WorkshopRun): string {
  const label = TOOL_LABELS[r.toolId] ?? r.toolLabel ?? r.toolId;
  const date = new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `- ${date} — ${label}: ${r.title}${r.preview ? ` (${r.preview.slice(0, 80)})` : ""}`;
}

export interface FirmContextResult {
  /** The formatted context block for the system prompt ("" when no data). */
  block: string;
  /** The firm profile's jurisdictions — the AUTHORITATIVE market source
   *  (task #147). Pass to firmContextLine so a conflicting client-supplied
   *  firm_context.market is suppressed instead of fighting this value. */
  jurisdictions: string[];
}

/**
 * Assembles the firm context profile block for injection into a system
 * prompt, plus the profile's jurisdictions for jurisdiction precedence.
 * Returns empty values when the caller has no verified firm identity
 * (anonymous/demo) — never throws, never blocks the AI call.
 */
export async function buildFirmContext(
  serviceClient: SupabaseClient,
  firmId: string,
): Promise<FirmContextResult> {
  try {
    const [profileResult, auditsResult, historyResult, voiceBlock] = await Promise.all([
      serviceClient
        .from("firm_profiles")
        .select("tone_of_voice,brand_rules,client_restrictions,practice_areas,jurisdictions,competitor_set,preferred_terminology,approved_content,lawyer_roster,synthesis_notes")
        .eq("firm_id", firmId)
        .maybeSingle(),
      serviceClient
        .from("market_visibility_audits")
        .select("total_score,performance_score,social_score,seo_authority_score,thought_leadership_score,reputation_score,market,peer_group,confidence_score,sample_size,created_at,methodology_version")
        .eq("client_id", firmId)
        .order("created_at", { ascending: false })
        .limit(4),
      serviceClient
        .from("user_app_state")
        .select("value")
        .eq("client_id", firmId)
        .eq("key", "workshop_run_history")
        .maybeSingle(),
      // Best-effort: a missing table/row just means "no voice learned yet".
      getVoiceProfileBlock(serviceClient, firmId).catch(() => ""),
    ]);

    const profile = (profileResult.data ?? null) as FirmProfileRow | null;
    const audits = (auditsResult.data ?? []) as AuditRow[];
    const workshopRuns = (((historyResult.data?.value as WorkshopRun[] | undefined) ?? []).slice(0, 12)) as WorkshopRun[];

    const sections: string[] = [];

    // ── Firm identity ─────────────────────────────────────────────────────
    if (profile) {
      const lines: string[] = [];
      if (profile.practice_areas?.length) lines.push(`Practice areas: ${profile.practice_areas.join(", ")}`);
      if (profile.jurisdictions?.length) lines.push(`Jurisdictions: ${profile.jurisdictions.join(", ")}`);
      if (profile.tone_of_voice) lines.push(`Tone of voice: ${profile.tone_of_voice}`);
      if (profile.brand_rules) lines.push(`Brand rules: ${profile.brand_rules}`);
      if (profile.client_restrictions) lines.push(`Client restrictions: ${profile.client_restrictions}`);
      if (profile.preferred_terminology?.prefer?.length)
        lines.push(`Preferred terminology: ${profile.preferred_terminology.prefer.join(", ")}`);
      if (profile.preferred_terminology?.avoid?.length)
        lines.push(`Avoid: ${profile.preferred_terminology.avoid.join(", ")}`);
      if (profile.competitor_set?.length)
        lines.push(`Key competitors: ${profile.competitor_set.map((c) => c.name).join(", ")}`);
      if (lines.length) sections.push(`FIRM PROFILE\n${lines.join("\n")}`);
    }

    // ── Audit history ─────────────────────────────────────────────────────
    if (audits.length) {
      const lines = audits.map(auditLine);
      const trend = trendLine(audits);
      if (trend) lines.push(trend);
      const latest = audits[0];
      if (latest.market || latest.peer_group)
        lines.push(`Market: ${latest.market ?? "?"} · Peer group: ${latest.peer_group ?? "?"}`);
      sections.push(`AUDIT HISTORY\n${lines.join("\n")}`);
    }

    // ── Workshop activity ─────────────────────────────────────────────────
    if (workshopRuns.length) {
      sections.push(`RECENT WORKSHOP ACTIVITY\n${workshopRuns.map(workshopLine).join("\n")}`);
    }

    // ── Approved content ──────────────────────────────────────────────────
    if (profile?.approved_content?.length) {
      const items = profile.approved_content
        .slice(0, 5)
        .map((c) => `- "${c.title}": ${c.summary}`)
        .join("\n");
      sections.push(`APPROVED CONTENT (use as voice reference)\n${items}`);
    }

    // ── Lawyer roster (for bio tools) ────────────────────────────────────
    if (profile?.lawyer_roster?.length) {
      const names = profile.lawyer_roster.slice(0, 8).map((l) => `${l.name} (${l.title})`).join(", ");
      sections.push(`TEAM\n${names}`);
    }

    // ── Learned voice (distilled from kept/edited drafts) ────────────────
    if (voiceBlock) sections.push(voiceBlock);

    // ── Learned preferences (post-run synthesis) ─────────────────────────
    // Notes the synthesis loop distilled from past workshop runs — tone
    // decisions, approved/rejected directions, surfaced insights. This is
    // what makes the profile GROW with use rather than just reflect state.
    if (profile?.synthesis_notes?.length) {
      const notes = profile.synthesis_notes
        .slice(0, SYNTHESIS_NOTES_IN_CONTEXT)
        .map(synthesisNoteLine)
        .join("\n");
      sections.push(`LEARNED FROM PAST SESSIONS (honour these unless the user says otherwise)\n${notes}`);
    }

    const jurisdictions = (profile?.jurisdictions ?? []).filter(
      (j): j is string => typeof j === "string" && !!j.trim(),
    );

    if (!sections.length) return { block: "", jurisdictions };

    return {
      block: `\n\n---\nFIRM CONTEXT (use this to personalise every response — do not ask for information already here):\n\n${sections.join("\n\n")}\n---\n`,
      jurisdictions,
    };
  } catch (e) {
    // Never let a profile lookup failure break the AI call — log and continue.
    console.error("buildFirmContext error:", e);
    return { block: "", jurisdictions: [] };
  }
}

/** Legacy string-only wrapper — prefer buildFirmContext so the caller can
 *  enforce jurisdiction precedence via firmContextLine (task #147). */
export async function buildFirmContextBlock(
  serviceClient: SupabaseClient,
  firmId: string,
): Promise<string> {
  return (await buildFirmContext(serviceClient, firmId)).block;
}
