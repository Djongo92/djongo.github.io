import React, { createContext, useContext, useState } from 'react';
import { platformData } from '@/data/platform';

const PortalStateContext = createContext<any>(null);

export function PortalStateProvider({ children }: { children: React.ReactNode }) {
  const [inbox, setInbox] = useState([
    { id: '1', type: 'intro', text: 'Intro request to Nelt Co moved to "Being Brokered".', urgency: 'normal', action: 'View', route: 'directory', status: 'active', date: '2h ago' },
    { id: '2', type: 'event', text: 'Action required: Register colleagues for Energy Transition Roundtable.', urgency: 'high', action: 'Register', route: 'events', status: 'active', date: '4h ago' }
  ]);
  
  const [directory, setDirectory] = useState(platformData.allMembers.map(m => ({ ...m, saved: false, reqStatus: 'none' })));
  
  const [events, setEvents] = useState([
    { id: 'e1', title: 'Energy Transition Roundtable', date: 'Tomorrow, 10:00', location: 'Hyatt Regency', capacity: { total: 50, booked: 50 }, registered: false, attendees: [], waitlist: false, agenda: [{ time: '10:00', desc: 'Opening Remarks' }, { time: '10:15', desc: 'Panel Discussion' }], speakers: ['Ana Brnabic', 'Milan Petrovic'], audience: ['Energy Sector', 'Patrons'] },
    { id: 'e2', title: 'Tax Policy Briefing', date: 'Oct 25, 14:00', location: 'AmCham Office', capacity: { total: 20, booked: 12 }, registered: false, attendees: [], waitlist: false, agenda: [{ time: '14:00', desc: 'Tax Update' }], speakers: ['MinFin Rep'], audience: ['CFOs', 'Finance Committee'] }
  ]);

  const [opportunities, setOpportunities] = useState([
    { id: 'o1', type: 'Offer', title: 'Premium Office Space in NBG', intent: 'Looking for a sub-tenant for 500sqm.', author: 'Microsoft', date: '2d ago', status: 'active', category: 'Real Estate' },
    { id: 'o2', type: 'Ask', title: 'Seeking Logistics Partner', intent: 'Need reliable last-mile delivery in South Serbia.', author: 'S-Leasing', date: '5d ago', status: 'active', category: 'Logistics' }
  ]);

  const [committees, setCommittees] = useState([
    { id: 'c1', name: 'Digital Economy', mandate: 'Advocating for digital transformation and AI regulation.', nextMeeting: { date: 'Nov 2', type: 'In-person', topic: 'AI Regulation Draft' }, chair: { name: 'Marko Ristic' }, joined: true, documents: [{ id: 'd1', name: 'Draft AI Law Comments.pdf', isPublic: false }, { id: 'd2', name: 'Digital Economy Manifesto.pdf', isPublic: true }] },
    { id: 'c2', name: 'Healthcare', mandate: 'Improving healthcare access and drug pricing predictability.', nextMeeting: { date: 'Nov 15', type: 'Virtual', topic: 'Pricing Strategy' }, chair: { name: 'Nikola Krstic' }, joined: false, documents: [] }
  ]);

  const [people, setPeople] = useState([
    { id: 'p1', name: 'Ana Jokic', role: 'admin', email: 'ana@company.com', lastAccess: '2h ago', status: 'active' },
    { id: 'p2', name: 'Marko R.', role: 'member', email: 'marko@company.com', lastAccess: '1d ago', status: 'active' }
  ]);

  const [billing, setBilling] = useState({
    autoRenew: true,
    paymentMethod: 'Bank Transfer ...4567',
    invoices: (platformData.portal as any).billing?.invoices || []
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
