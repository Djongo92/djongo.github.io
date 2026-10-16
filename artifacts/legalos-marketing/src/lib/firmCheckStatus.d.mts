export function normalize(s: string): string;
export function matchesName(q: string, name: string): boolean;
export function classifyFirm(
  query: string,
  rankedFirms: readonly { name: string }[],
  trackedFirms: readonly { name: string; aliases?: string[] }[],
  unscoredNames: Iterable<string>,
):
  | { kind: 'ranked'; firm: any }
  | { kind: 'scored'; name: string }
  | { kind: 'unscored'; name: string }
  | null;
