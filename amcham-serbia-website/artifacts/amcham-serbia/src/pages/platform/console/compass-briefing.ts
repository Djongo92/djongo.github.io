import { platformData } from '@/data/platform';
import { parseEuro, fmtEuro } from '@/lib/utils';

// What Compass prepares before the staffer asks: the morning brief behind the
// Today tab and the "Compass noticed" signals. Everything is derived from the
// same fixture data the console shows, so numbers and names line up.

export type BriefingAction =
  | { kind: 'ask'; label: string; prompt: string }
  | { kind: 'navigate'; label: string; view: string; companyId?: string };

export interface BriefingSignal {
  id: string;
  icon: 'handshake' | 'mail' | 'cover' | 'approvals' | 'promise';
  title: string;
  body: string;
  action: BriefingAction;
  source: string;
}

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

  // Jelena's accounts renewing in the next quarter, for the cover nudge.
  const renewSoon = platformData.allMembers.filter(
    (m) => m.manager === 'Jelena Kostić' && ['Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027'].includes(m.renewalDate),
  );
  const hygiene = c.approvals.filter((a: any) => a.type === 'Data Hygiene').length;
  const roundtable = (platformData as any).portal.events.find((e: any) => e.id === 'e1');

  const signals: BriefingSignal[] = [
    {
      id: 'sig-roundtable',
      icon: 'handshake',
      title: 'An introduction can happen in the room',
      body: `Adriatica Grupa and NIS a.d. are both registered for the ${roundtable?.title ?? 'Energy Transition Roundtable'} (${roundtable?.date ?? 'Oct 14'}). Their pending introduction could be made at the break.`,
      action: { kind: 'navigate', label: 'Open matchmaking', view: 'matchmaking' },
      source: 'Events + Matchmaking',
    },
    {
      id: 'sig-promise',
      icon: 'promise',
      title: 'A promise is due Friday',
      body: 'On Tuesday’s call you told Adriatica Grupa you’d send the Roundtable agenda by Friday.',
      action: { kind: 'ask', label: 'Draft it', prompt: 'Draft the Roundtable agenda note for Adriatica' },
      source: 'Call notes, 6 Oct',
    },
    {
      id: 'sig-sbb',
      icon: 'mail',
      title: 'SBB’s main contact has gone',
      body: 'Two emails to the primary contact bounced this month, and LinkedIn lists a new Head of IT since September.',
      action: { kind: 'ask', label: 'Draft an intro', prompt: "Draft an intro to SBB's new IT lead" },
      source: 'Email bounces + LinkedIn',
    },
    {
      id: 'sig-cover',
      icon: 'cover',
      title: 'Jelena is out Thursday and Friday',
      body: `${renewSoon.length} of her accounts renew in the next three months (${renewSoon.map((m) => m.name).join(', ')}). Worth a handover before she goes.`,
      action: { kind: 'navigate', label: 'Set up cover', view: 'cover' },
      source: 'Team calendar',
    },
    {
      id: 'sig-approvals',
      icon: 'approvals',
      title: `${c.approvals.length} approvals are waiting`,
      body: `${hygiene} of them are data clean-ups Compass has already prepared; each needs one click to confirm.`,
      action: { kind: 'navigate', label: 'Review approvals', view: 'approvals' },
      source: 'Approvals queue',
    },
  ];

  return { priorities, atStake: fmtEuro(atStake), openCount: ranked.length, signals };
}
