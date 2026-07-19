// IP-based rate limiting for the one genuinely public, no-password surface
// in this app (the visibility teaser — Batch E item 17, per CLAUDE.md
// Decided #1). Stores only a hash of the caller's IP, never the raw
// address. Fixed rolling window: N requests per IP per windowMs.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1h

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

export async function checkRateLimit(
  // deno-lint-ignore no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  ip: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): Promise<RateLimitResult> {
  const ipHash = await sha256Hex(ip);
  const now = Date.now();

  const { data } = await serviceClient
    .from("teaser_rate_limit")
    .select("window_start, request_count")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  const windowStart = data ? new Date(data.window_start).getTime() : now;
  const windowExpired = now - windowStart > windowMs;
  const currentCount = data && !windowExpired ? data.request_count : 0;

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const nextCount = currentCount + 1;
  await serviceClient.from("teaser_rate_limit").upsert({
    ip_hash: ipHash,
    window_start: windowExpired || !data ? new Date(now).toISOString() : data.window_start,
    request_count: nextCount,
    updated_at: new Date(now).toISOString(),
  }, { onConflict: "ip_hash" });

  return { allowed: true, remaining: Math.max(0, limit - nextCount) };
}
