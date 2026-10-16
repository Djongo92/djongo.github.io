// Pure firm-checker classification, shared by the FirmChecker component and
// the node --test regression suite (hence .mjs, not .ts).
//
// The scored/benchmarked pool (SCORED_FIRMS, the histogram, percentile
// claims) is the PUBLISHED audit pool. The tracked-firm directory can be a
// strict superset of it: firms listed in unscoredTrackedFirms.json are in
// the directory but have no published audit yet, and must never be described
// as scored/benchmarked. check:cohort enforces that every other tracked firm
// IS published.

export function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesName(q, name) {
  const n = normalize(name);
  if (n.includes(q) || q.includes(n)) return true;
  // token overlap: every query token present in the name
  const qTokens = q.split(' ').filter(t => t.length > 2);
  return qTokens.length > 0 && qTokens.every(t => n.includes(t));
}

/**
 * Classify a checker query.
 * @param query        user input
 * @param rankedFirms  published top-N leader rows ({ name, ... })
 * @param trackedFirms directory rows ({ name, aliases? })
 * @param unscoredNames Set/array of tracked firm names with NO published audit
 * @returns {{kind:'ranked',firm}|{kind:'scored',name:string}|{kind:'unscored',name:string}|null}
 */
export function classifyFirm(query, rankedFirms, trackedFirms, unscoredNames) {
  const q = normalize(query);
  if (q.length < 3) return null;
  const unscored = new Set([...unscoredNames]);

  const ranked = rankedFirms.find(f => matchesName(q, f.name));
  if (ranked) return { kind: 'ranked', firm: ranked };

  const tracked = trackedFirms.find(
    f => matchesName(q, f.name) || (f.aliases ?? []).some(a => matchesName(q, a)),
  );
  if (!tracked) return null;

  // A tracked firm may correspond to a published top-N entry under a
  // different spelling (e.g. "Kinstellar (SOG)" vs "SOG Law").
  const asRanked = rankedFirms.find(
    r =>
      matchesName(normalize(r.name), tracked.name) ||
      (tracked.aliases ?? []).some(a => matchesName(normalize(r.name), a)),
  );
  if (asRanked) return { kind: 'ranked', firm: asRanked };

  // In the directory but no published audit: NOT part of the scored pool.
  if (unscored.has(tracked.name)) return { kind: 'unscored', name: tracked.name };

  return { kind: 'scored', name: tracked.name };
}
