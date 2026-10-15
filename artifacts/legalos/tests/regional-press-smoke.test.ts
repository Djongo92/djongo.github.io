// @vitest-environment node
// Opt-in live smoke for the regional trade-press outlet registry:
//   SMOKE_REGIONAL_PRESS=1 pnpm --filter @workspace/legalos test
//
// Why: the production press fetch (pressMentions.ts) deliberately tolerates
// per-outlet failures — one outlet breaking must not forfeit the others. The
// flip side is that if bizlife.rs changes its WordPress search behaviour, or
// Google News stops honouring site: scoping, the press axis quietly reverts
// to undercounting with no signal at all. This gate queries every registered
// outlet strategy for a firm with known historical coverage and asserts at
// least one item parses, so a silently-dead outlet fails a check someone
// watches instead of surfacing as mysteriously-low scores.
//
// Opt-in (same convention as SMOKE_AI_STRESS / SMOKE_FULL_TEASER) because it
// makes real network calls to third-party sites and Google News — too flaky
// a dependency for the default legalos-test run. No credentials needed; the
// outlets are public feeds. (Node environment: happy-dom's fetch emulates
// browser CORS and would block cross-origin RSS fetches.)
import { describe, expect, it } from "vitest";
import {
  REGIONAL_TRADE_OUTLETS,
  buildOutletUrl,
  withOutletSource,
} from "../supabase/functions/_shared/regionalTradePressFormula.ts";
import { parseRssItems } from "../supabase/functions/_shared/pressMentionsFormula.ts";

const OPTED_IN = process.env.SMOKE_REGIONAL_PRESS === "1";

// A firm with verified coverage in every registered outlet. WP search RSS is
// phrase-exact over the whole archive (not date-windowed) and site-scoped
// Google News reaches years back, so historical coverage is enough — the
// assertion is "the strategy still returns parseable items", not freshness.
const KNOWN_COVERED_FIRM = "BDK Advokati";

// Same self-identifying UA the production fetch sends (edge-fetch policy:
// self-identify first) — a smoke that passes with a different UA than
// production uses would prove nothing about the production path.
const UA = "Mozilla/5.0 (compatible; LegalOS/1.0)";

describe.skipIf(!OPTED_IN)(
  "regional trade-press outlets live smoke (opt-in: SMOKE_REGIONAL_PRESS=1)",
  () => {
    it.each(REGIONAL_TRADE_OUTLETS)(
      "$id ($strategy) returns parseable items for a known-covered firm",
      { timeout: 30_000, retry: 1 },
      async (outlet) => {
        const url = buildOutletUrl(outlet, KNOWN_COVERED_FIRM);
        const res = await fetch(url, {
          headers: { "User-Agent": UA },
          signal: AbortSignal.timeout(15_000),
        });
        expect(res.ok, `${outlet.id}: HTTP ${res.status} fetching ${url}`).toBe(true);

        const items = withOutletSource(parseRssItems(await res.text()), outlet);
        expect(
          items.length,
          `${outlet.id}: 0 parseable items for "${KNOWN_COVERED_FIRM}" — the ${outlet.strategy} strategy may have silently broken (WP search RSS behaviour change or Google News site: scoping no longer honoured)`,
        ).toBeGreaterThan(0);

        // Items must be usable downstream: a feed that returns <item> shells
        // without titles/links would pass a bare length check yet contribute
        // nothing after filterPressMentions.
        for (const item of items) {
          expect(item.title, `${outlet.id}: item missing title`).toBeTruthy();
          expect(item.link, `${outlet.id}: item missing link`).toBeTruthy();
          expect(item.sourceUrl, `${outlet.id}: item missing sourceUrl after withOutletSource`).toBeTruthy();
        }
      },
    );
  },
);
