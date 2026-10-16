// Schema-drift check against the LIVE hosted Supabase database.
//
// Task background: production silently missed a migration (firm_roles —
// access_expires_at, widened role check, firm_invites.role). There is no
// migration ledger in prod (migrations are applied ad hoc via the Management
// API), so the deployed identity resolver's membership query errored on every
// call for days with zero signal. This check makes that class of failure loud:
//
//   1. STRUCTURE: parse every migration in supabase/migrations/ into the
//      schema it declares (public tables + their columns, including ALTER
//      TABLE ADD/DROP COLUMN and DROP TABLE across files), then assert every
//      declared table and column actually exists in the live database via
//      information_schema (service-level Management API SQL — RLS can't mask
//      a missing column here).
//   2. LEDGER: assert supabase_migrations.schema_migrations exists and lists
//      every local migration version. Running with --seed-ledger creates the
//      ledger and backfills any missing versions (used once to bootstrap;
//      afterwards a missing version means someone shipped a migration file
//      without applying+recording it — exactly the drift we want to catch).
//
// Run:
//   pnpm --filter @workspace/legalos run check:schema-drift
//   node tests/schema-drift-check.mjs --seed-ledger   (bootstrap/repair ledger)
//
// Env: VITE_SUPABASE_URL (non-secret) and SUPABASE_ACCESS_TOKEN (secret).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MGMT_API = "https://api.supabase.com/v1/projects";

