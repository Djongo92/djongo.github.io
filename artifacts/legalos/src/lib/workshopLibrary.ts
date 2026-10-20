// Client helpers for "My Library" — the firm's own kept/edited Workshop
// outputs. Identity travels the same way as style feedback.
import { styleMemoryIdentity } from "@/lib/styleFeedback";
import { fnUrl, authHeaders } from "@/components/workshop/shared";

export interface LibraryItem {
  id: string;
  tool_id: string;
  input_summary: string;
  final_text: string;
  verdict: "approved" | "edited";
  voice_tag: string | null;
  created_at: string;
}

export interface VoiceProfileInfo {
  profile: string;
  example_count: number;
  updated_at: string;
}

async function call<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const resp = await fetch(fnUrl("workshop-library"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...styleMemoryIdentity(), ...body }),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

export const loadLibrary = () =>
  call<{ items: LibraryItem[]; voiceProfile: VoiceProfileInfo | null }>({ action: "list" });

export const removeLibraryItem = (id: string) => call<{ ok: boolean }>({ action: "remove", id });
