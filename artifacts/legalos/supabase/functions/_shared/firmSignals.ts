// Read/write helpers for the firm_signals table.
// Used by:
//   - performanceScore.ts  (check pagespeed cache before calling PSI)
//   - reputationScore.ts   (check google_places before using self-reported GBP boolean)
//   - firm-signals-refresh (write refreshed signals)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type SignalType = "pagespeed" | "google_places";

export interface FirmSignalRow {
  payload: Record<string, unknown>;
  is_unverifiable: boolean;
}

/**
 * Normalize a URL or domain to the plain hostname used as the firm_signals key.
 * Returns null if the input looks like a firm name (contains spaces) rather
 * than a URL/domain.
 */
export function normalizeDomain(urlOrDomain: string): string | null {
  const cleaned = urlOrDomain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
  if (!cleaned || cleaned.includes(" ")) return null;
  // Strip any path component — we only store by hostname.
  return cleaned.split("/")[0] || null;
}

/** Returns a fresh (not expired) signal row, or null if absent/stale. */
export async function getFirmSignal(
  serviceClient: SupabaseClient,
  firmDomain: string,
  signalType: SignalType,
): Promise<FirmSignalRow | null> {
  const domain = normalizeDomain(firmDomain);
  if (!domain) return null;

  const { data, error } = await serviceClient
    .from("firm_signals")
    .select("payload, is_unverifiable")
    .eq("firm_domain", domain)
    .eq("signal_type", signalType)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.warn("[firmSignals] read error:", error.message);
    return null;
  }
  return data ? { payload: data.payload as Record<string, unknown>, is_unverifiable: data.is_unverifiable } : null;
}

/** Upserts (inserts or replaces) a signal row. */
export async function upsertFirmSignal(
  serviceClient: SupabaseClient,
  firmDomain: string,
  signalType: SignalType,
  payload: Record<string, unknown>,
  ttlHours: number,
  isUnverifiable = false,
): Promise<void> {
  const domain = normalizeDomain(firmDomain);
  if (!domain) return;

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  const { error } = await serviceClient.from("firm_signals").upsert(
    { firm_domain: domain, signal_type: signalType, payload, fetched_at: new Date().toISOString(), expires_at: expiresAt, is_unverifiable: isUnverifiable },
    { onConflict: "firm_domain,signal_type" },
  );

  if (error) console.warn("[firmSignals] upsert error:", error.message);
}

/** Creates a service-role Supabase client from environment variables. */
export function makeServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}
