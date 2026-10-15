import { edgeHeaders } from "@/lib/edgeAuth";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

/**
 * Returns the headers needed to call an authenticated edge function from the
 * browser. Includes the Supabase publishable key + the per-scope access token
 * the user obtained from the verify-access function.
 */
export const authHeaders = (): HeadersInit => edgeHeaders();

export const handleHttpError = async (resp: Response): Promise<string | null> => {
  if (resp.ok) return null;
  if (resp.status === 429) return "Rate limit reached. Try again in a moment.";
  if (resp.status === 402) return "AI credits exhausted. Add credits to continue.";
  try {
    const j = await resp.json();
    return j?.error || "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
};