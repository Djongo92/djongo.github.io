// Generic fixed-rolling-window rate limiter, backed by a small per-key
// table (ip_hash or client_id PK, window_start, request_count). Used by:
//   - the public teaser (Batch E item 17), keyed by a hashed IP
//   - the benchmark-gated audit orchestrator, keyed by clientId, to cap
//     PSI/Gemini spend since anyone with the password could otherwise
//     hammer it indefinitely
//
// IPv4 space is only ~4.3B addresses, so a plain unsalted IP hash is a
// rainbow-table away from reversible. Keyed with RATE_LIMIT_IP_SALT when
// configured (same HMAC pattern as access.ts's ACCESS_TOKEN_SECRET); falls
// back to a fixed application-level key otherwise, which still defeats
// generic precomputed IP-hash tables even before that secret is set.
// clientId is already an anonymous random UUID (not raw PII), so it's used
// as-is without hashing.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const enc = new TextEncoder();
const FALLBACK_KEY = "legalos-teaser-rate-limit-fallback-key";

async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Deno is only defined in the real edge runtime — this module is also
 * exercised directly by the Node/vitest unit suite (typeof on an undeclared
 * identifier is safe in both; a bare reference would throw under Node).
 */
function denoEnv(name: string): string | undefined {
  return typeof Deno !== "undefined" ? Deno.env.get(name) : undefined;
}

async function hashIp(ip: string): Promise<string> {
  const key = denoEnv("RATE_LIMIT_IP_SALT") || FALLBACK_KEY;
  return hmacHex(key, ip);
}

/**
 * Sentinel bucket key for a request that arrived without a platform-verified
 * IP. Every such request shares this one bucket rather than being keyed by a
 * caller-suppliable header — see clientIpFrom for why.
 */
export const UNVERIFIED_IP_KEY = "unverified-ip";

/**
 * Client IP for keying per-caller rate-limit buckets — trusts ONLY
 * `cf-connecting-ip`, never `x-forwarded-for` or `x-real-ip`.
 *
 * This project's edge functions are only ever reached through Supabase's
 * shared *.supabase.co gateway (kosmxczrwrhzmmloxobq.supabase.co here),
 * which is fronted by Cloudflare — Cloudflare unconditionally overwrites any
 * inbound `CF-Connecting-IP` with the real TCP peer address before
 * forwarding (see Cloudflare's HTTP headers reference), so a caller cannot
 * spoof it on a request that genuinely reaches this function through the
 * public endpoint. `x-forwarded-for` and `x-real-ip`, by contrast, are
 * ordinary headers any HTTP client sets to whatever it likes — reproduced
 * directly against a live Supabase project in supabase/discussions#34647
 * ("Is x-forwarded-for safe?": spoofed values pass through unmodified).
 * Trusting either as a bucket key would let one caller mint a fresh,
 * never-before-seen bucket on every single request just by varying the
 * header value, which defeats a per-caller limit entirely.
 *
 * `cf-connecting-ip` should be present on every genuine request reaching
 * these functions in production (local `supabase functions serve`, which has
 * no Cloudflare in front of it, is the one case it legitimately isn't). If it
 * is ever missing, the request is folded into one shared `UNVERIFIED_IP_KEY`
 * bucket instead of trusting a spoofable header at the same level of trust —
 * that shared bucket exhausts fast under real abuse instead of one fresh
 * bucket being available per attempt.
 */
export function clientIpFrom(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return UNVERIFIED_IP_KEY;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

interface RateLimitTableConfig {
  table: string;
  keyColumn: string;
  key: string;
  limit: number;
  windowMs: number;
}

async function checkRateLimitGeneric(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  { table, keyColumn, key, limit, windowMs }: RateLimitTableConfig,
): Promise<RateLimitResult> {
  const now = Date.now();

  const { data } = await serviceClient
    .from(table)
    .select("window_start, request_count")
    .eq(keyColumn, key)
    .maybeSingle();

  const windowStart = data ? new Date(data.window_start).getTime() : now;
  const windowExpired = now - windowStart > windowMs;
  const currentCount = data && !windowExpired ? data.request_count : 0;

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const nextCount = currentCount + 1;
  await serviceClient.from(table).upsert({
    [keyColumn]: key,
    window_start: windowExpired || !data ? new Date(now).toISOString() : data.window_start,
    request_count: nextCount,
    updated_at: new Date(now).toISOString(),
  }, { onConflict: keyColumn });

  return { allowed: true, remaining: Math.max(0, limit - nextCount) };
}

const DEFAULT_TEASER_LIMIT = 5;
const DEFAULT_TEASER_WINDOW_MS = 60 * 60 * 1000; // 1h

/** Rate-limits the public, no-password teaser by a keyed hash of the caller's IP. */
export async function checkRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  ip: string,
  limit = DEFAULT_TEASER_LIMIT,
  windowMs = DEFAULT_TEASER_WINDOW_MS,
): Promise<RateLimitResult> {
  const ipHash = await hashIp(ip);
  return checkRateLimitGeneric(serviceClient, { table: "teaser_rate_limit", keyColumn: "ip_hash", key: ipHash, limit, windowMs });
}

