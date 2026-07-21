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

async function hashIp(ip: string): Promise<string> {
  const key = Deno.env.get("RATE_LIMIT_IP_SALT") || FALLBACK_KEY;
  return hmacHex(key, ip);
}

/** Best-effort client IP from standard proxy headers. Falls back to a shared bucket if none are present. */
export function clientIpFrom(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
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