/** Run one service-level SQL statement through the Management API. */
async function runSql(projectRef, accessToken, query) {
  const resp = await fetch(`${MGMT_API}/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) throw new Error(`Management API query failed: HTTP ${resp.status} — ${await resp.text()}`);
  return resp.json();
}

// ── Migration SQL parsing ────────────────────────────────────────────────────

/** Strip -- line comments and /* *\/ block comments so column extraction
 * never picks up words from prose. String literals in migrations don't
 * contain "--" sequences we care about; this is a deliberate, documented
 * simplification — a false "missing column" fails loudly and is easy to see. */
export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/** Split a CREATE TABLE body on top-level commas (paren-depth aware, so
 * CHECK (a IN ('x','y')) and NUMERIC(10,2) don't split a definition). */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0, current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(current); current = ""; }
    else current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

const TABLE_CONSTRAINT_KEYWORDS = new Set([
  "constraint", "primary", "unique", "check", "foreign", "exclude", "like",
]);

const unquote = (ident) => ident.replace(/^"|"$/g, "").toLowerCase();

/**
 * Parse one migration file's SQL, mutating `tables` — a Map of
 * tableName → Set of column names — for the public schema.
 * Handles: CREATE TABLE [IF NOT EXISTS], ALTER TABLE ADD COLUMN [IF NOT EXISTS],
 * ALTER TABLE DROP COLUMN, DROP TABLE. Non-public schemas are ignored.
 */
export function applyMigrationSql(sql, tables) {
  const clean = stripSqlComments(sql);

  // CREATE TABLE [IF NOT EXISTS] [public.]name ( ...balanced... )
  const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+|"[^"]+")\.)?(\w+|"[^"]+")\s*\(/gi;
  let m;
  while ((m = createRe.exec(clean))) {
    const schema = m[1] ? unquote(m[1]) : "public";
    if (schema !== "public") continue;
    const table = unquote(m[2]);
    // Extract balanced-paren body starting at the opening paren.
    let depth = 1, i = createRe.lastIndex, start = i;
    while (i < clean.length && depth > 0) {
      if (clean[i] === "(") depth++;
      else if (clean[i] === ")") depth--;
      i++;
    }
    const body = clean.slice(start, i - 1);
    const cols = tables.get(table) ?? new Set();
    for (const part of splitTopLevel(body)) {
      const first = part.trim().match(/^("[^"]+"|\w+)/)?.[1];
      if (!first) continue;
      if (TABLE_CONSTRAINT_KEYWORDS.has(first.toLowerCase())) continue;
      cols.add(unquote(first));
    }
    tables.set(table, cols);
  }

  // ALTER TABLE [ONLY] [public.]name ADD [COLUMN] [IF NOT EXISTS] col …
  // (an ALTER can carry several ADD COLUMN clauses separated by commas)
  const alterRe = /alter\s+table\s+(?:only\s+)?(?:(\w+|"[^"]+")\.)?(\w+|"[^"]+")([^;]*)/gi;
  while ((m = alterRe.exec(clean))) {
    const schema = m[1] ? unquote(m[1]) : "public";
    if (schema !== "public") continue;
    const table = unquote(m[2]);
    const rest = m[3];
    const addRe = /add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(\w+|"[^"]+")/gi;
    let am;
    while ((am = addRe.exec(rest))) {
      const word = unquote(am[1]);
      if (word === "constraint") continue; // ADD CONSTRAINT, not a column
      const cols = tables.get(table) ?? new Set();
      cols.add(word);
      tables.set(table, cols);
    }
    const dropColRe = /drop\s+column\s+(?:if\s+exists\s+)?(\w+|"[^"]+")/gi;
    let dm;
    while ((dm = dropColRe.exec(rest))) {
      tables.get(table)?.delete(unquote(dm[1]));
    }
  }

  // DROP TABLE [IF EXISTS] [public.]name
  const dropRe = /drop\s+table\s+(?:if\s+exists\s+)?(?:(\w+|"[^"]+")\.)?(\w+|"[^"]+")/gi;
  while ((m = dropRe.exec(clean))) {
    const schema = m[1] ? unquote(m[1]) : "public";
    if (schema !== "public") continue;
    tables.delete(unquote(m[2]));
  }
}

/** Parse the whole migrations directory in filename order.
 * Returns { tables: Map<name, Set<col>>, versions: string[] } —
 * versions are the leading timestamp of each migration filename. */
export function parseMigrationsDir(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const tables = new Map();
  const versions = [];
  for (const file of files) {
    const version = file.match(/^(\d+)/)?.[1];
    if (version) versions.push(version);
    applyMigrationSql(readFileSync(join(dir, file), "utf8"), tables);
  }
  return { tables, versions };
}

// ── Live checks ──────────────────────────────────────────────────────────────

/**
 * Run the drift check. Returns { results: [{ ok, message }] }.
 * seedLedger=true creates supabase_migrations.schema_migrations if missing
 * and backfills any versions absent from it (bootstrap/repair path).
 */
export async function runSchemaDriftCheck({ supabaseUrl, accessToken, migrationsDir, seedLedger = false, log = () => {} }) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const results = [];
  const check = (ok, message) => {
    results.push({ ok, message });
    log(`${ok ? "OK  " : "FAIL"} ${message}`);
  };

  const { tables, versions } = parseMigrationsDir(migrationsDir);

  // 1. STRUCTURE — one query for every public column, compared locally.
  const liveRows = await runSql(projectRef, accessToken,
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';");
  const live = new Map();
  for (const r of liveRows) {
    if (!live.has(r.table_name)) live.set(r.table_name, new Set());
    live.get(r.table_name).add(r.column_name);
  }

  let missingTables = 0, missingColumns = 0;
  for (const [table, cols] of tables) {
    const liveCols = live.get(table);
    if (!liveCols) {
      missingTables++;
      check(false, `table public.${table} declared by migrations is MISSING in the live database`);
      continue;
    }
    for (const col of cols) {
      if (!liveCols.has(col)) {
        missingColumns++;
        check(false, `column public.${table}.${col} declared by migrations is MISSING in the live database`);
      }
    }
  }
  if (missingTables === 0 && missingColumns === 0) {
    const colCount = [...tables.values()].reduce((n, s) => n + s.size, 0);
    check(true, `structure: all ${tables.size} tables / ${colCount} columns declared by migrations exist live`);
  }

  // 2. LEDGER — supabase_migrations.schema_migrations lists every version.
  if (seedLedger) {
    await runSql(projectRef, accessToken, `
      CREATE SCHEMA IF NOT EXISTS supabase_migrations;
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`);
    const values = versions.map((v) => `('${v}')`).join(", ");
    await runSql(projectRef, accessToken,
      `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ${values} ON CONFLICT (version) DO NOTHING;`);
    log(`seeded ledger with ${versions.length} versions (existing rows untouched)`);
  }

  const ledgerExists = await runSql(projectRef, accessToken,
    "SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations';");
  if (ledgerExists.length === 0) {
    check(false, "ledger: supabase_migrations.schema_migrations does not exist — run with --seed-ledger to bootstrap it");
  } else {
    const ledgerRows = await runSql(projectRef, accessToken,
      "SELECT version FROM supabase_migrations.schema_migrations;");
    const recorded = new Set(ledgerRows.map((r) => String(r.version)));
    const unrecorded = versions.filter((v) => !recorded.has(v));
    check(unrecorded.length === 0,
      unrecorded.length === 0
        ? `ledger: all ${versions.length} local migration versions are recorded as applied`
        : `ledger: ${unrecorded.length} local migration(s) NOT recorded as applied: ${unrecorded.join(", ")} — apply the migration, then record it in supabase_migrations.schema_migrations`);
  }

  return { results };
}

// ── Main (only when executed directly) ───────────────────────────────────────

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  const { VITE_SUPABASE_URL, SUPABASE_ACCESS_TOKEN } = process.env;
  if (!VITE_SUPABASE_URL || !SUPABASE_ACCESS_TOKEN) {
    console.error("FATAL: VITE_SUPABASE_URL and SUPABASE_ACCESS_TOKEN must be set.");
    process.exit(1);
  }
  try {
    const { results } = await runSchemaDriftCheck({
      supabaseUrl: VITE_SUPABASE_URL,
      accessToken: SUPABASE_ACCESS_TOKEN,
      migrationsDir: new URL("../supabase/migrations", import.meta.url).pathname,
      seedLedger: process.argv.includes("--seed-ledger"),
      log: (line) => console.log(line),
    });
    const failures = results.filter((r) => !r.ok);
    console.log(failures.length
      ? `\n${failures.length} schema-drift check(s) FAILED`
      : `\nNo schema drift: live database matches what migrations declare.`);
    process.exitCode = failures.length ? 1 : 0;
  } catch (err) {
    console.error(`FATAL: ${err.message}`);
    process.exitCode = 1;
  }
}
