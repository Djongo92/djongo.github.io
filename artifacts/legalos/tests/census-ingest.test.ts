// The census ingest is the one door through which ~90 external firms enter
// the directory, the leaderboard, and the peer-stat pool — a misparse here
// mis-rates the whole market. These tests pin the pure logic (censusLib.mjs)
// against synthetic CSVs AND the real migration files, so the replay parser
// can't silently drift from the directory's actual SQL shape.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
// @ts-ignore — plain-JS module, no type declarations
import {
  parseCsv,
  parseCensusCsv,
  parseLawyerCount,
  normalizeDomain,
  firmNameKey,
  classifyFirm,
  firmSizeFromLawyers,
  parseDirectorySql,
  buildDirectoryState,
  planIngest,
  renderMigration,
} from "../scripts/census/censusLib.mjs";

const MIGRATIONS_DIR = join(__dirname, "../supabase/migrations");

function realDirectoryState({ includeCensus = true } = {}) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && (includeCensus || !f.includes("serbia_census_expansion")))
    .sort()
    .map((f) => ({ name: f, sql: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }));
  return buildDirectoryState(files);
}

describe("parseCsv", () => {
  it("handles quoted fields, embedded commas, escaped quotes, and CRLF", () => {
    const rows = parseCsv('name,url\r\n"Petrović, Jovan & Co.",https://example.rs\r\n"He said ""hi""",x.rs\nlast,y.rs');
    expect(rows).toEqual([
      ["name", "url"],
      ["Petrović, Jovan & Co.", "https://example.rs"],
      ['He said "hi"', "x.rs"],
      ["last", "y.rs"],
    ]);
  });
});

describe("parseCensusCsv", () => {
  it("maps fuzzy English and Serbian headers", () => {
    const en = parseCensusCsv("Firm,Team URL,Lawyers\nAlpha Law,https://alpha.rs/tim,12\n");
    expect(en.rows).toEqual([{ rowNumber: 2, name: "Alpha Law", teamUrl: "https://alpha.rs/tim", lawyers: 12 }]);
    const sr = parseCensusCsv("Naziv firme,Sajt,Broj advokata\nBeta Advokati,beta.rs,7\n");
    expect(sr.rows[0]).toMatchObject({ name: "Beta Advokati", teamUrl: "beta.rs", lawyers: 7 });
  });

  it("warns and degrades when a column is missing", () => {
    const { rows, warnings } = parseCensusCsv("Name\nNo Url Firm\n");
    expect(rows).toHaveLength(1);
    expect(warnings.some((w) => w.includes("no URL column"))).toBe(true);
  });

  it("skips empty rows and keeps spreadsheet row numbers", () => {
    const { rows } = parseCensusCsv("name,url\n,ignored\nReal,firm.rs\n");
    expect(rows).toEqual([{ rowNumber: 3, name: "Real", teamUrl: "firm.rs", lawyers: null }]);
  });
});

describe("parseLawyerCount", () => {
  it("parses plain, approximate, and plus-suffixed counts; junk → null", () => {
    expect(parseLawyerCount("12")).toBe(12);
    expect(parseLawyerCount("~12")).toBe(12);
    expect(parseLawyerCount("10+")).toBe(10);
    expect(parseLawyerCount("unknown")).toBeNull();
    expect(parseLawyerCount("")).toBeNull();
  });
});

describe("normalizeDomain", () => {
  it("reduces a team-page deep link to a bare domain", () => {
    expect(normalizeDomain("https://www.karanovicpartners.com/en/our-team/")).toEqual({ domain: "karanovicpartners.com" });
    expect(normalizeDomain("bdkadvokati.com/o-nama")).toEqual({ domain: "bdkadvokati.com" });
  });

  it("rejects platform pages and non-hosts", () => {
    expect(normalizeDomain("https://www.linkedin.com/company/some-firm/").error).toMatch(/platform/);
    expect(normalizeDomain("mailto:office@firm.rs").error).toBeTruthy();
    expect(normalizeDomain("not a url").error).toBeTruthy();
    expect(normalizeDomain("").error).toBeTruthy();
  });
});

describe("firmNameKey", () => {
  it("unifies diacritics, đ, punctuation, and legal-form boilerplate", () => {
    expect(firmNameKey("Karanović & Partners")).toBe("karanovic");
    expect(firmNameKey("Karanovic i partneri d.o.o.")).toBe("karanovic");
    expect(firmNameKey("Živković Samardžić AOD")).toBe("zivkovic samardzic");
    expect(firmNameKey("Đorđević Law Office")).toBe("dordevic");
  });
});