const DEFAULT_DIRECTORY_INDEX_LIMIT = 60;
const DEFAULT_DIRECTORY_INDEX_WINDOW_MS = 10 * 60 * 1000; // 10min

/**
 * Rate-limits the public Directory Standing Index — much more generous than
 * the teaser's bucket since this endpoint makes no external paid API calls,
 * just a DB read and arithmetic, and is meant to be freely shared/re-visited.
 */
export async function checkDirectoryIndexRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  ip: string,
  limit = DEFAULT_DIRECTORY_INDEX_LIMIT,
  windowMs = DEFAULT_DIRECTORY_INDEX_WINDOW_MS,
): Promise<RateLimitResult> {
  const ipHash = await hashIp(ip);
  return checkRateLimitGeneric(serviceClient, { table: "directory_index_rate_limit", keyColumn: "ip_hash", key: ipHash, limit, windowMs });
}

const DEFAULT_SYNTHESIS_LIMIT = 60;
const DEFAULT_SYNTHESIS_WINDOW_MS = 60 * 60 * 1000; // 1h

/**
 * Per-firm throttle for post-run synthesis (workshop-synthesis). Every
 * workshop run fires one synthesis call; 60/hour per firm is far above any
 * human workflow but stops a signed-in caller from scripting unbounded
 * Haiku spend against the endpoint.
 */
export async function checkSynthesisRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  firmId: string,
  limit = DEFAULT_SYNTHESIS_LIMIT,
  windowMs = DEFAULT_SYNTHESIS_WINDOW_MS,
): Promise<RateLimitResult> {
  return checkRateLimitGeneric(serviceClient, { table: "synthesis_rate_limit", keyColumn: "firm_id", key: firmId, limit, windowMs });
}

const DEFAULT_GBP_REFRESH_LIMIT = 1;
const DEFAULT_GBP_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Rate-limits on-demand GBP refreshes per domain (one per 24h by default).
 * The weekly firm-signals-refresh batch is the default freshness path and
 * does NOT consume this bucket — this only caps user-triggered re-fetches,
 * each of which is real Google Places API spend. Keyed by normalized domain
 * (not IP): the caller is a verified account asking about their own firm.
 *
 * Runs as a DB-side row-locking function rather than the read-then-upsert
 * helper above: that helper races under concurrent requests (every
 * simultaneous caller reads the same pre-increment count and all pass),
 * which is tolerable for the cheap buckets it otherwise guards but not for
 * the one thing standing between a caller and unlimited Places spend.
 * Denies (fails closed) on any RPC error — a limiter that fails open on its
 * own error is not a limiter.
 */
