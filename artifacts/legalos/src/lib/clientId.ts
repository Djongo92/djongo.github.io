// Anonymous per-browser identity for the Market Visibility Score, same
// concept as firm_benchmarks' client_id — a random id, not tied to any
// real account (no Supabase Auth users in this app).
const KEY = "legalos_client_id";

export function getOrCreateClientId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
