import React from 'react';
import { Eye } from 'lucide-react';

// Deterministic per-company "who else is looking at this" signal — a Figma/
// Notion-style presence cue. Hashed off the company id so it's stable across
// re-renders (not randomly flickering) rather than genuinely live, and only
// shows for roughly a third of companies so it reads as plausible rather
// than an omnipresent gimmick. Names reuse staff already named elsewhere in
// the fixture data (Retention Control, evidence logs) for consistency.
const STAFF_ROSTER = [
  { name: 'Nikola Krstić', avatar: 'NK' },
  { name: 'Jelena Kostić', avatar: 'JK' },
  { name: 'Milica Kostić', avatar: 'MK' },
  { name: 'Marko Ristić', avatar: 'MR' },
  { name: 'Ana Ilić', avatar: 'AI' },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getPresenceViewer(companyId: string, currentUserName?: string): { name: string; avatar: string; minutesAgo: number } | null {
  const hash = hashString(companyId);
  if (hash % 3 !== 0) return null;
  const candidates = STAFF_ROSTER.filter(s => s.name !== currentUserName);
  const viewer = candidates[hash % candidates.length];
  const minutesAgo = hash % 12;
  return { ...viewer, minutesAgo };
}

export function PresenceIndicator({ companyId, currentUserName, className }: { companyId: string; currentUserName?: string; className?: string }) {
  const viewer = getPresenceViewer(companyId, currentUserName);
  if (!viewer) return null;

  return (
    <div className={className || "inline-flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border/50"}>
      <div className="relative shrink-0">
        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">{viewer.avatar}</div>
        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-background" />
      </div>
      <span className="flex items-center gap-1">
        <Eye className="w-3 h-3 opacity-60" />
        {viewer.minutesAgo === 0 ? `${viewer.name} is viewing this` : `${viewer.name} viewed this ${viewer.minutesAgo}m ago`}
      </span>
    </div>
  );
}
