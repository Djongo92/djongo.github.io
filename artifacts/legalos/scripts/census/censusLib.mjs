// Pure, IO-free helpers for the Serbia census onboarding:
//   census CSV → normalized firms → dedupe against the existing
//   market_directory_data state (replayed from migration SQL, the same
//   source of truth generate:firms uses) → a directory-expansion migration
//   + an audit manifest for scripts/census/run-census-audits.mjs.
//
// Everything here is deterministic and unit-tested in
// tests/census-ingest.test.ts — the IO wrappers (ingest-census.mjs,
// run-census-audits.mjs) stay thin on purpose.

// ---------------------------------------------------------------------------
// CSV parsing (RFC-4180-ish: quoted fields, "" escapes, CRLF or LF)
// ---------------------------------------------------------------------------

export function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const AUDIT_CATEGORIES = ["performance", "social", "seoAuthority", "thoughtLeadership", "reputation"];

/** Return the categories which were not measured on an audit row. */
export function missingAuditCategories(provenance) {
  const source = provenance && typeof provenance === "object" ? provenance : {};
  return AUDIT_CATEGORIES.filter((category) => source[category] === "missing");
}

/**
 * Summarise before/after provenance for the recovery sweep. Kept pure so the
 * driver and its reporting contract can be tested without a Supabase client.
 */
export function recoveryReport(before, after) {
  const beforeMissing = missingAuditCategories(before);
  const afterMissing = missingAuditCategories(after);
  return {
    previouslyMissing: beforeMissing,
    stillMissing: afterMissing,
    recovered: beforeMissing.filter((category) => !afterMissing.includes(category)),
  };
}

function headerKey(cell) {
  return cell
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NAME_HEADERS = ["name", "firm", "firma", "naziv", "firm name", "law firm", "kancelarija", "company"];
const URL_HEADERS = ["url", "website", "web", "site", "team", "team url", "team page", "link", "sajt", "stranica", "web sajt"];
const LAWYER_HEADERS = [
  "lawyers", "attorneys", "lawyer", "lawyer count", "number of lawyers", "headcount",
  "broj advokata", "advokata", "advokati", "zaposlenih", "size", "broj zaposlenih",
];

function pickColumn(headers, candidates) {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h === candidate);
    if (idx >= 0) return idx;
  }
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseLawyerCount(raw) {
  if (raw == null) return null;
  const m = String(raw).match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parses the census CSV into rows. Headers are matched fuzzily (English or
 * Serbian, exact-first then substring). Rows without a name are dropped.
 * @returns {{ rows: Array<{rowNumber:number, name:string, teamUrl:string|null, lawyers:number|null}>, warnings: string[] }}
 */
export function parseCensusCsv(text) {
  const warnings = [];
  const grid = parseCsv(text.replace(/^/, "")); // strip BOM
  if (grid.length < 2) return { rows: [], warnings: ["CSV has no data rows"] };
  const headers = grid[0].map(headerKey);
  const nameCol = pickColumn(headers, NAME_HEADERS);
  const urlCol = pickColumn(headers, URL_HEADERS);
  const lawyersCol = pickColumn(headers, LAWYER_HEADERS);
  if (nameCol < 0) warnings.push(`no name column recognized in headers: ${grid[0].join(", ")}`);
  if (urlCol < 0) warnings.push("no URL column recognized — all rows will be skipped from the audit manifest");
  if (lawyersCol < 0) warnings.push("no lawyer-count column recognized — firm sizes will be null");

  const rows = [];
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const name = nameCol >= 0 ? (cells[nameCol] ?? "").trim() : "";
    if (!name) continue;
    rows.push({
      rowNumber: i + 1, // 1-based including the header, matches spreadsheet view
      name,
      teamUrl: urlCol >= 0 ? (cells[urlCol] ?? "").trim() || null : null,
      lawyers: lawyersCol >= 0 ? parseLawyerCount(cells[lawyersCol]) : null,
    });
  }
  return { rows, warnings };
}

// ---------------------------------------------------------------------------
// Domain + name normalization
// ---------------------------------------------------------------------------

// Team URLs that point at a platform page instead of a firm site — these
// can't carry a web-presence audit.
const GENERIC_HOSTS = new Set([
  "linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com",
  "google.com", "maps.app.goo.gl", "goo.gl", "youtube.com",
]);

