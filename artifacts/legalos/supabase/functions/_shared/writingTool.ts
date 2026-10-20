// One handler for the Workshop's long-form writing tools (article, press
// pitch, LinkedIn plan, case study, directory submission, page draft).
// Everything those tools share lives here so each tool is just a prompt:
//   - access gate + guarded firm identity (same rules as workshop-copywriter)
//   - the firm profile, jurisdiction rule, and the firm's learned voice
//     (its own approved/edited past outputs for THIS tool, plus approved
//     directions from other tools)
//   - streaming the result back as SSE
// Because the voice block is built here, every tool built on it learns from
// the firm automatically — nothing per-tool to wire up.
import { requireAccess, ACCESS_CORS_HEADERS } from "./access.ts";
import { streamClaudeText } from "./anthropic.ts";
import { resolveClientIdGuarded, headerSessionToken } from "./verifiedClientId.ts";
import { getStyleExamples, buildStyleMemoryBlock, type StyleToolId } from "./styleMemory.ts";
import { buildFirmContext } from "./firmContextProfile.ts";
import { firmContextLine, JURISDICTION_RULE } from "./firmContextLine.ts";
import { getApprovedVoiceDirections, buildApprovedVoiceBlock } from "./crossToolContext.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;

const WRITING_MODEL = Deno.env.get("WORKSHOP_WRITING_MODEL") ?? "claude-sonnet-5-5";

/** Rules every legal-marketing draft must respect, whatever the tool. */
export const LEGAL_WRITING_RULES = `Non-negotiable rules for anything you write for a law firm:
- Never invent facts: no made-up clients, deal values, case outcomes, quotes, statistics, dates, or rankings. Where a fact is needed and was not supplied, write a clearly marked placeholder in square brackets, e.g. [DEAL VALUE — confirm client has approved disclosure].
- Never breach confidentiality: do not name a client or reveal deal terms unless the brief explicitly says the client has consented. If unsure, anonymise ("a leading regional bank") and flag it.
- No guarantees or promises of results, no "best"/"leading"/"top" superlatives unless the brief supplies a verifiable ranking, and no comparisons that disparage other firms. Legal advertising rules in most jurisdictions forbid these.
- Sound like a person who understands the subject, not like boilerplate. Specific over vague, concrete over abstract, active voice, short sentences. No "we are committed", "passionate", "trusted advisor", "results-driven", "full-service", "cutting-edge".
- This is general information, not legal advice for the reader; do not write anything that reads as advice to a specific person.`;

export interface WritingToolBody {
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

export interface WritingToolConfig {
  /** Memory bucket; must be a valid StyleToolId (and allowed by the DB check). */
  toolId: StyleToolId;
  /** What to retrieve similar past examples for. */
  memoryQuery: (body: WritingToolBody) => string;
  /** Builds the tool-specific system prompt (everything except the shared blocks) and user message. */
  build: (body: WritingToolBody) => { system: string; user: string };
  maxTokens?: number;
}

export function handleWritingTool(cfg: WritingToolConfig) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const unauthorized = await requireAccess(req, corsHeaders, "workshop");
    if (unauthorized) return unauthorized;

    try {
      const body: WritingToolBody = await req.json();
      const { firmContext, clientId: rawClientId, accessToken, activeFirmId, voiceTag } = body;

      let styleBlock = "";
      let voiceBlock = "";
      let firmContextBlock = "";
      let profileJurisdictions: string[] = [];

      if (rawClientId && typeof rawClientId === "string") {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false } },
        );
        const identityToken = typeof accessToken === "string" && accessToken ? accessToken : headerSessionToken(req);
        const clientId = await resolveClientIdGuarded(
          serviceClient, rawClientId, identityToken,
          typeof activeFirmId === "string" && activeFirmId ? activeFirmId : undefined,
        );
        if (!clientId) {
          return new Response(JSON.stringify({ error: "Sign in to use this feature." }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const ctx = await buildFirmContext(serviceClient, clientId);
        profileJurisdictions = ctx.jurisdictions;
        firmContextBlock = ctx.block;
        styleBlock = buildStyleMemoryBlock(
          await getStyleExamples(serviceClient, clientId, cfg.toolId, cfg.memoryQuery(body), 3, typeof voiceTag === "string" ? voiceTag : null),
        );
        voiceBlock = buildApprovedVoiceBlock(await getApprovedVoiceDirections(serviceClient, clientId));
      }

      const { system, user } = cfg.build(body);
      const fullSystem = [
        system,
        LEGAL_WRITING_RULES,
        firmContextLine(firmContext, profileJurisdictions),
        JURISDICTION_RULE,
        styleBlock,
        voiceBlock,
        firmContextBlock,
      ].filter(Boolean).join("\n\n");

      return await streamClaudeText(
        { system: fullSystem, user, model: WRITING_MODEL, maxTokens: cfg.maxTokens ?? 4096 },
        corsHeaders,
      );
    } catch (e) {
      console.error(`writing tool (${cfg.toolId}) error:`, e);
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  };
}

/** Trims and bounds a user-supplied field so a pasted novel can't blow the context. */
export function field(v: unknown, max = 4000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
