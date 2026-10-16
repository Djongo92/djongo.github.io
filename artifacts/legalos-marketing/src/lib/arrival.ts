// The marketing site's half of "where did this visitor come from".
//
// The app is a separate artifact — a click into it is a full document load, so
// nothing survives in memory. sessionStorage does, because both artifacts are
// served from one origin, so this is the handoff channel. The app reads the
// same key (see its own lib/arrival.ts; keep the shape in sync).
//
// First-touch wins for campaign attribution: someone who lands on a UTM'd link
// and then browses three sections before clicking through should still be
// credited to the campaign, not to the last section they read.
export interface Arrival {
  from?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  at?: number;
}

const KEY = 'legalos_arrival';

function read(): Arrival {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Arrival) : {};
  } catch {
    return {};
  }
}

function write(next: Arrival) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private-mode storage failures must never break a page render.
  }
}

/** Records campaign parameters from the landing URL, once per tab. */
export function captureCampaign() {
  if (typeof window === 'undefined') return;
  const existing = read();
  if (existing.utmSource) return;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source') ?? undefined;
  if (!utmSource) return;

  write({
    ...existing,
    utmSource,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
    at: Date.now(),
  });
}

/** Records which surface on the site the visitor clicked through from. */
export function recordDeparture(from: string) {
  if (typeof window === 'undefined') return;
  const existing = read();
  write({ ...existing, from, at: Date.now() });
}