/**
 * Extracts a bare audit-able domain from a census URL (which is usually a
 * deep link like https://www.firm.rs/en/our-team). Returns { domain } or
 * { error }.
 */
export function normalizeDomain(raw) {
  if (!raw || typeof raw !== "string") return { error: "empty url" };
  let s = raw.trim();
  if (!s) return { error: "empty url" };
  if (/^mailto:/i.test(s)) return { error: "mailto link" };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s;
  let u;
  try {
    u = new URL(s);
  } catch {
    return { error: "unparseable url" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "non-http url" };
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!host || !host.includes(".")) return { error: "not a hostname" };
  if (GENERIC_HOSTS.has(host)) return { error: "platform page, not a firm site" };
  return { domain: host };
}

// Legal-form and boilerplate tokens removed before matching — Serbian
// suffixes included (d.o.o., a.d., o.a.d., "advokatska kancelarija").
const NAME_STOP_TOKENS = new Set([
  "d", "o", "a", "doo", "ad", "oad", "aod", "dooel", "llc", "ltd", "gmbh",
  "law", "office", "offices", "firm", "legal", "attorneys", "attorney", "solicitors",
  "kancelarija", "advokatska", "advokati", "odvjetnicka", "pravna",
  "partners", "partneri", "partnera", "and", "i", "the", "und",
  // "X in cooperation with Y" is how network-affiliated Serbian firms style
  // themselves — the affiliation words must not pollute the match key.
  "in", "with", "cooperation", "saradnji",
]);

/**
 * Dedupe key for firm names: lowercase, đ→d (đ has no NFD decomposition),
 * diacritics stripped, punctuation → space, boilerplate tokens dropped.
 * "Karanović & Partners" and "Karanovic i partneri d.o.o." both reduce to
 * "karanovic".
 */
export function firmNameKey(name) {
  const s = name
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/&|\+/g, " ")
    .replace(/[^a-z0-9 ]/g, " ");
  return s
    .split(/\s+/)
    .filter((t) => t && !NAME_STOP_TOKENS.has(t))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Classification (peer group + firm type + firm size)
// ---------------------------------------------------------------------------

// Big-4-style consultancies with legal arms.
const CONSULTANCY_RE = /(deloitte|pricewaterhousecoopers|\bpwc\b|\bkpmg\b|ernst\s*(and|&)\s*young|\bey\b)/i;

// International networks with Belgrade offices, keyed by normalized tokens
// (matches how firmNameKey reduces the census name). Deliberately
// conservative: the seeded 44 show local partnerships of global networks
// typed "R" (Schoenherr) as often as "I" (CMS), so name-matching here only
// catches unambiguous global brands; everything else falls through to the
// size heuristic and is human-reviewed in the ingest summary.
const INTL_NETWORK_KEYS = [
  "schoenherr", "wolf theiss", "cms", "kinstellar", "dla piper", "dentons",
  "baker mckenzie", "white case", "linklaters", "clifford chance", "freshfields",
  "allen overy", "hogan lovells", "gide loyrette", "taylor wessing", "noerr",
  "dorda", "eversheds", "squire patton boggs", "cobalt", "act legal",
  // Grata: global network (HQ Almaty, 20+ countries); initially typed local
  // as a conservative call, reversed by the 20260812010000 retype migration.
  "grata",
];
// Normalized to firmNameKey token sets — a plain substring test against the
// raw keys would be dead code for entries like "act legal" (firmNameKey
// strips the boilerplate token "legal", so the key is just "act").
const INTL_NETWORK_TOKENS = INTL_NETWORK_KEYS.map((n) => firmNameKey(n).split(" ").filter(Boolean));

// Mirrors _shared/marketVisibilityConfig.ts FIRM_TYPE_TO_PEER_GROUP
// (duplicated: Deno edge code can't be imported from Node scripts).
export const FIRM_TYPE_TO_PEER_GROUP = { I: "international", R: "regional", L: "local", C: "consultancy" };

// A firm this size in the Serbian market is a mid/regional player rather
// than a boutique — heuristic for firms the seed set doesn't already type.
export const REGIONAL_LAWYER_THRESHOLD = 20;

