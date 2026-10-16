// Regression guard for the LinkedIn attribution incident: the ingest
// (20260813010000) recorded researcher annotations INSIDE the url field for
// rows that were NOT confirmed as the firm's own claimed company page
// ("UNCLAIMED PAGE", "question of it being applicable or not"), and the
// blanket attribution stamp (20260813030000) then marked every non-empty row
// confirmed_company_page — falsely confirming them past both the
// linkedin_shape_chk constraint and the runtime lookupDirectoryLinkedIn gate.
//
// This test replays every migration's linkedin writes in order and asserts
// the FINAL directory state: any row whose recorded URL carries an
// annotation (anything beyond a bare URL) must end up cleared, and every row
// still stamped confirmed_company_page must have a clean, bare company URL.
// A future ingest or blanket-stamp migration that reintroduces a falsely
// confirmed row fails here before it can ship.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(__dirname, "../supabase/migrations");

type LinkedinRow = Record<string, unknown>;

/** A bare URL: no whitespace, no prose — just the linkedin.com/company link. */
const isBareCompanyUrl = (url: unknown): boolean =>
  typeof url === "string" && !/\s/.test(url) && url.includes("linkedin.com/company/");

/**
 * Replays every migration's writes to market_directory_data.linkedin for the
 * serbia market, in filename (= version) order, and returns the final
 * per-domain state. Understands the three write shapes the migrations use:
 *   1. per-domain literal set:   SET linkedin = '<json>'::jsonb ... firm_domain = 'x'
 *   2. blanket merge:            SET linkedin = linkedin || '<json>'::jsonb  (non-empty rows)
 *   3. per-domain-list clear:    SET linkedin = '{}'::jsonb ... firm_domain IN ('a','b')
 * Any other statement that touches the linkedin column fails the test —
 * a new write shape must be added here deliberately, not slip past silently.
 */
function replayLinkedinState(): Map<string, LinkedinRow> {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const state = new Map<string, LinkedinRow>();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // Statement-level scan: only UPDATEs that SET the linkedin column.
    const statements = sql
      .split(";")
      .map((s) => s.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n").trim())
      .filter((s) => /^update\s/i.test(s) && /set\s+linkedin\s*=/i.test(s));
    for (const stmt of statements) {
      const literal = stmt.match(/SET\s+linkedin\s*=\s*'(\{[^']*\})'::jsonb/is);
      const merge = stmt.match(/SET\s+linkedin\s*=\s*linkedin\s*\|\|\s*'(\{[^']*\})'::jsonb/is);
      const singleDomain = stmt.match(/firm_domain\s*=\s*'([^']+)'/i);
      const domainList = stmt.match(/firm_domain\s+IN\s*\(([^)]+)\)/i);

      if (merge) {
        const patch = JSON.parse(merge[1]) as LinkedinRow;
        for (const [domain, row] of state) {
          if (Object.keys(row).length > 0) state.set(domain, { ...row, ...patch });
        }
      } else if (literal && singleDomain) {
        state.set(singleDomain[1], JSON.parse(literal[1]) as LinkedinRow);
      } else if (literal && domainList) {
        const domains = [...domainList[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
        for (const d of domains) state.set(d, JSON.parse(literal[1]) as LinkedinRow);
      } else {
        throw new Error(`Unrecognized linkedin write shape in ${file}: ${stmt.slice(0, 160)}`);
      }
    }
  }
  return state;
}

describe("directory LinkedIn attribution integrity", () => {
  const state = replayLinkedinState();

  it("replays a non-trivial directory (sanity: the ingest actually parsed)", () => {
    expect(state.size).toBeGreaterThan(50);
    // Known-good confirmed row survives with its numerics.
    expect(state.get("bdkadvokati.com")).toMatchObject({ followers: 4874, attribution: "confirmed_company_page" });
  });

  it("every row the researcher annotated as uncertain/unclaimed ends up cleared, never confirmed", () => {
    for (const [domain, row] of state) {
      if (Object.keys(row).length === 0) continue; // cleared — fine
      expect(isBareCompanyUrl(row.url), `${domain}: annotated or malformed url must not stay attributed: ${row.url}`).toBe(true);
    }
  });

  it("the three known falsely-confirmed rows are cleared back to unknown", () => {
    for (const domain of ["arcliffe.com", "advokatskakancelarija.com", "jsplaw.co.rs"]) {
      expect(state.get(domain), `${domain} should be cleared to {}`).toEqual({});
    }
  });

  it("every surviving non-empty row is explicitly confirmed with real numerics (mirrors linkedin_shape_chk)", () => {
    for (const [domain, row] of state) {
      if (Object.keys(row).length === 0) continue;
      expect(row.attribution, `${domain} must carry the attribution flag`).toBe("confirmed_company_page");
      expect(typeof row.followers, `${domain} followers must be a number`).toBe("number");
      expect(typeof row.posts30d, `${domain} posts30d must be a number`).toBe("number");
    }
  });
});
