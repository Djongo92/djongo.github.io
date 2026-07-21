// One-pager PDF export for a single Analytics category — a smaller,
// focused counterpart to Battle Plan's full PDF, useful for handing one
// category's read-out to a managing partner without the whole packet.
// jsPDF is dynamically imported so it's never in Analytics' initial chunk.
import type { CategoryKey, CategoryMeta } from "@/lib/visibilityCategories";
import type { PerformanceRaw, SocialRaw, ThoughtLeadershipRaw, ReputationRaw } from "@/components/dashboard/CommandCenter";
import { practiceAreaLabel } from "@/lib/practiceAreas";

interface ExportParams {
  firmName: string;
  categoryKey: CategoryKey;
  meta: CategoryMeta;
  score: number;
  provenance: string;
  raw: {
    performance?: PerformanceRaw;
    social?: SocialRaw;
    seoAuthority?: Record<string, unknown>;
    thoughtLeadership?: ThoughtLeadershipRaw;
    reputation?: ReputationRaw;
  };
}

function buildRows(categoryKey: CategoryKey, raw: ExportParams["raw"]): string[] {
  if (categoryKey === "performance" && raw.performance?.desktop) {
    const p = raw.performance;
    const rows = [`Desktop — speed ${p.desktop!.performance}/100, accessibility ${p.desktop!.accessibility}/100, SEO ${p.desktop!.seo}/100`];
    if (p.mobile) rows.push(`Mobile — speed ${p.mobile.performance}/100, accessibility ${p.mobile.accessibility}/100, SEO ${p.mobile.seo}/100`);
    return rows;
  }
  if (categoryKey === "social" && raw.social?.followers !== undefined) {
    const s = raw.social;
    const platforms = Object.entries(s.platforms ?? {}).filter(([, v]) => v).map(([k]) => k);
    return [
      `LinkedIn followers: ${s.followers}`,
      `Posts (last 30 days): ${s.posts30d}`,
      `Engagement rate: ${s.engagementRate != null ? `${s.engagementRate}%` : "Not supplied"}`,
      `Active platforms: ${platforms.length ? platforms.join(", ") : "None"}`,
    ];
  }
  if (categoryKey === "thoughtLeadership" && raw.thoughtLeadership?.items) {
    const t = raw.thoughtLeadership;
    const rows = [`Original posts: ${t.postsCount} · News mentions: ${t.newsCount} · Byline rate: ${Math.round(t.bylinePct ?? 0)}%`];
    [...t.items]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)
      .forEach((item) => {
        const suffix = item.type === "blog" ? (item.hasNamedByline ? ", named byline" : ", no byline") : ", press mention";
        rows.push(`${item.date} — ${item.title} (${item.type}${suffix})`);
      });
    return rows;
  }
  if (categoryKey === "reputation" && raw.reputation) {
    const r = raw.reputation;
    const rows = [`Google Business Profile: ${r.gbpListed ? "Listed" : "Not listed"}`];
    if (r.matchedFirmName) {
      rows.push(`Matched directory entry: ${r.matchedFirmName}`);
      if (r.chambers) rows.push(`Chambers: ${Math.round(r.chambers.points * 10) / 10} pts · ${r.chambers.count} ranked tables`);
      if (r.legal500) rows.push(`Legal 500: ${Math.round(r.legal500.points * 10) / 10} pts · ${r.legal500.count} ranked tables`);
      if (r.iflr1000) rows.push(`IFLR1000: ${Math.round(r.iflr1000.points * 10) / 10} pts · ${r.iflr1000.count} ranked tables`);
      const codes = Array.from(new Set([
        ...Object.keys(r.chambersRankedTables ?? {}),
        ...Object.keys(r.legal500RankedTables ?? {}),
        ...Object.keys(r.iflr1000RankedTables ?? {}),
      ])).sort();
      if (codes.length > 0) {
        rows.push("By practice area:");
        codes.forEach((code) => {
          const parts: string[] = [];
          if (r.chambersRankedTables?.[code]) parts.push(`Chambers Band ${r.chambersRankedTables[code]}`);
          if (r.legal500RankedTables?.[code]) parts.push(`Legal 500 Tier ${r.legal500RankedTables[code]}`);
          if (r.iflr1000RankedTables?.[code]) parts.push(`IFLR1000 Tier ${r.iflr1000RankedTables[code]}`);
          rows.push(`  ${practiceAreaLabel(code)}: ${parts.join(", ")}`);
        });
      }
    } else {
      rows.push("No directory match found yet — queued for a manual lookup pass.");
    }
    return rows;
  }
  return ["Not scored yet."];
}

export async function exportCategoryPdf({ firmName, categoryKey, meta, score, provenance, raw }: ExportParams) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 24;

  const write = (text: string, size: number, gap: number) => {
    doc.setFontSize(size);
    const split = doc.splitTextToSize(text, 170);
    doc.text(split, 20, y);
    y += gap * split.length;
  };

  doc.setFontSize(9);
  doc.text("LegalOS — Market Visibility Score", 20, 12);

  write(meta.label, 20, 10);
  write(firmName, 11, 8);
  write(`${Math.round(score * 10) / 10} / ${meta.max} points  ·  ${provenance}`, 12, 10);

  y += 2;
  write("What this measures", 11, 7);
  write(meta.what, 10, 6);
  y += 2;
  write("Why it matters", 11, 7);
  write(meta.why, 10, 6);
  y += 2;
  write("How it's scored", 11, 7);
  write(meta.how, 10, 6);

  y += 4;
  write("Raw inputs", 12, 8);
  buildRows(categoryKey, raw).forEach((row) => write(row, 10, 6));

  doc.save(`${firmName.replace(/\s+/g, "-").toLowerCase()}-${categoryKey}.pdf`);
}