describe("classifyFirm / firmSizeFromLawyers", () => {
  it("routes consultancies, international networks, size tiers, and defaults", () => {
    expect(classifyFirm({ name: "PwC Legal Serbia", lawyers: 30 }).firmType).toBe("C");
    expect(classifyFirm({ name: "Dentons Belgrade", lawyers: 15 }).firmType).toBe("I");
    // Regression: firmNameKey strips the boilerplate token "legal", so the
    // network list entry "act legal" must match via normalized tokens, not a
    // raw substring test (which was dead code and silently typed it local).
    expect(classifyFirm({ name: "act legal", lawyers: 10 }).firmType).toBe("I");
    // Grata: global network (HQ Almaty); initially typed local as a
    // conservative call, reversed by the 20260812010000 retype migration.
    expect(classifyFirm({ name: "Grata International", lawyers: 4 }).firmType).toBe("I");
    expect(classifyFirm({ name: "Velika Advokatska", lawyers: 25 })).toMatchObject({ firmType: "R", peerGroup: "regional" });
    expect(classifyFirm({ name: "Mala Kancelarija", lawyers: 4 })).toMatchObject({ firmType: "L", peerGroup: "local" });
    expect(classifyFirm({ name: "Unknown Size Firm", lawyers: null })).toMatchObject({ firmType: "L", firmSize: null });
  });

  it("maps lawyer counts onto the FirmSize enum boundaries", () => {
    expect(firmSizeFromLawyers(1)).toBe("solo");
    expect(firmSizeFromLawyers(10)).toBe("boutique_2_10");
    expect(firmSizeFromLawyers(11)).toBe("mid_11_50");
    expect(firmSizeFromLawyers(50)).toBe("mid_11_50");
    expect(firmSizeFromLawyers(51)).toBe("large_51_200");
    expect(firmSizeFromLawyers(201)).toBe("enterprise_200_plus");
    expect(firmSizeFromLawyers(null)).toBeNull();
  });
});