export async function checkGbpRefreshRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  domain: string,
  limit = DEFAULT_GBP_REFRESH_LIMIT,
  windowMs = DEFAULT_GBP_REFRESH_WINDOW_MS,
): Promise<RateLimitResult> {
  const { data, error } = await serviceClient.rpc("consume_gbp_refresh", {
    p_domain: domain,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error) {
    console.error("rateLimit: GBP refresh RPC failed, denying request:", error.message);
    return { allowed: false, remaining: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: false, remaining: 0 };

  return { allowed: !!row.allowed, remaining: Number(row.remaining ?? 0) };
}

/** Sentinel key for the market-wide anonymous ceiling. Never collides with a hex IP hash. */
const DEMO_AI_GLOBAL_KEY = "__global__";

export interface DemoQuotaResult extends RateLimitResult {
  /** Which bucket turned the call away, when it was refused. */
  blockedBy: "ip" | "global" | null;
}

export interface DemoQuotaLimits {
  limit: number;
  windowMs: number;
  globalLimit: number;
  globalWindowMs: number;
}

/**
 * Consumes one unit of the anonymous demo AI quota, atomically.
 *
 * Two buckets are reserved together — the caller's own hourly allowance, keyed
 * by hashed IP, and a market-wide ceiling. The ceiling is the backstop: the
 * per-caller key derives from proxy headers, which someone hitting the function
 * endpoint directly can vary per request to mint unlimited fresh buckets, so
 * per-IP alone bounds nothing. Both are checked before either is incremented,
 * so a caller refused by the ceiling keeps their own allowance intact.
 *
 * This runs as a DB-side function rather than the read-then-upsert helper
 * above: this bucket is the only thing between an anonymous caller and real
 * per-call Anthropic spend, so it cannot afford that helper's race (concurrent
 * requests all read the same count and all pass) or its fail-open behavior on
 * error. A limiter that fails open is not a limiter — if the RPC is
 * unavailable, deny.
 *
 * Separate bucket from the teaser so a demo visit cannot exhaust the teaser's
 * quota or vice versa — different funnel stages, different costs. Signed-in
 * sessions skip this entirely (see access.ts requireAccess).
 */
export async function consumeDemoAiQuota(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  ip: string,
  { limit, windowMs, globalLimit, globalWindowMs }: DemoQuotaLimits,
): Promise<DemoQuotaResult> {
  const ipHash = await hashIp(ip);

  const { data, error } = await serviceClient.rpc("consume_demo_ai_quota", {
    p_key: ipHash,
    p_limit: limit,
    p_window_ms: windowMs,
    p_global_key: DEMO_AI_GLOBAL_KEY,
    p_global_limit: globalLimit,
    p_global_window_ms: globalWindowMs,
  });

  if (error) {
    console.error("rateLimit: demo quota RPC failed, denying request:", error.message);
    return { allowed: false, remaining: 0, blockedBy: "global" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: false, remaining: 0, blockedBy: "global" };

  return {
    allowed: !!row.allowed,
    remaining: Number(row.remaining ?? 0),
    blockedBy: (row.blocked_by as "ip" | "global" | null) ?? null,
  };
}

const DEFAULT_VERIFY_ACCESS_LIMIT = 10;
const DEFAULT_VERIFY_ACCESS_WINDOW_MS = 10 * 60 * 1000; // 10min — matches api-server's /api/demo-access posture

/**
 * Rate-limits verify-access (the guidebook/workshop/benchmark password
 * check), by a keyed hash of the caller's IP. A password guess is cheap
 * enough that a fixed delay alone doesn't slow down an attacker who rotates
 * source IPs or fires attempts in parallel — this gives it a real counter,
 * matching the Express API's /api/demo-access limiter for the same class of
 * endpoint (a short, human-typed secret worth guessing).
 *
 * Runs as a DB-side row-locking function rather than the read-then-upsert
 * helper above: that helper races under concurrent requests (every
 * simultaneous caller reads the same pre-increment count and all pass), which
 * is tolerable for the cheap, non-adversarial buckets it otherwise guards but
 * not for the one thing standing between an attacker and unlimited concurrent
 * password guesses. Denies (fails closed) on any RPC error — a limiter that
 * fails open on its own error is not a limiter.
 */
export async function checkVerifyAccessRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  ip: string,
  limit = DEFAULT_VERIFY_ACCESS_LIMIT,
  windowMs = DEFAULT_VERIFY_ACCESS_WINDOW_MS,
): Promise<RateLimitResult> {
  const ipHash = await hashIp(ip);

  const { data, error } = await serviceClient.rpc("consume_verify_access_attempt", {
    p_key: ipHash,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error) {
    console.error("rateLimit: verify-access RPC failed, denying request:", error.message);
    return { allowed: false, remaining: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: false, remaining: 0 };

  return { allowed: !!row.allowed, remaining: Number(row.remaining ?? 0) };
}

const DEFAULT_BENCHMARK_LIMIT = 20;
const DEFAULT_BENCHMARK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/** Rate-limits the benchmark-gated full audit by clientId, to cap PSI/Gemini spend. */
export async function checkBenchmarkRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  clientId: string,
  limit = DEFAULT_BENCHMARK_LIMIT,
  windowMs = DEFAULT_BENCHMARK_WINDOW_MS,
): Promise<RateLimitResult> {
  return checkRateLimitGeneric(serviceClient, { table: "benchmark_rate_limit", keyColumn: "client_id", key: clientId, limit, windowMs });
}

/**
 * Rate-limits the public, unauthenticated forms (showcase-access,
 * demo-request, report-lead) by a keyed hash of the caller's IP, one bucket
 * per form so a busy sign-up form can't lock someone out of entering a code.
 */
export async function checkPublicFormRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  form: "showcase-access" | "demo-request" | "report-lead",
  ip: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const ipHash = await hashIp(ip);
  return checkRateLimitGeneric(serviceClient, {
    table: "public_form_rate_limit", keyColumn: "bucket_key", key: `${form}:${ipHash}`, limit, windowMs,
  });
}
