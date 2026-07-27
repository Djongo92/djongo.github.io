import { useMemo } from "react";
import type { WorkshopToolId } from "@/lib/handoff";
import { CATEGORY_TOOL_MAP, findWeakestCategoryTool } from "@/lib/categoryToolMap";

export interface CategoryScore {
  score: number;
  provenance: string;
}

export type InsightTone = "warning" | "opportunity" | "positive";
export type InsightAction =
  | { kind: "workshop"; toolId: WorkshopToolId }
  | { kind: "guidebook" }
  | { kind: "maturity" }
  | { kind: "rerun" }
  | { kind: "none" };

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  actionLabel: string;
  action: InsightAction;
}

const CATEGORY_META = CATEGORY_TOOL_MAP;

interface Params {
  categories: Record<string, CategoryScore> | null;
  siteHealthIssues: string[];
  maturity: { score: number; dimensions: { label: string; score: number }[] } | null;
  implementationScore: number;
  readChaptersCount: number;
  totalChapters: number;
  /** Senior-PM "instant first win": a zero-cost, one-checkbox +10 points, so it deserves priority over a generic weak-category insight. */
  gbpListed?: boolean;
}

/**
 * Pulls together the visibility score, site health, firm maturity, and
 * guidebook progress into one ranked feed. Capped at 5 — resist the urge
 * to show everything at once, per the "one recommendation, not a ranked
 * list" principle used elsewhere in this app, loosened slightly here
 * because this is an overview surface, not a single CTA.
 */
export function useCommandCenterInsights({
  categories, siteHealthIssues, maturity, implementationScore, readChaptersCount, totalChapters, gbpListed,
}: Params): Insight[] {
  return useMemo(() => {
    const insights: Insight[] = [];

    // The cheapest possible win: a free, one-checkbox +10 points. Surfaced
    // ahead of every other insight (unshift, not push) since nothing else
    // here costs zero effort and zero money.
    if (categories && gbpListed === false) {
      insights.unshift({
        id: "gbp-unclaimed",
        tone: "opportunity",
        title: "Claim your free Google Business Profile",
        body: "Worth 10 points, zero cost — just a checkbox on your next audit run.",
        actionLabel: "Claim it now",
        action: { kind: "rerun" },
      });
    }

    // Exactly one "weakest category" insight — ranked by absolute points
    // recoverable (max - score), not percentage. A category at 22/45 has
    // more real upside (23 points) than one at 9.5/20 (10.5 points) even
    // though the second one's percentage looks worse; percentage doesn't
    // move the 200-point total, points do. Shared with the sidebar/Monday
    // Brief "this week's move" via the same findWeakestCategoryTool() call
    // so the two surfaces can never disagree on which category is weakest.
    const weakest = findWeakestCategoryTool(categories);
    if (weakest) {
      insights.push({
        id: `category-${weakest.categoryKey}`,
        tone: "warning",
        title: `${weakest.categoryLabel} is your highest-leverage category`,
        body: `Scoring ${Math.round(weakest.score * 10) / 10} of ${weakest.max} points — ${Math.round(weakest.pointsRecoverable * 10) / 10} points still on the table, more than any other category.`,
        actionLabel: "Work on it in the Workshop",
        action: { kind: "workshop", toolId: weakest.toolId },
      });
    }

    if (categories) {
      for (const [key, cat] of Object.entries(categories)) {
        if (cat.provenance === "missing") continue;
        const meta = CATEGORY_META[key];
        if (!meta) continue;
        const pct = meta.max > 0 ? (cat.score / meta.max) * 100 : 0;
        if (pct >= 90) {
          insights.push({
            id: `category-${key}-strong`,
            tone: "positive",
            title: `${meta.label} is a real strength`,
            body: `Scoring ${Math.round(cat.score * 10) / 10} of ${meta.max} points — keep doing what's working here.`,
            actionLabel: "See the breakdown",
            action: { kind: "none" },
          });
        }
      }
    }

    for (const issue of siteHealthIssues) {
      insights.push({
        id: `sitehealth-${issue}`,
        tone: "warning",
        title: "Site health issue found",
        body: issue,
        actionLabel: "Review your site",
        action: { kind: "none" },
      });
    }

    if (maturity) {
      const weakest = [...maturity.dimensions].sort((a, b) => a.score - b.score)[0];
      if (weakest && weakest.score < 60) {
        insights.push({
          id: "maturity-weakest",
          tone: "opportunity",
          title: `${weakest.label} is your biggest maturity gap`,
          body: `Your Firm Maturity Score flagged this as the weakest of five dimensions at ${weakest.score}%.`,
          actionLabel: "Review your 30-day plan",
          action: { kind: "maturity" },
        });
      }
    } else {
      insights.push({
        id: "maturity-missing",
        tone: "opportunity",
        title: "You haven't run a Firm Maturity Score yet",
        body: "A 12-question diagnostic that maps your gaps to a tailored 30-day plan — takes about 3 minutes.",
        actionLabel: "Run the diagnostic",
        action: { kind: "maturity" },
      });
    }

    if (totalChapters > 0 && readChaptersCount / totalChapters < 0.3) {
      insights.push({
        id: "guidebook-progress",
        tone: "opportunity",
        title: "Most of the guidebook is still unread",
        body: `You've read ${readChaptersCount} of ${totalChapters} chapters. Each one maps directly to an action you can implement.`,
        actionLabel: "Continue reading",
        action: { kind: "guidebook" },
      });
    } else if (implementationScore < 40 && readChaptersCount > 0) {
      insights.push({
        id: "implementation-low",
        tone: "opportunity",
        title: "Low implementation rate on what you've read",
        body: `Only ${implementationScore}% of action items from chapters you've read are marked implemented.`,
        actionLabel: "Review your progress",
        action: { kind: "guidebook" },
      });
    }

    return insights.slice(0, 5);
  }, [categories, siteHealthIssues, maturity, implementationScore, readChaptersCount, totalChapters]);
}