describe("parseDirectorySql against the real migrations", () => {
  it("replays exactly the seeded 45 Serbia firms with their enriched domains", () => {
    // 44 original seed rows + K&F Advokati (20260814090000 cohort
    // reconciliation — published audit for a firm the directory lacked).
    const state = realDirectoryState({ includeCensus: false });
    expect(state).toHaveLength(45);
    const karanovic = state.find((r) => r.firmName === "Karanović & Partners");
    expect(karanovic).toMatchObject({ firmType: "R", firmDomain: "karanovicpartners.com" });
    const schoenherr = state.find((r) => r.firmName.startsWith("Schoenherr"));
    expect(schoenherr.firmDomain).toBe("schoenherr.rs");
  });

  it("replays the full post-census directory: 44 seed + 48 census inserts - 1 merged duplicate + K&F Advokati = 92", () => {
    // Pins the applied census expansion so a botched/hand-edited census
    // migration fails loudly here instead of drifting the live leaderboard.
    const state = realDirectoryState();
    expect(state).toHaveLength(92);
    expect(state.filter((r) => r.firmDomain === null).map((r) => r.firmName).sort()).toEqual([
      "Law Office Kosic",
      "maric i mujezinovc",
    ]);
  });

  it("replays the act legal duplicate merge: the network row is gone, the Serbian firm remains", () => {
    // Regression: 20260813230000 deletes the actlegal.com network row (the
    // canonical firm is vp.rs). If the replayer ignores DELETEs, the next
    // ingest re-appends the merged-away firm to the generated manifest and
    // the leaderboard double-counts one firm.
    const state = realDirectoryState();
    expect(state.find((r) => r.firmDomain === "actlegal.com")).toBeUndefined();
    expect(state.find((r) => r.firmName === "act legal")).toBeUndefined();
    expect(state.find((r) => r.firmDomain === "vp.rs")?.firmName).toBe("Vuković & Partners (act legal Serbia)");
  });

  it("replays the network retype migration: Grata comes back as I", () => {
    // Regression: the 20260812010000 retype migration corrects firm_type by
    // domain; if the replayer ignores it, the next ingest silently regresses
    // the firm back to a 'local' peer group in the manifest. (actlegal.com
    // was retyped by that same migration but has since been merged away —
    // covered by the duplicate-merge test above.)
    const state = realDirectoryState();
    expect(state.find((r) => r.firmDomain === "gratanet.com")?.firmType).toBe("I");
  });

  it("parses an INSERT block with jsonb casts and ON CONFLICT", () => {
    const { inserts } = parseDirectorySql(
      `INSERT INTO public.market_directory_data (market, firm_name, firm_type, chambers, legal500, iflr1000, last_verified_at)
VALUES
  ('serbia', 'Test Firm', 'L', '{"rankedTables":{"BF":1}}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'O''Brien Law', 'I', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz)
ON CONFLICT (market, firm_name) DO NOTHING;`,
    );
    expect(inserts).toEqual([
      { firmName: "Test Firm", firmDomain: null, firmType: "L" },
      { firmName: "O'Brien Law", firmDomain: null, firmType: "I" },
    ]);
  });

  it("applies a LATER file's domain UPDATEs to an earlier file's rows", () => {
    // The real domain-enrichment migration is a separate file — updates must
    // reach rows inserted by previous migrations, not just same-file ones.
    const state = buildDirectoryState([
      { name: "1.sql", sql: `INSERT INTO public.market_directory_data (market, firm_name, firm_type) VALUES ('serbia', 'Acme Law', 'L') ON CONFLICT (market, firm_name) DO NOTHING;` },
      { name: "2.sql", sql: `UPDATE public.market_directory_data SET firm_domain = 'acme.rs' WHERE market = 'serbia' AND firm_name = 'Acme Law';` },
    ]);
    expect(state[0].firmDomain).toBe("acme.rs");
  });

  it("parses the constrained duplicate-merge DELETE form", () => {
    const { deletes } = parseDirectorySql(
      `DELETE FROM public.market_directory_data WHERE market = 'serbia' AND firm_name = 'act legal';`,
    );
    expect(deletes).toEqual([{ firmName: "act legal" }]);
    // Broader shapes must NOT parse — guessing at row identity is worse than
    // failing loudly by leaving the row in place.
    expect(
      parseDirectorySql(`DELETE FROM public.market_directory_data WHERE market = 'serbia';`).deletes,
    ).toEqual([]);
  });

  it("applies a DELETE chronologically: the merged-away firm stays gone", () => {
    const state = buildDirectoryState([
      { name: "1.sql", sql: `INSERT INTO public.market_directory_data (market, firm_name, firm_domain, firm_type) VALUES ('serbia', 'Dup Firm', 'dup.example', 'L');` },
      { name: "2.sql", sql: `DELETE FROM public.market_directory_data WHERE market = 'serbia' AND firm_name = 'Dup Firm';` },
    ]);
    expect(state.find((r) => r.firmName === "Dup Firm")).toBeUndefined();
    // ...while a DELETE in an EARLIER file must not pre-empt a LATER insert.
    const resurrected = buildDirectoryState([
      { name: "1.sql", sql: `DELETE FROM public.market_directory_data WHERE market = 'serbia' AND firm_name = 'Dup Firm';` },
      { name: "2.sql", sql: `INSERT INTO public.market_directory_data (market, firm_name, firm_domain, firm_type) VALUES ('serbia', 'Dup Firm', 'dup.example', 'L');` },
    ]);
    expect(resurrected.find((r) => r.firmName === "Dup Firm")).toBeDefined();
  });

  it("round-trips renderMigration output through the parser (ingest must be idempotent)", () => {
    // A generated migration's backfills use the NULL-only predicate — if the
    // parser can't read its own renderer's output, a second ingest pass
    // "forgets" every backfill and re-plans it forever.
    const directory = [{ firmName: "Seed Firm", firmDomain: null, firmType: "L" }];
    const plan = planIngest([{ rowNumber: 2, name: "Seed Firm", teamUrl: "https://seed.rs/team", lawyers: 6 }], directory);
    expect(plan.enriches).toEqual([{ firmName: "Seed Firm", firmDomain: "seed.rs" }]);

    // The generated migration only carries the UPDATE — replay it on top of
    // the original seed INSERT, exactly as the migrations directory would.
    const seedFile = {
      name: "0_seed.sql",
      sql: `INSERT INTO public.market_directory_data (market, firm_name, firm_type) VALUES ('serbia', 'Seed Firm', 'L') ON CONFLICT (market, firm_name) DO NOTHING;`,
    };
    const replayed = buildDirectoryState([seedFile, { name: "1_gen.sql", sql: renderMigration(plan) }]);
    expect(replayed).toEqual([{ firmName: "Seed Firm", firmDomain: "seed.rs", firmType: "L" }]);

    // Second pass over the post-migration state: nothing left to enrich,
    // nothing re-inserted, and the manifest is unchanged in shape.
    const secondPass = planIngest([{ rowNumber: 2, name: "Seed Firm", teamUrl: "https://seed.rs/team", lawyers: 6 }], replayed);
    expect(secondPass.enriches).toEqual([]);
    expect(secondPass.inserts).toEqual([]);
    expect(secondPass.manifest).toHaveLength(1);
  });
});

