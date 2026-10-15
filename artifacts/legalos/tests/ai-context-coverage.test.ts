// Static guard: every edge function that calls Claude (callClaudeTool /
// streamClaudeText) must also wire the Firm Context Profile — import
// _shared/firmContextProfile.ts and resolve the caller's firm with the
// workspace pin (activeFirmId → resolveClientIdGuarded's requestedFirmId).
// Added after task #119's code review caught AI surfaces drifting without
// firm context; this fails the suite the moment a new AI endpoint forgets.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const FUNCTIONS_DIR = join(__dirname, "../supabase/functions");

// Functions that call Claude but legitimately have no firm context to
// inject. Must stay empty — adding an entry requires a written reason.
const ALLOWED_WITHOUT_CONTEXT: Record<string, string> = {};

function functionEntryPoints(): string[] {
  return readdirSync(FUNCTIONS_DIR)
    .filter((name) => name !== "_shared" && statSync(join(FUNCTIONS_DIR, name)).isDirectory())
    .map((name) => join(FUNCTIONS_DIR, name, "index.ts"))
    .filter((p) => {
      try { statSync(p); return true; } catch { return false; }
    });
}

describe("AI context coverage guard", () => {
  it("every Claude-calling edge function wires the firm context profile with a workspace pin", () => {
    const violations: string[] = [];

    for (const entry of functionEntryPoints()) {
      const src = readFileSync(entry, "utf8");
      const callsClaude = src.includes("callClaudeTool") || src.includes("streamClaudeText");
      if (!callsClaude) continue;

      const name = entry.split("/").slice(-2, -1)[0];
      if (ALLOWED_WITHOUT_CONTEXT[name]) continue;

      const hasContext = src.includes("firmContextProfile.ts");
      const hasPin = src.includes("activeFirmId");
      if (!hasContext || !hasPin) {
        violations.push(
          `${name}: ${!hasContext ? "missing firmContextProfile import" : ""}${!hasContext && !hasPin ? " + " : ""}${!hasPin ? "missing activeFirmId workspace pin" : ""}`,
        );
      }
    }

    expect(
      violations,
      `AI endpoints missing firm context wiring:\n${violations.join("\n")}\n\nFix: wire buildFirmContextBlock + the activeFirmId pin (see workshop-autopsy for the pattern), or add a justified entry to ALLOWED_WITHOUT_CONTEXT.`,
    ).toEqual([]);
  });

  it("headline judge mode also injects the firm context block", () => {
    // Judge mode is a second Claude call in workshop-headlines — a
    // branch-level omission the endpoint scan alone can't catch.
    const src = readFileSync(join(FUNCTIONS_DIR, "workshop-headlines/index.ts"), "utf8");
    const judgeBranch = src.slice(src.indexOf('mode === "judge"'));
    const judgePrompt = judgeBranch.slice(0, judgeBranch.indexOf("callClaudeTool"));
    expect(judgePrompt).toContain("${firmContextBlock}");
    // Judge mode must also see the CLIENT-supplied firm line — a Poland
    // market only in the server profile would leave judge ungrounded
    // (caught by code review on task #142). The profileJurisdictions argument
    // is the task-#147 precedence: profile jurisdictions suppress a
    // conflicting client market.
    expect(judgePrompt).toContain("firmContextLine(firmContext, profileJurisdictions)");
    expect(judgePrompt).toContain("JURISDICTION_RULE");
  });

  it("client firmContext enters prompts only via the shared firmContextLine formatter (task #142)", () => {
    // The prompt line's exact phrasing — including the market and the
    // jurisdiction rule — is centralized in _shared/firmContextLine.ts. A
    // hand-rolled line is how a Warsaw boutique got FMLA advice: the field
    // existed nowhere, so the model defaulted to US law.
    const violations: string[] = [];
    for (const entry of functionEntryPoints()) {
      const src = readFileSync(entry, "utf8");
      const name = entry.split("/").slice(-2, -1)[0];
      if (src.includes("primary goal:") || src.includes("Firm context: ${") || src.includes("firmContext.practiceArea")) {
        violations.push(name);
      }
    }
    expect(
      violations,
      `Functions with hand-rolled firm-context prompt lines: ${violations.join(", ")}\n\nFix: use firmContextLine() + JURISDICTION_RULE from _shared/firmContextLine.ts.`,
    ).toEqual([]);
  });

  it("every Claude-calling function carries the jurisdiction rule", () => {
    // The rule is one constant; the failure it prevents — US-law defaults
    // for CEE firms — is silent. Empty allowlist: an entry needs a written
    // reason. (workshop-autopsy slipped through the consumer-only scan —
    // completion review on task #142.)
    const ALLOWED_WITHOUT_RULE: Record<string, string> = {};
    const violations: string[] = [];
    for (const entry of functionEntryPoints()) {
      const src = readFileSync(entry, "utf8");
      const callsClaude = src.includes("callClaudeTool") || src.includes("streamClaudeText");
      if (!callsClaude) continue;
      const name = entry.split("/").slice(-2, -1)[0];
      if (ALLOWED_WITHOUT_RULE[name]) continue;
      if (!src.includes("JURISDICTION_RULE")) violations.push(name);
    }
    expect(
      violations,
      `Claude-calling functions missing JURISDICTION_RULE: ${violations.join(", ")}\n\nFix: import { JURISDICTION_RULE } from "../_shared/firmContextLine.ts" and add it to the system prompt.`,
    ).toEqual([]);
  });

  it("every function consuming client firmContext uses the shared formatter AND the jurisdiction rule", () => {
    // Positive requirement, not just a substring ban: a function that reads
    // the client-supplied firmContext must route it through firmContextLine
    // and carry JURISDICTION_RULE. firmContextBlock/Profile/Line references
    // are stripped first so server-side firm-memory usage doesn't trip this.
    const violations: string[] = [];
    for (const entry of functionEntryPoints()) {
      const src = readFileSync(entry, "utf8");
      const name = entry.split("/").slice(-2, -1)[0];
      const stripped = src.replace(/firmContext(Block|Profile|Line)/g, "");
      if (!/\bfirmContext\b/.test(stripped)) continue;
      if (!src.includes("firmContextLine.ts") || !src.includes("JURISDICTION_RULE")) {
        violations.push(name);
      }
    }
    expect(
      violations,
      `Functions consuming client firmContext without the shared formatter/rule: ${violations.join(", ")}`,
    ).toEqual([]);
  });

  it("functions injecting both jurisdiction sources enforce profile precedence (task #147)", () => {
    // A function that injects the server profile block (Jurisdictions: …) AND
    // the client firmContext line (primary market: …) into one prompt must
    // pass the profile's jurisdictions to firmContextLine so a conflicting
    // client market is suppressed. Otherwise the prompt carries two markets
    // with no winner.
    const violations: string[] = [];
    for (const entry of functionEntryPoints()) {
      const src = readFileSync(entry, "utf8");
      const name = entry.split("/").slice(-2, -1)[0];
      if (!src.includes("buildFirmContext(serviceClient")) continue;
      const calls = src.match(/firmContextLine\(firmContext[^\n]*/g) ?? [];
      for (const call of calls) {
        // "profileJurisdictions" is the handler variable; "jurisdictions" is
        // the forwarded parameter inside workshop-deck-roast's module-scope
        // FIRM_BLOCK helper (its call site passes profileJurisdictions).
        if (!call.includes("profileJurisdictions") && !call.includes(", jurisdictions")) {
          violations.push(`${name}: ${call.trim().slice(0, 80)}`);
        }
      }
    }
    expect(
      violations,
      `firmContextLine calls missing profileJurisdictions precedence: ${violations.join(" | ")}\n\nFix: capture jurisdictions from buildFirmContext and pass them: firmContextLine(firmContext, profileJurisdictions).`,
    ).toEqual([]);
  });

  it("profileJurisdictions never leaks into module scope (task #147 deck-roast regression)", () => {
    // profileJurisdictions is request-scoped — resolved inside the handler.
    // A module-scope reference (workshop-deck-roast's FIRM_BLOCK helper did
    // this) compiles loosely under vitest but throws ReferenceError in Deno.
    const violations: string[] = [];
    for (const entry of functionEntryPoints()) {
      const src = readFileSync(entry, "utf8");
      const serveIdx = src.indexOf("Deno.serve(");
      if (serveIdx === -1) continue;
      // Strip line comments — a comment may NAME the variable while warning
      // about exactly this mistake; only real code references are violations.
      const moduleScope = src.slice(0, serveIdx).replace(/\/\/[^\n]*/g, "");
      if (moduleScope.includes("profileJurisdictions")) {
        violations.push(entry.split("/").slice(-2, -1)[0]);
      }
    }
    expect(
      violations,
      `profileJurisdictions referenced at module scope: ${violations.join(", ")}\n\nFix: pass it as a parameter to module-scope helpers; it only exists inside the request handler.`,
    ).toEqual([]);
  });

  it("site-reading Claude tools wrap web content in the untrusted-copy boundary (task #154)", () => {
    // A roast/audit target controls its own homepage — fetched HTML is an
    // adversary-controlled prompt fragment, no safer than pasted copy. Any
    // function that fetches a site AND calls Claude must delimit the content
    // in <page_copy> tags and carry UNTRUSTED_COPY_RULE in its system prompt.
    // (safeFetch without Claude — e.g. Lighthouse probes — has no injection
    // surface and is exempt.)
    // Scan entrypoints AND _shared modules: a helper that fetches a site AND
    // calls Claude inside the module (thoughtLeadershipScore.ts — task #154
    // completion review) is invisible to an entrypoint-only scan.
    const candidates = [
      ...functionEntryPoints(),
      ...readdirSync(join(FUNCTIONS_DIR, "_shared"))
        .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
        .map((f) => join(FUNCTIONS_DIR, "_shared", f)),
    ];
    const violations: string[] = [];
    for (const entry of candidates) {
      const src = readFileSync(entry, "utf8");
      if (!src.includes("safeFetch")) continue;
      const callsClaude = src.includes("callClaudeTool") || src.includes("streamClaudeText");
      if (!callsClaude) continue;
      const name = entry.split("/").slice(-2).join("/");
      // Hand-rolled <page_copy> tags are forbidden: they skip the sanitize
      // step, and a target page containing "</page_copy>" would escape the
      // boundary (code review on task #154). wrapPageCopy is the only way.
      if (!src.includes("UNTRUSTED_COPY_RULE") || !src.includes("wrapPageCopy(") || src.includes("<page_copy>")) {
        violations.push(name);
      }
    }
    expect(
      violations,
      `Site-reading Claude tools missing the untrusted-copy boundary: ${violations.join(", ")}\n\nFix: import { UNTRUSTED_COPY_RULE, wrapPageCopy } from "../_shared/siteCopyInput.ts", add the rule to the system prompt, and wrap fetched/pasted page text with wrapPageCopy (never hand-rolled tags).`,
    ).toEqual([]);
  });

  it("profile-context tools never interpolate a raw request-body jurisdictions field (task #147)", () => {
    // workshop-calendar once sent the request's `jurisdictions` straight into
    // the user prompt — beside the profile block's authoritative Jurisdictions
    // line, that is two current, contradictory directives. Raw request values
    // must be resolved against profileJurisdictions first (see the calendar's
    // jurisdictionsLine and the narrative's marketResolution).
    const violations: string[] = [];
    for (const entry of functionEntryPoints()) {
      const src = readFileSync(entry, "utf8");
      if (!src.includes("buildFirmContext(serviceClient")) continue;
      if (/\$\{\s*jurisdictions\b/.test(src)) {
        violations.push(entry.split("/").slice(-2, -1)[0]);
      }
    }
    expect(
      violations,
      `Raw request jurisdictions interpolated into a prompt: ${violations.join(", ")}\n\nFix: resolve against profileJurisdictions first and label any request value as overridden input metadata.`,
    ).toEqual([]);
  });

  it("visibility-audit-narrative resolves the request market against profile jurisdictions (task #147)", () => {
    // The request-body market is the market an audit was SCORED in —
    // historical metadata. Without resolution it fights the authoritative
    // profile jurisdictions inside the same prompt.
    const src = readFileSync(join(FUNCTIONS_DIR, "visibility-audit-narrative/index.ts"), "utf8");
    expect(src).toContain("resolveEffectiveMarket");
    expect(src).toContain("historical");
    expect(src).not.toContain("buildFirmContextBlock");
  });

  it("URL-keyed caches on context-influenced tools are scoped by verified firm identity", () => {
    // These tools generate output USING the requester's firm profile, so a
    // bare-URL cache key would serve one firm's context-derived result to
    // every other firm — cross-tenant disclosure + wrong personalization.
    for (const fn of ["roast-homepage", "workshop-competitor-teardown", "workshop-practice-audit"]) {
      const src = readFileSync(join(FUNCTIONS_DIR, `${fn}/index.ts`), "utf8");
      expect(
        src,
        `${fn}: getCached key must include resolvedClientId (see the "::" firm suffix pattern)`,
      ).toMatch(/getCached\([^)]*resolvedClientId/);
    }
  });
});
