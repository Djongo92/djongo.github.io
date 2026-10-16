// Provider selection — checks Supabase secrets in priority order (richest
// data first) and returns whichever adapter is actually configured. Adding
// a new vendor later means writing one more file implementing SeoProvider
// and adding one more branch here; seoScore.ts and seoFormula.ts never
// change. Returns null when nothing is configured — the caller degrades to
// the existing "not_configured" status, exactly as before this module
// existed.
import type { SeoProvider } from "./types.ts";
import { AhrefsProvider } from "./ahrefs.ts";
import { MozProvider } from "./moz.ts";
import { DataForSeoProvider } from "./dataforseo.ts";
import { OpenPageRankProvider } from "./openpagerank.ts";

export function getConfiguredSeoProvider(): SeoProvider | null {
  const ahrefsKey = Deno.env.get("AHREFS_API_KEY");
  if (ahrefsKey) return new AhrefsProvider(ahrefsKey);

  const mozAccessId = Deno.env.get("MOZ_ACCESS_ID");
  const mozSecretKey = Deno.env.get("MOZ_SECRET_KEY");
  if (mozAccessId && mozSecretKey) return new MozProvider(mozAccessId, mozSecretKey);

  const dataForSeoLogin = Deno.env.get("DATAFORSEO_LOGIN");
  const dataForSeoPassword = Deno.env.get("DATAFORSEO_PASSWORD");
  if (dataForSeoLogin && dataForSeoPassword) return new DataForSeoProvider(dataForSeoLogin, dataForSeoPassword);

  const openPageRankKey = Deno.env.get("OPENPAGERANK_API_KEY");
  if (openPageRankKey) return new OpenPageRankProvider(openPageRankKey);

  return null;
}

export type { NormalizedSeoMetrics, SeoProvider, SeoProviderName } from "./types.ts";