describe("planIngest", () => {
  const directory = [
    { firmName: "Karanović & Partners", firmDomain: "karanovicpartners.com", firmType: "R" },
    { firmName: "Domaić Domain-Less", firmDomain: null, firmType: "L" },
  ];

  it("matches seed firms by domain and name-variant, backfilling only missing domains", () => {
    const plan = planIngest(
      [
        { rowNumber: 2, name: "KARANOVIC & PARTNERS", teamUrl: "https://karanovicpartners.com/team", lawyers: 40 },
        { rowNumber: 3, name: "Domaic Domain-Less", teamUrl: "https://domaic.rs", lawyers: 5 },
      ],
      directory.map((r) => ({ ...r })),
    );
    expect(plan.matches).toHaveLength(2);
    expect(plan.inserts).toHaveLength(0);
    // Karanović already has a curated domain — untouched; Domać gets backfilled.
    expect(plan.enriches).toEqual([{ firmName: "Domaić Domain-Less", firmDomain: "domaic.rs" }]);
    // Matched firms keep the DIRECTORY's peer group, not the heuristic's.
    const karanovic = plan.manifest.find((m) => m.displayName === "Karanović & Partners");
    expect(karanovic).toMatchObject({ peerGroup: "regional", firmSize: "mid_11_50", source: "census-match" });
  });

  it("inserts new firms, skips domain-less rows from the manifest only, and dedupes within the census", () => {
    const plan = planIngest(
      [
        { rowNumber: 2, name: "New Firm One", teamUrl: "https://newone.rs", lawyers: 3 },
        { rowNumber: 3, name: "new firm one doo", teamUrl: "https://newone.rs", lawyers: 3 },
        { rowNumber: 4, name: "No Site Firm", teamUrl: "https://linkedin.com/company/nosite", lawyers: 2 },
      ],
      [],
    );
    expect(plan.inserts.map((r) => r.firmName)).toEqual(["New Firm One", "No Site Firm"]);
    expect(plan.manifest).toHaveLength(1);
    expect(plan.manifest[0]).toMatchObject({ domain: "newone.rs", peerGroup: "local", firmSize: "boutique_2_10" });
    expect(plan.skipped).toHaveLength(2); // duplicate + linkedin-only
  });

  it("appends directory firms missing from the census so the leaderboard covers the whole market", () => {
    const plan = planIngest([], [{ firmName: "Seed Only", firmDomain: "seedonly.rs", firmType: "L" }]);
    expect(plan.manifest).toEqual([
      { domain: "seedonly.rs", displayName: "Seed Only", peerGroup: "local", firmSize: null, source: "directory" },
    ]);
  });

  it("matches the same firm listed under a DIFFERENT domain via shared surname tokens", () => {
    // Real census case: "Moravčević Vojnović i Partneri in cooperation with
    // Schoenherr" (schoenherr.eu) is the seed's "Schoenherr (Moravčević
    // Vojnović and Partners)" (schoenherr.rs) — one firm, two domains; a
    // miss here double-lists it on the leaderboard.
    const plan = planIngest(
      [{ rowNumber: 2, name: "Moravčević Vojnović i Partneri in cooperation with Schoenherr", teamUrl: "https://www.schoenherr.eu/people", lawyers: 13 }],
      [{ firmName: "Schoenherr (Moravčević Vojnović and Partners)", firmDomain: "schoenherr.rs", firmType: "R" }],
    );
    expect(plan.inserts).toHaveLength(0);
    expect(plan.matches[0]).toMatchObject({ matchedTo: "Schoenherr (Moravčević Vojnović and Partners)", by: "name-tokens" });
    expect(plan.manifest[0]).toMatchObject({ domain: "schoenherr.rs", peerGroup: "regional" });
  });

  it("honors directory-only overrides: no domain stored, no audit scheduled", () => {
    const plan = planIngest(
      [{ rowNumber: 2, name: "Law Office Kosic", teamUrl: "https://horizons-advisory.com/partner/dubravka-kosic/", lawyers: 1 }],
      [],
    );
    expect(plan.inserts).toEqual([{ firmName: "Law Office Kosic", firmDomain: null, firmType: "L" }]);
    expect(plan.manifest).toHaveLength(0);
    expect(plan.skipped[0].reason).toMatch(/another entity/);
  });
});

describe("renderMigration", () => {
  it("renders conflict-safe inserts, escaped names, and non-destructive backfills", () => {
    const sql = renderMigration({
      inserts: [{ firmName: "O'Brien & Partners", firmDomain: "obrien.rs", firmType: "L" }],
      enriches: [{ firmName: "Seed Firm", firmDomain: "seed.rs" }],
    });
    expect(sql).toContain("ON CONFLICT (market, firm_name) DO NOTHING;");
    expect(sql).toContain("'O''Brien & Partners'");
    expect(sql).toContain("AND (firm_domain IS NULL OR firm_domain = '');");
    // Census rows carry only the four listed columns — never fabricated
    // chambers/legal500 rankings.
    expect(sql).toContain("INSERT INTO public.market_directory_data (market, firm_name, firm_domain, firm_type)");
  });
});
