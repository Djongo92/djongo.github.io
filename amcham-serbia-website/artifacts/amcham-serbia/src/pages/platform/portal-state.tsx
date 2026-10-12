import React, { createContext, useContext, useState } from 'react';
import { platformData, resolveViewAsMember } from '@/data/platform';

const PortalStateContext = createContext<any>(null);

export function PortalStateProvider({ children, viewAs }: { children: React.ReactNode; viewAs?: ReturnType<typeof resolveViewAsMember> }) {
  const [inbox, setInbox] = useState([
    { id: '1', type: 'intro', text: 'Intro request to Nelt Co moved to "Being Brokered".', urgency: 'normal', action: 'View', route: 'directory', status: 'active', date: '2h ago' },
    { id: '2', type: 'event', text: 'Action required: Register colleagues for Energy Transition Roundtable.', urgency: 'high', action: 'Register', route: 'events', status: 'active', date: '4h ago' }
  ]);
  
  const viewAsId = viewAs?.member?.id;
  // A member who has used the portal for a while: a few saved profiles and the
  // Nelt introduction the inbox says is being brokered.
  const SEED_SAVED = ['hmo', 'msft', 'nkt', 'dlz'];
  const SEED_PENDING = ['nkt', 'mcb'];
  const [directory, setDirectory] = useState(() => {
    const pairs = platformData.console.matchmaking.pairs as any[];
    return platformData.allMembers
      .filter(m => m.id !== viewAsId)
      .map(m => {
        const match = pairs.find(p => (p.from === viewAsId && p.to === m.id) || (p.to === viewAsId && p.from === m.id));
        return { ...m, saved: SEED_SAVED.includes(m.id), reqStatus: SEED_PENDING.includes(m.id) ? 'pending' : 'none', recommended: !!match, recReason: match?.rationale };
      });
  });
  
  const [events, setEvents] = useState([
    { id: 'e1', title: 'Energy Transition Roundtable', date: 'Tomorrow, 10:00', location: 'Hyatt Regency', capacity: { total: 50, booked: 50 }, registered: true, attendees: ['Marko R.', 'Ana Jokić'], waitlist: false, agenda: [{ time: '10:00', desc: 'Opening Remarks' }, { time: '10:15', desc: 'Panel Discussion' }], speakers: ['Ana Brnabic', 'Milan Petrovic'], audience: ['Energy Sector', 'Patrons'] },
    { id: 'e2', title: 'Tax Policy Briefing', date: 'Oct 25, 14:00', location: 'AmCham Office', capacity: { total: 20, booked: 12 }, registered: false, attendees: ['Ana Jokić'], waitlist: false, agenda: [{ time: '14:00', desc: 'Tax Update' }], speakers: ['MinFin Rep'], audience: ['CFOs', 'Finance Committee'] }
  ]);

  const [opportunities, setOpportunities] = useState([
    { id: 'o1', type: 'Offer', title: 'Premium Office Space in NBG', intent: 'Looking for a sub-tenant for 500sqm.', author: 'Microsoft', date: '2d ago', status: 'active', category: 'Real Estate' },
    { id: 'o2', type: 'Ask', title: 'Seeking Logistics Partner', intent: 'Need reliable last-mile delivery in South Serbia.', author: 'S-Leasing', date: '5d ago', status: 'active', category: 'Logistics' },
    { id: 'o3', type: 'Offer', title: 'ESG Reporting Workshop for Suppliers', intent: 'Two free seats per member company at our CSRD readiness workshop in November.', author: 'PwC Serbia', date: '1w ago', status: 'active', category: 'Training' },
    { id: 'o4', type: 'Ask', title: 'Energy Supply for a New Production Line', intent: 'Our new Kragujevac line needs a multi-year corporate energy contract from Q1.', author: 'You', date: '3d ago', status: 'active', category: 'Energy' },
    { id: 'o5', type: 'Offer', title: 'Cloud Migration Assessment', intent: 'A no-cost two-week assessment for member companies moving core systems to the cloud.', author: 'NCR Atleos', date: '2w ago', status: 'active', category: 'Technology' }
  ]);

  const [committees, setCommittees] = useState([
    { id: 'c1', name: 'Digital Economy', mandate: 'Advocating for digital transformation and AI regulation.', nextMeeting: { date: 'Nov 2', type: 'In-person', topic: 'AI Regulation Draft' }, chair: { name: 'Marko Ristic' }, joined: true, documents: [{ id: 'd1', name: 'Draft AI Law Comments.pdf', isPublic: false }, { id: 'd2', name: 'Digital Economy Manifesto.pdf', isPublic: true }] },
    { id: 'c2', name: 'Healthcare', mandate: 'Improving healthcare access and drug pricing predictability.', nextMeeting: { date: 'Nov 15', type: 'Virtual', topic: 'Pricing Strategy' }, chair: { name: 'Nikola Krstic' }, joined: false, documents: [] }
  ]);

  const [people, setPeople] = useState([
    { id: 'p1', name: 'Ana Jokic', role: 'admin', email: 'ana@company.com', lastAccess: '2h ago', status: 'active' },
    { id: 'p2', name: 'Marko R.', role: 'member', email: 'marko@company.com', lastAccess: '1d ago', status: 'active' }
  ]);

  const resolvedBilling = viewAs?.billing || (platformData.portal as any).billing;
  const [billing, setBilling] = useState({
    autoRenew: resolvedBilling?.autoRenew ?? true,
    paymentMethod: resolvedBilling?.paymentMethod ? `${resolvedBilling.paymentMethod.type} ${resolvedBilling.paymentMethod.details}` : 'Bank Transfer ...4567',
    invoices: resolvedBilling?.invoices || []
  });

  const NOTIFICATION_VIEWS: Record<string, string> = { intro: 'seam', event: 'events', value: 'score' };
  const [notifications, setNotifications] = useState((platformData.portal as any).notifications?.map((n: any) => ({ ...n, status: n.unread ? 'unread' : 'read', view: NOTIFICATION_VIEWS[n.type] || 'notifications' })) || []);
  const [notificationPrefs, setNotificationPrefs] = useState({ intros: 'email', events: 'inapp', score: 'digest', market: 'inapp', quietHours: false });

  const [seamProfile, setSeamProfile] = useState({
    shareScore: false,
    shareDirectory: true,
    shareCommittees: true,
    history: [{ date: 'Oct 1', action: 'Joined AmCham Directory' }]
  });

  const [scoreCorrection, setScoreCorrection] = useState<any[]>([]);

  return (
    <PortalStateContext.Provider value={{
      inbox, setInbox,
      directory, setDirectory,
      events, setEvents,
      opportunities, setOpportunities,
      committees, setCommittees,
      people, setPeople,
      billing, setBilling,
      notifications, setNotifications,
      notificationPrefs, setNotificationPrefs,
      seamProfile, setSeamProfile,
      scoreCorrection, setScoreCorrection
    }}>
      {children}
    </PortalStateContext.Provider>
  );
}

export const usePortalState = () => useContext(PortalStateContext);
