#!/usr/bin/env node
// Regenerates src/data/trackedFirms.ts from the Uvid Supabase seed
// migrations — the same source of truth the app's benchmark uses.
//
// It replays every migration in order and interprets the FINAL state of
// public.market_directory_data for market = 'serbia':
//   - INSERT ... VALUES rows add firms (only rows whose market is 'serbia')
//   - UPDATE ... SET firm_name = 'New' ... WHERE ... firm_name = 'Old' renames
//   - DELETE ... WHERE firm_name = 'X' / firm_name IN (...) removes
// so adding, renaming, or removing a firm in a migration updates the
// marketing-site firm checker automatically on the next dev/build run.
//
// Human-curated aliases live in src/data/firmAliases.json and are merged in.
// An alias entry whose firm name no longer exists in the final state makes
// this script fail loudly instead of silently dropping it.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKET = "serbia";
const unq = s => s.replace(/''/g, "'");

/**
 * Replay `market_directory_data` statements from migration SQL contents
 * (given in chronological order) and return the final list of firm names
 * for the given market, in first-insertion order.
 */
/** Full replay: names in insertion order + firm_type per name. */
export function computeFirmsWithTypes(sqlContents, market = MARKET) {
  const names = []; // insertion-ordered
  const types = new Map(); // name → firm_type ('I'|'R'|'L'|'C') or null
  const has = n => names.includes(n);

  // Split into statements that touch market_directory_data.
  const stmtRe = /(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?market_directory_data\b[\s\S]*?;/gi;

  for (const sql of sqlContents) {
    for (const m of sql.matchAll(stmtRe)) {
      const stmt = m[0];
      const kind = m[1].toUpperCase().replace(/\s+/g, " ");

      if (kind === "INSERT INTO") {
        // Column order: the seed inserts list `market` first and `firm_name`
        // second; verify against the column list instead of assuming.
        const cols = stmt.match(/market_directory_data\s*\(([^)]*)\)/i)?.[1]
          ?.split(",").map(c => c.trim().toLowerCase()) ?? [];
        const mi = cols.indexOf("market");
        const ni = cols.indexOf("firm_name");
        if (mi === -1 || ni === -1) continue; // insert not touching firm rows
        const ti = cols.indexOf("firm_type");
        const values = stmt.slice(stmt.search(/VALUES/i));
        // Each row: ( 'a', 'b', NULL, ... ) — quoted literals AND bare NULLs,
        // position-preserving (census migration rows use NULL firm_domain).
        for (const row of values.matchAll(/\(((?:(?:\s*'(?:[^']|'')*'|\s*NULL)\s*,?)+)/gi)) {
          const lits = [...row[1].matchAll(/'((?:[^']|'')*)'|(NULL)/gi)].map(x => (x[2] ? null : unq(x[1])));
          const rowMarket = lits[mi];
          const name = lits[ni];
          if (rowMarket === market && name && !has(name)) {
            names.push(name);
            types.set(name, ti >= 0 ? lits[ti] ?? null : null);
          }
        }
      } else if (kind === "UPDATE") {
        const set = stmt.match(/SET[\s\S]*?(?=WHERE|;)/i)?.[0] ?? "";
        const where = stmt.match(/WHERE[\s\S]*?;/i)?.[0] ?? "";
        const newName = set.match(/firm_name\s*=\s*'((?:[^']|'')*)'/i)?.[1];
        const oldName = where.match(/firm_name\s*=\s*'((?:[^']|'')*)'/i)?.[1];
        const whereMarket = where.match(/market\s*=\s*'((?:[^']|'')*)'/i)?.[1];
        if (whereMarket && unq(whereMarket) !== market) continue;
        if (newName && oldName) {
          const i = names.indexOf(unq(oldName));
          if (i !== -1) {
            names[i] = unq(newName);
            types.set(unq(newName), types.get(unq(oldName)) ?? null);
            types.delete(unq(oldName));
          }
        }
      } else if (kind === "DELETE FROM") {
        const where = stmt.match(/WHERE[\s\S]*?;/i)?.[0] ?? "";
        const whereMarket = where.match(/market\s*=\s*'((?:[^']|'')*)'/i)?.[1];
        if (whereMarket && unq(whereMarket) !== market) continue;
        const inList = where.match(/firm_name\s+IN\s*\(([\s\S]*?)\)/i)?.[1];
        const single = where.match(/firm_name\s*=\s*'((?:[^']|'')*)'/i)?.[1];
        const doomed = inList
          ? [...inList.matchAll(/'((?:[^']|'')*)'/g)].map(x => unq(x[1]))
          : single != null ? [unq(single)] : [];
        for (const d of doomed) {
          const i = names.indexOf(d);
          if (i !== -1) names.splice(i, 1);
          types.delete(d);
        }
      }
    }
  }
  return { names, types };
}

/** Names-only view kept for existing callers/tests. */
export function computeFirms(sqlContents, market = MARKET) {
  return computeFirmsWithTypes(sqlContents, market).names;
}

// --- CLI entry point ---------------------------------------------------------
function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = resolve(here, "../../legalos/supabase/migrations");
  const aliasesPath = resolve(here, "../src/data/firmAliases.json");
  const outPath = resolve(here, "../src/data/trackedFirms.ts");

  const files = readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  const { names, types } = computeFirmsWithTypes(files.map(f => readFileSync(join(migrationsDir, f), "utf8")));

  if (names.length === 0) {
    console.error(`generate-tracked-firms: no ${MARKET} market_directory_data rows found in ${migrationsDir}`);
    process.exit(1);
  }

  const aliasMap = JSON.parse(readFileSync(aliasesPath, "utf8"));
  delete aliasMap._comment;
  const unknown = Object.keys(aliasMap).filter(n => !names.includes(n));
  if (unknown.length > 0) {
    console.error(
      `generate-tracked-firms: firmAliases.json references firm names not present in the final seed state:\n  - ${unknown.join("\n  - ")}\nUpdate or remove these alias entries.`,
    );
    process.exit(1);
  }

  const esc = s => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const rows = names.map(name => {
    const aliases = aliasMap[name];
    const ft = types.get(name);
    const ftPart = ft ? `, firmType: '${ft}'` : "";
    return aliases
      ? `  { name: '${esc(name)}'${ftPart}, aliases: [${aliases.map(a => `'${esc(a)}'`).join(", ")}] },`
      : `  { name: '${esc(name)}'${ftPart} },`;
  });

  writeFileSync(
    outPath,
    `// AUTO-GENERATED by scripts/generate-tracked-firms.mjs — do not edit by hand.
// Source of truth: artifacts/legalos/supabase/migrations (market_directory_data
// inserts/updates/deletes for market = '${MARKET}', replayed in order).
// Aliases: src/data/firmAliases.json (hand-maintained).
// Regenerate: pnpm run generate:firms (also runs automatically before dev/build).

export interface TrackedFirm {
  name: string;
  /** Directory firm_type: I=international, R=regional, L=local, C=consultancy */
  firmType?: 'I' | 'R' | 'L' | 'C';
  aliases?: string[];
}

export const TRACKED_FIRMS: TrackedFirm[] = [
${rows.join("\n")}
];
`,
  );

  console.log(`generate-tracked-firms: wrote ${names.length} firms to src/data/trackedFirms.ts`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
