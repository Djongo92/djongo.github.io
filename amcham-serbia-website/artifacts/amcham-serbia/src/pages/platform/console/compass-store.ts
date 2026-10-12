import { useSyncExternalStore } from 'react';
import type { TierId } from '@/data/proposal';
import { SIGNALS, CompassSignal, SignalCategory } from './compass-signals';

// Shared state for Compass's signals, read by both the Compass page and the
// floating panel: what was acted on, snoozed or dismissed, which kinds the
// user asked to see less of, delivery preferences and the activity log.
// In memory on purpose: a page reload starts the demo fresh.

export type SignalStatus = 'done' | 'snoozed' | 'dismissed';
export type Delivery = 'realtime' | 'morning' | 'weekly' | 'off';

export interface LogEntry {
  id: string;
  time: string;
  actor: string;
  text: string;
  tier: TierId;
  detail?: string;
}

interface State {
  status: Record<string, SignalStatus>;
  muted: string[];
  delivery: Record<SignalCategory, Delivery>;
  log: LogEntry[];
}

const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

let state: State = {
  status: {},
  muted: [],
  delivery: { membership: 'realtime', events: 'morning', advocacy: 'realtime', service: 'realtime', team: 'morning' },
  log: [
    { id: 'l3', time: '09:20', actor: 'Compass', text: 'Sorted 8 new emails in info@ and drafted 6 replies', tier: 'on-prem', detail: 'Read: shared inbox. Sent: nothing.' },
    { id: 'l2', time: '07:31', actor: 'Compass', text: 'Checked 14 open public consultations against committee priorities', tier: 'public', detail: 'Read: eUprava public consultations.' },
    { id: 'l1', time: '07:30', actor: 'Compass', text: 'Prepared this morning’s brief from 40 accounts and 5 calendars', tier: 'on-prem', detail: 'Read: accounts, activity, calendars. Sent: nothing.' },
    { id: 'l0', time: 'Yesterday 16:10', actor: 'Milica Kostić', text: 'Approved 2 data clean-ups suggested by Compass', tier: 'on-prem' },
  ],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const compassStore = {
  log(text: string, tier: TierId, detail?: string, actor = 'Stefan M.') {
    set({ log: [{ id: `l-${Date.now()}`, time: now(), actor, text, tier, detail }, ...state.log] });
  },
  setStatus(signal: CompassSignal, status: SignalStatus, logText?: string) {
    set({ status: { ...state.status, [signal.id]: status } });
    if (logText) compassStore.log(logText, signal.tier);
  },
  restore(id: string) {
    const { [id]: _, ...rest } = state.status;
    set({ status: rest });
  },
  mute(signal: CompassSignal) {
    if (!state.muted.includes(signal.kind)) set({ muted: [...state.muted, signal.kind] });
    set({ status: { ...state.status, [signal.id]: 'dismissed' } });
    compassStore.log(`Asked Compass to show fewer ${signal.kindLabel}`, 'on-prem');
  },
  unmute(kind: string) {
    set({ muted: state.muted.filter((k) => k !== kind) });
  },
  setDelivery(category: SignalCategory, d: Delivery) {
    set({ delivery: { ...state.delivery, [category]: d } });
  },
};

export function useCompassStore() {
  const s = useSyncExternalStore(subscribe, () => state);
  const visible = SIGNALS.filter((sig) => !s.status[sig.id] && !s.muted.includes(sig.kind) && s.delivery[sig.category] !== 'off');
  return { ...s, visible };
}