export function firmSizeFromLawyers(lawyers) {
  if (typeof lawyers !== "number" || !Number.isFinite(lawyers) || lawyers <= 0) return null;
  if (lawyers === 1) return "solo";
  if (lawyers <= 10) return "boutique_2_10";
  if (lawyers <= 50) return "mid_11_50";
  if (lawyers <= 200) return "large_51_200";
  return "enterprise_200_plus";
}

/**
 * @returns {{ firmType: "I"|"R"|"L"|"C", peerGroup: string, firmSize: string|null }}
 */
export function classifyFirm({ name, lawyers }) {
  const firmSize = firmSizeFromLawyers(lawyers);
  if (CONSULTANCY_RE.test(name)) return { firmType: "C", peerGroup: "consultancy", firmSize };
  const key = firmNameKey(name);
  const keyTokens = new Set(key.split(" ").filter(Boolean));
  if (key && INTL_NETWORK_TOKENS.some((tokens) => tokens.length > 0 && tokens.every((t) => keyTokens.has(t)))) {
    return { firmType: "I", peerGroup: "international", firmSize };
  }
  if (typeof lawyers === "number" && lawyers >= REGIONAL_LAWYER_THRESHOLD) {
    return { firmType: "R", peerGroup: "regional", firmSize };
  }
  return { firmType: "L", peerGroup: "local", firmSize };
}

// ---------------------------------------------------------------------------
// Directory state replayed from migration SQL (mirrors generate:firms' source
// of truth — no live DB access from scripts)
// ---------------------------------------------------------------------------

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, "");
}

// Splits on a separator occurring at paren-depth 0 outside single-quoted
// strings ('' is the SQL escape).
function splitTopLevel(s, separator) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      current += c;
      if (c === "'") {
        if (s[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }
    if (c === "'") {
      inString = true;
      current += c;
    } else if (c === "(") {
      depth++;
      current += c;
    } else if (c === ")") {
      depth--;
      current += c;
    } else if (c === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  if (current.trim() !== "") parts.push(current);
  return parts;
}

// "'value'::jsonb" → "value"; "''" escapes unescaped. Non-strings pass
// through trimmed.
function cleanSqlValue(raw) {
  const v = raw.trim();
  const m = v.match(/^'((?:[^']|'')*)'(?:::[a-z_]+(?:\[\])?)?$/i);
  if (m) return m[1].replace(/''/g, "'");
  // Bare NULL literal → null, or a replayed migration hands downstream code
  // the string "NULL" and a re-ingest treats it as a real (junk) domain.
  if (/^null$/i.test(v)) return null;
  return v;
}

// Extracts top-level "( ... )" tuples from a VALUES list, quote-aware.
function extractTuples(valuesText) {
  const tuples = [];
  let depth = 0;
  let inString = false;
  let start = -1;
  for (let i = 0; i < valuesText.length; i++) {
    const c = valuesText[i];
    if (inString) {
      if (c === "'") {
        if (valuesText[i + 1] === "'") i++;
        else inString = false;
      }
      continue;
    }
    if (c === "'") inString = true;
    else if (c === "(") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (c === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        tuples.push(valuesText.slice(start, i));
        start = -1;
      }
    }
  }
  return tuples;
}

/**
 * Extracts the directory mutations from one migration file: INSERT ...
 * ON CONFLICT DO NOTHING rows and UPDATE ... SET firm_domain backfills.
 * Returns them separately because UPDATEs in a LATER file target rows
 * inserted by an earlier one — buildDirectoryState applies them in
 * chronological order.
 * @returns {{ inserts: Array<{firmName, firmDomain, firmType}>, updates: Array<{firmName, firmDomain}>, retypes: Array<{firmDomain, firmType}>, deletes: Array<{firmName}> }}
 *   (market='serbia' rows only)
 */
