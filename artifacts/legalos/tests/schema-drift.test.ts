// @vitest-environment node
// Two layers of coverage for the schema-drift guard:
//
//   1. Unit tests of the migration-SQL parser — if the parser silently missed
//      a CREATE TABLE / ADD COLUMN pattern our migrations actually use, the
//      live check would "pass" by checking nothing. These pin every pattern
//      in the migrations directory (quoted idents, IF NOT EXISTS, multi-ADD
//      alters, constraint lines, comments, drops).
//
//   2. The live drift check itself, in the normal test workflow (node env —
//      happy-dom's fetch emulates browser CORS and blocks the cross-origin
//      Management API call; this is a server-to-server check). It asserts
//      every table/column declared by supabase/migrations/ exists in the live
//      database, and that the supabase_migrations.schema_migrations ledger
//      records every local migration version. This is exactly the failure
//      mode that shipped: firm_roles ran in code but never in prod, and the
//      identity resolver's membership query errored silently for days.
//
// The live half skips cleanly when the live environment isn't configured.
import { describe, it, expect } from "vitest";
import { join } from "node:path";
// @ts-expect-error — plain .mjs module without type declarations
import { applyMigrationSql, parseMigrationsDir, runSchemaDriftCheck, stripSqlComments } from "./schema-drift-check.mjs";

describe("migration SQL parser", () => {
  const parse = (sql: string) => {
    const tables = new Map<string, Set<string>>();
    applyMigrationSql(sql, tables);
    return tables;
  };

  it("extracts columns from CREATE TABLE, skipping table-level constraints", () => {
    const t = parse(`CREATE TABLE public.things (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amount NUMERIC(10,2) NOT NULL,
      status TEXT CHECK (status IN ('a', 'b')),
      CONSTRAINT things_uniq UNIQUE (amount, status),
      PRIMARY KEY (id),
      FOREIGN KEY (id) REFERENCES public.other(id)
    );`);
    expect([...t.get("things")!].sort()).toEqual(["amount", "id", "status"]);
  });

  it("handles IF NOT EXISTS, lowercase sql, quoted identifiers, and schema-less names", () => {
    const t = parse(`
      create table if not exists public.firm_signals (id uuid, "Weird Col" text);
      create table bare_table (x int);
    `);
    expect([...t.get("firm_signals")!].sort()).toEqual(["id", "weird col"]);
    expect(t.get("bare_table")).toBeDefined();
  });

  it("applies ALTER TABLE ADD COLUMN (with defaults/checks) and ignores ADD CONSTRAINT", () => {
    const t = parse(`
      CREATE TABLE public.firm_invites (id UUID);
      ALTER TABLE public.firm_invites ADD COLUMN role TEXT NOT NULL DEFAULT 'marketing'
        CHECK (role IN ('admin', 'marketing'));
      ALTER TABLE public.firm_invites ADD CONSTRAINT invites_check CHECK (true);
      ALTER TABLE public.firm_invites ADD COLUMN IF NOT EXISTS note TEXT, ADD COLUMN extra INT;
    `);
    expect([...t.get("firm_invites")!].sort()).toEqual(["extra", "id", "note", "role"]);
  });

  it("honors DROP COLUMN and DROP TABLE across statements", () => {
    const t = parse(`
      CREATE TABLE public.a (id UUID, legacy TEXT);
      CREATE TABLE public.b (id UUID);
      ALTER TABLE public.a DROP COLUMN legacy;
      DROP TABLE IF EXISTS public.b;
    `);
    expect([...t.get("a")!]).toEqual(["id"]);
    expect(t.has("b")).toBe(false);
  });

  it("ignores non-public schemas and words inside comments", () => {
    const t = parse(`
      -- CREATE TABLE public.ghost (nope TEXT);
      /* ALTER TABLE public.a ADD COLUMN phantom TEXT; */
      CREATE TABLE auth.private_thing (secret TEXT);
      CREATE TABLE public.real (id UUID); -- trailing comment, id UUID again
    `);
    expect(t.has("ghost")).toBe(false);
    expect(t.has("private_thing")).toBe(false);
    expect([...t.get("real")!]).toEqual(["id"]);
    expect(stripSqlComments("a -- b\nc")).not.toContain("b");
  });

  it("parses the real migrations directory: known tables, the firm_roles columns, and every version", () => {
    const dir = join(__dirname, "..", "supabase", "migrations");
    const { tables, versions } = parseMigrationsDir(dir);
    // The exact columns whose silent absence caused the production incident:
    expect(tables.get("firm_members")).toContain("access_expires_at");
    expect(tables.get("firm_invites")).toContain("role");
    for (const t of ["firms", "firm_profiles", "user_app_state", "executive_reports", "firm_benchmarks"]) {
      expect(tables.has(t), `expected migrations to declare table ${t}`).toBe(true);
    }
    expect(versions.length).toBeGreaterThan(30);
    // Filename-order sort must equal version order, and versions must be unique.
    expect([...versions].sort()).toEqual(versions);
    expect(new Set(versions).size).toBe(versions.length);
  });
});

const { VITE_SUPABASE_URL, SUPABASE_ACCESS_TOKEN } = process.env;
const HAS_LIVE_ENV = !!(VITE_SUPABASE_URL && SUPABASE_ACCESS_TOKEN);

describe.skipIf(!HAS_LIVE_ENV)("schema drift live check", () => {
  it("live schema matches migrations and the migration ledger is complete", { timeout: 120_000 }, async () => {
    const { results } = await runSchemaDriftCheck({
      supabaseUrl: VITE_SUPABASE_URL!,
      accessToken: SUPABASE_ACCESS_TOKEN!,
      migrationsDir: join(__dirname, "..", "supabase", "migrations"),
    });
    const failures = results.filter((r: { ok: boolean }) => !r.ok);
    expect(
      failures,
      failures.map((f: { message: string }) => f.message).join("\n"),
    ).toEqual([]);
  });
});
