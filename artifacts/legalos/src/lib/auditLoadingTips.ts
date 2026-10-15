export const AUDIT_LOADING_TIPS = [
  {
    title: "Performance earns attention first",
    body: "A faster first page load gives prospective clients fewer reasons to leave before they see your expertise.",
  },
  {
    title: "Named work beats generic claims",
    body: "Deal tombstones, case studies, and specific outcomes make a practice page more credible than broad capability lists.",
  },
  {
    title: "Consistent publishing compounds",
    body: "One bylined insight each month can build a stronger signal than a short burst of uncredited content.",
  },
  {
    title: "Directory strength should be visible",
    body: "A Chambers, Legal 500, or IFLR listing works harder when clients can find the proof on your own website.",
  },
  {
    title: "Your score stays private by default",
    body: "You will be able to review this audit in Uvid before deciding whether it belongs in the public Visibility Index.",
  },
] as const;

export function nextAuditLoadingTipIndex(currentIndex: number): number {
  return (currentIndex + 1) % AUDIT_LOADING_TIPS.length;
}