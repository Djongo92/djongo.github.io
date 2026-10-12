import { platformData } from '@/data/platform';
import { parseEuro, fmtEuro } from '@/lib/utils';

// The "Needs you today" part of Compass's Today tab: the top priorities,
// each with a one-click draft or link. The "Compass noticed" signals live in
// compass-signals.ts. Everything is derived from the
// same fixture data the console shows, so numbers and names line up.

export type BriefingAction =
  | { kind: 'ask'; label: string; prompt: string }
  | { kind: 'navigate'; label: string; view: string; companyId?: string };

export interface BriefingPriority {
  id: string;
  companyId: string;
  name: string;
  sector: string;
  tag: string;
  urgency: string;
  due: string;
  value: string;
  action: BriefingAction;
}

const c = platformData.console as any;
const company = (id: string) => platformData.allMembers.find((m) => m.id === id);

const PRIORITY_ACTIONS: Record<string, BriefingAction> = {
  adr: { kind: 'ask', label: 'Draft the renewal note', prompt: 'Draft a renewal note for Adriatica Grupa' },
  sbb: { kind: 'ask', label: 'Draft an intro', prompt: "Draft an intro to SBB's new IT lead" },
};

export function buildBriefing() {
  const ranked = [...c.ritual.items].sort((a: any, b: any) => parseEuro(b.expectedValue) - parseEuro(a.expectedValue));
  const priorities: BriefingPriority[] = ranked.slice(0, 3).map((it: any) => {
    const co = company(it.companyId);
    return {
      id: it.id,
      companyId: it.companyId,
      name: co?.name ?? it.companyId,
      sector: co?.sector ?? '',
      tag: it.tag,
      urgency: it.urgency,
      due: it.dueDate,
      value: it.expectedValue.split(' ')[0],
      action: PRIORITY_ACTIONS[it.companyId] ?? { kind: 'navigate', label: 'Open account', view: 'heatmap', companyId: it.companyId },
    };
  });
  const atStake = ranked.reduce((s: number, it: any) => s + parseEuro(it.expectedValue), 0);

  return { priorities, atStake: fmtEuro(atStake), openCount: ranked.length };
}
