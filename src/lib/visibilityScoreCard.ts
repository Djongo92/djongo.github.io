// A "Wrapped"-style shareable PNG — the Visibility Score summarized for
// posting outside the app (LinkedIn, Slack, a partner deck), where a live
// dashboard link isn't useful. Drawn directly on a <canvas> rather than
// pulling in html2canvas (a real dependency for a DOM-to-image path) —
// same reasoning as battlePlanPdf.ts's own direct-drawing approach:
// full control, no extra library, no risk of the DOM-capture snapshotting
// something mid-animation.
import { CATEGORY_META, CATEGORY_ORDER, type CategoryKey } from "@/lib/visibilityCategories";

export interface ScoreCardAudit {
  display_name: string | null;
  audited_domain: string;
  market: string;
  total_score: number;
  performance_score: number;
  social_score: number;
  seo_authority_score: number;
  thought_leadership_score: number;
  reputation_score: number;
  percentile?: number | null;
  peer_count?: number;
}

const NAVY = "#121826";
const GOLD = "#b8893b";
const GOLD_LIGHT = "#d4b279";
const GREEN = "#109669";
const WHITE = "#ffffff";
const MUTED = "#9a9aa8";

// Tailwind's own 500-shade hex for each category color family — matches
// CATEGORY_META's color assignment exactly, so this card and the in-app
// category grid always agree on which color means which category.
const CATEGORY_HEX: Record<CategoryKey, string> = {
  performance: "#0ea5e9",
  social: "#f43f5e",
  seoAuthority: "#10b981",
  thoughtLeadership: "#f59e0b",
  reputation: "#8b5cf6",
};

const SCORE_FIELD: Record<CategoryKey, keyof ScoreCardAudit> = {
  performance: "performance_score",
  social: "social_score",
  seoAuthority: "seo_authority_score",
  thoughtLeadership: "thought_leadership_score",
  reputation: "reputation_score",
};

function blend(hex1: string, hex2: string, t: number): string {
  const c1 = parseInt(hex1.slice(1), 16);
  const c2 = parseInt(hex2.slice(1), 16);
  const r = Math.round(((c1 >> 16) & 255) * (1 - t) + ((c2 >> 16) & 255) * t);
  const g = Math.round(((c1 >> 8) & 255) * (1 - t) + ((c2 >> 8) & 255) * t);
  const b = Math.round((c1 & 255) * (1 - t) + (c2 & 255) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function downloadScoreCard(audit: ScoreCardAudit) {
  const W = 1080;
  // Sized to exactly what this fixed layout draws (eyebrow, firm name,
  // score, 5 category bars, footer) rather than a generic tall "story"
  // canvas — the category count is fixed, so there's no need to measure
  // content dynamically to avoid a dead-space gap before the footer.
  const H = 860;
  const scale = 2; // render at 2x for a crisp export regardless of screen DPI
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  // Faint concentric rings, same brand motif as the Battle Plan PDF cover —
  // pre-blended solid colors rather than canvas globalAlpha layering, so
  // this stays visually consistent with that other export's technique.
  ctx.lineWidth = 2;
  [[0.06, 260], [0.04, 340], [0.025, 420]].forEach(([t, r]) => {
    ctx.strokeStyle = blend(NAVY, GOLD, t);
    ctx.beginPath();
    ctx.arc(W - 60, H * 0.24, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  const margin = 64;

  // Eyebrow
  ctx.fillStyle = GOLD;
  ctx.fillRect(margin, margin, 90, 4);
  ctx.font = "600 15px Helvetica, Arial, sans-serif";
  ctx.fillStyle = GOLD_LIGHT;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("LEGALOS · VERIFIED VISIBILITY SCORE", margin, margin + 34);

  // Firm name — shrink to fit rather than overflow past the card edge or
  // (worse) collide with the score badge/percentile that comes right
  // after it, since a real firm name can run much longer than the demo's.
  const firmName = audit.display_name || audit.audited_domain;
  const maxNameWidth = W - margin * 2 - 40;
  let nameFontSize = 40;
  ctx.font = `400 ${nameFontSize}px Georgia, 'Times New Roman', serif`;
  while (ctx.measureText(firmName).width > maxNameWidth && nameFontSize > 22) {
    nameFontSize -= 2;
    ctx.font = `400 ${nameFontSize}px Georgia, 'Times New Roman', serif`;
  }
  ctx.fillStyle = WHITE;
  ctx.fillText(firmName, margin, margin + 100);

  ctx.font = "italic 20px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillText(`Market: ${audit.market}`, margin, margin + 134);

  // Big score
  const scoreY = margin + 260;
  ctx.font = "700 180px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = GREEN;
  ctx.fillText(`${Math.round(audit.total_score)}`, margin, scoreY);
  const scoreWidth = ctx.measureText(`${Math.round(audit.total_score)}`).width;
  ctx.font = "400 32px Helvetica, Arial, sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText("/ 200", margin + scoreWidth + 16, scoreY);

  // Peer position
  if (typeof audit.percentile === "number" && audit.peer_count && audit.peer_count > 0) {
    ctx.font = "400 24px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#e5e5ea";
    ctx.fillText(
      `Better than ${audit.percentile}% of ${audit.peer_count} peer firms`,
      margin, scoreY + 46,
    );
  }

  // Category bars
  let barY = scoreY + 110;
  const barW = W - margin * 2;
  const barH = 14;
  const gap = 54;
  ctx.textBaseline = "alphabetic";
  CATEGORY_ORDER.forEach((key) => {
    const meta = CATEGORY_META[key];
    const score = (audit[SCORE_FIELD[key]] as number) ?? 0;
    const pct = Math.max(0, Math.min(1, score / meta.max));

    ctx.font = "600 16px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#d0d0d8";
    ctx.fillText(meta.label.toUpperCase(), margin, barY);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(score * 10) / 10} / ${meta.max}`, margin + barW, barY);
    ctx.textAlign = "left";

    const trackY = barY + 12;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundedRect(ctx, margin, trackY, barW, barH, barH / 2);
    ctx.fill();

    ctx.fillStyle = CATEGORY_HEX[key];
    roundedRect(ctx, margin, trackY, Math.max(barH, barW * pct), barH, barH / 2);
    ctx.fill();

    barY += gap;
  });

  // Footer
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  ctx.font = "400 15px Helvetica, Arial, sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText(today, margin, H - margin);
  ctx.textAlign = "right";
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillText("EXTERNALLY VERIFIED, NOT SELF-SCORED", margin + barW, H - margin);
  ctx.textAlign = "left";

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `visibility-score-${slug}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