export function parseDirectorySql(sql) {
  const text = stripSqlComments(sql);
  const inserts = [];
  const updates = [];
  const retypes = [];
  const deletes = [];

  const insertRe =
    /INSERT\s+INTO\s+(?:public\.)?market_directory_data\s*\(([^)]*)\)\s*VALUES([\s\S]*?)(?:\bON\s+CONFLICT\b[\s\S]*?;|;)/gi;
  for (const match of text.matchAll(insertRe)) {
    const columns = match[1].split(",").map((c) => c.trim().toLowerCase());
    const marketIdx = columns.indexOf("market");
    const nameIdx = columns.indexOf("firm_name");
    const typeIdx = columns.indexOf("firm_type");
    const domainIdx = columns.indexOf("firm_domain");
    if (nameIdx < 0) continue;
    for (const tuple of extractTuples(match[2])) {
      const values = splitTopLevel(tuple, ",").map(cleanSqlValue);
      if (marketIdx >= 0 && values[marketIdx] !== "serbia") continue;
      const firmName = values[nameIdx];
      if (!firmName) continue;
      // ON CONFLICT (market, firm_name) DO NOTHING → first insert wins.
      if (inserts.some((r) => r.firmName === firmName)) continue;
      inserts.push({
        firmName,
        firmDomain: domainIdx >= 0 ? values[domainIdx] || null : null,
        firmType: typeIdx >= 0 ? values[typeIdx] || null : null,
      });
    }
  }

  // Two UPDATE shapes must parse: the hand-written enrichment migrations end
  // after firm_name = '…'; — renderMigration's generated backfills add the
  // non-destructive NULL-only predicate. Replaying a generated migration
  // without recognizing that shape silently loses every backfilled domain on
  // the next ingest pass (round-trip regression test pins this).
  const updateRe =
    /UPDATE\s+(?:public\.)?market_directory_data\s+SET\s+firm_domain\s*=\s*'((?:[^']|'')*)'\s*WHERE\s+market\s*=\s*'serbia'\s+AND\s+firm_name\s*=\s*'((?:[^']|'')*)'(?:\s+AND\s+\(\s*firm_domain\s+IS\s+NULL\s+OR\s+firm_domain\s*=\s*''\s*\))?\s*;/gi;
  for (const match of text.matchAll(updateRe)) {
    updates.push({ firmDomain: match[1].replace(/''/g, "'"), firmName: match[2].replace(/''/g, "'") });
  }

  // Retype corrections (e.g. 20260812010000_census_network_retype.sql): a
  // one-off firm_type fix by domain must survive replay, or the next ingest
  // silently regresses the corrected firms back to their mistyped peer group.
  const retypeRe =
    /UPDATE\s+(?:public\.)?market_directory_data\s+SET\s+firm_type\s*=\s*'([IRLC])'\s*WHERE\s+market\s*=\s*'serbia'\s+AND\s+firm_domain\s+IN\s*\(([^)]*)\)[^;]*;/gi;
  for (const match of text.matchAll(retypeRe)) {
    const firmType = match[1];
    for (const raw of splitTopLevel(match[2], ",")) {
      const firmDomain = cleanSqlValue(raw);
      if (firmDomain) retypes.push({ firmDomain, firmType });
    }
  }

  // Duplicate-merge corrections (e.g.
  // 20260813230000_merge_act_legal_duplicate.sql): a constrained single-row
  // delete must survive replay, or the next ingest re-appends the merged-away
  // firm from directory state and the leaderboard double-counts it. Only the
  // (market, firm_name) equality form is honored — anything broader fails
  // loudly by not parsing rather than guessing at row identity.
  const deleteRe =
    /DELETE\s+FROM\s+(?:public\.)?market_directory_data\s+WHERE\s+market\s*=\s*'serbia'\s+AND\s+firm_name\s*=\s*'((?:[^']|'')*)'\s*;/gi;
  for (const match of text.matchAll(deleteRe)) {
    deletes.push({ firmName: match[1].replace(/''/g, "'") });
  }

  return { inserts, updates, retypes, deletes };
}

/**
 * Replays chronologically sorted migration files into directory state.
 * @param files Array<{ name, sql }>
 * @returns Array<{ firmName, firmDomain, firmType }> in first-insert order
 */
