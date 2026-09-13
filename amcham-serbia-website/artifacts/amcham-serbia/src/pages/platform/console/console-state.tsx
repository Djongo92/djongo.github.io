import React, { createContext, useContext, useState, useCallback } from 'react';
import { platformData, Company } from '@/data/platform';

interface ConsoleState {
  outreachQueue: any[];
  queueOutreach: (company: Company) => void;
  completeOutreach: (id: string) => void;
  isQueued: (companyId: string) => boolean;
}

const ConsoleStateContext = createContext<ConsoleState | null>(null);

export function ConsoleStateProvider({ children }: { children: React.ReactNode }) {
  const [outreachQueue, setOutreachQueue] = useState<any[]>(platformData.console.outreach.items);

  const queueOutreach = useCallback((company: Company) => {
    setOutreachQueue(prev => {
      if (prev.some(i => i.companyId === company.id)) return prev;
      return [...prev, {
        id: `ask-${company.id}`,
        companyId: company.id,
        tier: company.tier,
        overdue: 0,
        lastTouch: company.lastInteraction,
        owner: 'You',
        reason: 'Ask query follow-up',
        channel: 'Email',
        quietHours: false,
        context: `Queued from an Ask query result.`,
        status: 'due',
        source: 'ask'
      }];
    });
  }, []);

  const completeOutreach = useCallback((id: string) => {
    setOutreachQueue(prev => prev.filter(i => i.id !== id));
  }, []);

  const isQueued = useCallback((companyId: string) => outreachQueue.some(i => i.companyId === companyId), [outreachQueue]);

  return (
    <ConsoleStateContext.Provider value={{ outreachQueue, queueOutreach, completeOutreach, isQueued }}>
      {children}
    </ConsoleStateContext.Provider>
  );
}

export function useConsoleState() {
  const ctx = useContext(ConsoleStateContext);
  if (!ctx) throw new Error('useConsoleState must be used within ConsoleStateProvider');
  return ctx;
}
