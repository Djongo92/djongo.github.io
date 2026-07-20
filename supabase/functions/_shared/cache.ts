/**
 * URL response cache for workshop edge functions.
 * Uses Supabase service role to read/write `public.url_cache`. 24h TTL.
 * Skip cache entirely when no URL was provided (pasted content modes).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const client = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const normalizeUrl = (raw: string) => {
  try {
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    const parsed = new URL(u);
    parsed.hash = "";
    // Drop common tracking params
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"]
      .forEach((p) => parsed.searchParams.delete(p));
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return raw.trim().toLowerCase();
  }
};

const sha256Hex = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export async function buildCacheKey(fnName: string, url: string, variant = "") {
  return await sha256Hex(`${fnName}|${normalizeUrl(url)}|${variant}`);
}

export async function getCached(fnName: string, url: string, variant = ""): Promise<{ key: string; hit: unknown | null }> {
  const key = await buildCacheKey(fnName, url, variant);
  try {
    const { data, error } = await client()
      .from("url_cache")
      .select("response, expires_at")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) { console.error("[cache] read error", error.message); return { key, hit: null }; }
    return { key, hit: data?.response ?? null };
  } catch (e) {
    console.error("[cache] read exception", e);
    return { key, hit: null };
  }
}

export async function setCached(key: string, fnName: string, url: string, response: unknown, ttlMs = 24 * 60 * 60 * 1000) {
  try {
    await client().from("url_cache").upsert({
      cache_key: key,
      fn_name: fnName,
      url: normalizeUrl(url),
      response,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
    }, { onConflict: "cache_key" });
  } catch (e) {
    console.error("[cache] write exception", e);
  }
}