/**
 * The current reporting week's Monday and Sunday, for the Monday Brief's
 * header label. Deliberately spans the full week (not "Monday through
 * today") — the latter collapses to one identical date whenever the brief
 * is viewed on a Monday itself, which is exactly the bug this guards against.
 */
export function computeWeekRange(now: Date): { monday: Date; sunday: Date } {
  const diffToMonday = (now.getDay() + 6) % 7; // days since the most recent Monday (0 if today is Monday)
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  return { monday, sunday };
}

export function formatWeekRangeLabel(now: Date): string {
  const { monday, sunday } = computeWeekRange(now);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}