export function buildDirectoryState(files) {
  const rows = [];
  for (const file of files) {
    const { inserts, updates, retypes, deletes } = parseDirectorySql(file.sql);
    for (const row of inserts) {
      if (!rows.some((r) => r.firmName === row.firmName)) rows.push({ ...row });
    }
    for (const update of updates) {
      const row = rows.find((r) => r.firmName === update.firmName);
      if (row) row.firmDomain = update.firmDomain;
    }
    for (const retype of retypes) {
      const row = rows.find((r) => r.firmDomain === retype.firmDomain);
      if (row) row.firmType = retype.firmType;
    }
    for (const del of deletes) {
      const i = rows.findIndex((r) => r.firmName === del.firmName);
      if (i !== -1) rows.splice(i, 1);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Ingest planning
// ---------------------------------------------------------------------------

// Hand-verified exceptions for the August 2026 Serbia census, keyed by
// firmNameKey-normalized name: rows whose census URL is NOT the firm's own
// site, so neither the directory row nor the audit may use it.
const CENSUS_OVERRIDES = new Map([
  // "Law Office Kosic" (key: kosic) is listed at Dubravka Kosić's partner
  // profile on Horizons Advisory's site — auditing horizons-advisory.com
  // under her firm's name would attribute another entity's web presence.
  ["kosic", { action: "directory-only", reason: "census URL is a partner profile on another entity's site (horizons-advisory.com)" }],
]);

function findDirectoryMatch(directoryRows, { name, domain }) {
  if (domain) {
    const byDomain = directoryRows.find((r) => r.firmDomain === domain);
    if (byDomain) return { row: byDomain, by: "domain" };
  }
  const key = firmNameKey(name);
  if (!key) return null;
  const exact = directoryRows.find((r) => firmNameKey(r.firmName) === key);
  if (exact) return { row: exact, by: "name" };
  // Containment covers seed names with parenthetical local partners, e.g.
  // "Schoenherr (Moravčević Vojnović and Partners)" vs census "Schoenherr".
  // Minimum length guards against single generic tokens matching everything.
  if (key.length >= 5) {
    const contained = directoryRows.find((r) => {
      const dirKey = firmNameKey(r.firmName);
      return dirKey.length >= 5 && (dirKey.includes(key) || key.includes(dirKey));
    });
    if (contained) return { row: contained, by: "name-partial" };
  }
  // Token overlap catches the same firm listed under a DIFFERENT domain,
  // e.g. census "Moravčević Vojnović i Partneri in cooperation with
  // Schoenherr" (schoenherr.eu) vs the seed's schoenherr.rs — substring
  // matching misses reordered tokens. Requires ≥2 shared surname tokens
  // covering most of the smaller key, so two firms sharing one common
  // surname never merge.
  const keyTokens = new Set(key.split(" "));
  let best = null;
  for (const r of directoryRows) {
    const dirTokens = new Set(firmNameKey(r.firmName).split(" ").filter(Boolean));
    if (dirTokens.size === 0) continue;
    const shared = [...keyTokens].filter((t) => dirTokens.has(t)).length;
    const coversEnough = shared >= 0.6 * Math.min(keyTokens.size, dirTokens.size);
    if (shared >= 2 && coversEnough) {
      if (!best || shared > best.shared) best = { row: r, shared };
    }
  }
  if (best) return { row: best.row, by: "name-tokens" };
  return null;
}

/**
 * Plans the ingest: which census rows enrich existing directory firms, which
 * insert new ones, and the full audit manifest (census + already-directory
 * firms with domains — the batch rates the whole market, not just new rows).
 *
 * @param censusRows from parseCensusCsv
 * @param directoryRows from buildDirectoryState
 */
export function planIngest(censusRows, directoryRows) {
  const inserts = [];
  const enriches = [];
  const matches = [];
  const skipped = [];
  const warnings = [];
  /** @type {Array<{domain: string, displayName: string, peerGroup: string, firmSize: string|null, source: string}>} */
  const manifest = [];
  const manifestDomains = new Set();
  const seenCensusKeys = new Set();

  for (const row of censusRows) {
    const key = firmNameKey(row.name);
    if (key && seenCensusKeys.has(key)) {
      skipped.push({ name: row.name, reason: `duplicate of census row above (row ${row.rowNumber})` });
      continue;
    }
    if (key) seenCensusKeys.add(key);

    const override = key ? CENSUS_OVERRIDES.get(key) : undefined;
    if (override?.action === "directory-only") {
      const { firmType } = classifyFirm({ name: row.name, lawyers: row.lawyers });
      inserts.push({ firmName: row.name, firmDomain: null, firmType });
      skipped.push({ name: row.name, reason: override.reason });
      continue;
    }

    const { domain, error } = normalizeDomain(row.teamUrl ?? "");
    const match = findDirectoryMatch(directoryRows, { name: row.name, domain: domain ?? null });

    if (match) {
      matches.push({ censusName: row.name, matchedTo: match.row.firmName, by: match.by });
      if (domain && !match.row.firmDomain) {
        enriches.push({ firmName: match.row.firmName, firmDomain: domain });
        match.row.firmDomain = domain;
      }
      const peerGroup = FIRM_TYPE_TO_PEER_GROUP[match.row.firmType] ?? classifyFirm({ name: row.name, lawyers: row.lawyers }).peerGroup;
      if (match.row.firmDomain && !manifestDomains.has(match.row.firmDomain)) {
        manifestDomains.add(match.row.firmDomain);
        manifest.push({
          domain: match.row.firmDomain,
          displayName: match.row.firmName,
          peerGroup,
          firmSize: firmSizeFromLawyers(row.lawyers),
          source: "census-match",
        });
      } else if (!match.row.firmDomain) {
        skipped.push({ name: row.name, reason: `matched "${match.row.firmName}" but neither row has a website domain` });
      }
      continue;
    }

    const { firmType, peerGroup, firmSize } = classifyFirm({ name: row.name, lawyers: row.lawyers });
    inserts.push({ firmName: row.name, firmDomain: domain ?? null, firmType });
    if (domain) {
      if (!manifestDomains.has(domain)) {
        manifestDomains.add(domain);
        manifest.push({ domain, displayName: row.name, peerGroup, firmSize, source: "census-new" });
      }
    } else {
      skipped.push({ name: row.name, reason: `no audit-able domain (${error ?? "no url"}) — directory row only` });
    }
  }

  // Directory firms absent from the census still belong on the leaderboard.
  for (const dirRow of directoryRows) {
    if (!dirRow.firmDomain || manifestDomains.has(dirRow.firmDomain)) continue;
    manifestDomains.add(dirRow.firmDomain);
    manifest.push({
      domain: dirRow.firmDomain,
      displayName: dirRow.firmName,
      peerGroup: FIRM_TYPE_TO_PEER_GROUP[dirRow.firmType] ?? "local",
      firmSize: null,
      source: "directory",
    });
  }

  if (inserts.some((r) => !r.firmName)) warnings.push("an insert row has an empty firm name — check the CSV");
  return { inserts, enriches, matches, skipped, warnings, manifest };
}

// ---------------------------------------------------------------------------
// Migration rendering
// ---------------------------------------------------------------------------

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Renders the directory-expansion migration. Inserts use ON CONFLICT DO
 * NOTHING (the unique key is market+firm_name and census spellings can
 * differ from seed spellings even for the same firm — those pairs are
 * resolved as `enriches` instead). Enrich UPDATEs only fill NULL/empty
 * domains, never overwrite a curated one.
 */
export function renderMigration(plan) {
  const sections = [
    "// Serbia census directory expansion — generated by scripts/census/ingest-census.mjs".replace(/^\/\//, "--"),
    "-- Rows: new census firms inserted; matched seed firms get their domain",
    "-- backfilled only where the curated seed left it empty. Scores/rankings",
    "-- (chambers/legal500/iflr1000) are untouched — census rows start empty",
    "-- and earn directory data through the normal curation path.",
    "",
  ];

  if (plan.inserts.length > 0) {
    sections.push("INSERT INTO public.market_directory_data (market, firm_name, firm_domain, firm_type)");
    sections.push("VALUES");
    const tuples = plan.inserts.map(
      (r) =>
        `  ('serbia', ${sqlString(r.firmName)}, ${r.firmDomain ? sqlString(r.firmDomain) : "NULL"}, ${r.firmType ? sqlString(r.firmType) : "NULL"})`,
    );
    sections.push(tuples.join(",\n") + "\nON CONFLICT (market, firm_name) DO NOTHING;");
    sections.push("");
  }

  if (plan.enriches.length > 0) {
    sections.push("-- Domain backfill for seed firms the census matched (never overwrites).");
    for (const e of plan.enriches) {
      sections.push(
        `UPDATE public.market_directory_data SET firm_domain = ${sqlString(e.firmDomain)} WHERE market = 'serbia' AND firm_name = ${sqlString(e.firmName)} AND (firm_domain IS NULL OR firm_domain = '');`,
      );
    }
    sections.push("");
  }

  return sections.join("\n");
}
