import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Calendar, Users, ArrowRight, Activity, Clock, ShieldCheck, ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlanceView({ t, navigateTo, roleParam, member, billing, glanceData }: any) {
  const { people, notifications } = usePortalState();
  const glance = glanceData;
  const tier = glance.tier;
  const eventSeats = glance.eventSeats;
  const committeeSeats = glance.committeeSeats;

  const [expandedEntitlement, setExpandedEntitlement] = useState<string | null>(null);

  const toggleEntitlement = (id: string) => {
    setExpandedEntitlement(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="bg-foreground text-background p-8 md:p-12 rounded-[40px] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden">
         <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#40D9F1]/10 pointer-events-none" />
         <div className="relative z-10">
            <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4">Membership Tier</div>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-4xl md:text-5xl font-serif font-light">{tier}</div>
              {member.scoreTrend > 0 ? (
                <div className="bg-[#40D9F1]/20 text-[#40D9F1] px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Activity className="w-4 h-4" /> Score {member.score} (+{member.scoreTrend})
                </div>
              ) : (
                <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Activity className="w-4 h-4" /> Score {member.score} ({member.scoreTrend})
                </div>
              )}
            </div>
            <p className="text-background/80 text-sm max-w-md">
              Your membership tier defines your baseline capacity for events and committee participation.
            </p>
         </div>
         {roleParam === 'admin' && (
           <div className="flex flex-col md:flex-row gap-3 relative z-10 w-full md:w-auto mt-4 md:mt-0">
             <button onClick={() => navigateTo('billing')} className="px-6 py-3 border border-background/20 rounded-full font-bold text-xs hover:bg-background/10 transition-colors whitespace-nowrap text-center">View Billing & Renewals</button>
             <button onClick={() => navigateTo('people')} className="px-6 py-3 border border-background/20 rounded-full font-bold text-xs hover:bg-background/10 transition-colors whitespace-nowrap text-center">Manage Team Access</button>
           </div>
         )}
      </div>
      
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Next Renewal', value: billing.renewalDate, icon: <Clock className="w-4 h-4" /> },
          { label: 'Seats Used', value: billing.seatsUsed, icon: <Users className="w-4 h-4" /> },
          { label: 'Team Size', value: people.length || 5, icon: <Users className="w-4 h-4" /> },
          { label: 'Account Health', value: 'Excellent', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-green-600' }
        ].map((kpi, i) => (
          <div key={i} className="bg-card p-5 rounded-[32px] border border-border flex flex-col gap-2">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
              {kpi.icon} {kpi.label}
            </div>
            <div className={cn("text-lg font-bold tabular-nums", kpi.color || "text-foreground")}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage & Entitlements */}
        <div className="lg:col-span-2 space-y-4">
           <h3 className="text-2xl font-serif font-light px-2 mb-2">Entitlements</h3>
           
           {/* Events Entitlement */}
           <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden transition-all duration-300">
             <div className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row gap-6 md:items-center justify-between hover:bg-muted/30" onClick={() => toggleEntitlement('events')}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Event Seats</div>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <div className="text-4xl font-serif font-light tabular-nums text-foreground">{eventSeats.used}</div>
                    <div className="text-xl text-muted-foreground pb-1">/{eventSeats.total}</div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                     <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${(eventSeats.used / eventSeats.total) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-primary">Details</span>
                  {expandedEntitlement === 'events' ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
                </div>
             </div>
             
             <AnimatePresence>
               {expandedEntitlement === 'events' && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border overflow-hidden bg-muted/10">
                    <div className="p-6 md:p-8 space-y-4">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Recent Usage</div>
                      <div className="space-y-3">
                        {['Energy Transition Roundtable (2 seats)', 'Tax Policy Briefing (1 seat)', 'ESG Strategy Panel (3 seats)'].map((e, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm font-medium">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             {e}
                          </div>
                        ))}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); navigateTo('events'); }} className="mt-4 flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                        View All Events <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>

           {/* Committees Entitlement */}
           <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden transition-all duration-300">
             <div className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row gap-6 md:items-center justify-between hover:bg-muted/30" onClick={() => toggleEntitlement('committees')}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Committee Seats</div>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <div className="text-4xl font-serif font-light tabular-nums text-foreground">{committeeSeats.used}</div>
                    <div className="text-xl text-muted-foreground pb-1">/{committeeSeats.total}</div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                     <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${(committeeSeats.used / committeeSeats.total) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-primary">Details</span>
                  {expandedEntitlement === 'committees' ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
                </div>
             </div>
             <AnimatePresence>
               {expandedEntitlement === 'committees' && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border overflow-hidden bg-muted/10">
                    <div className="p-6 md:p-8 space-y-4">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Active Representatives</div>
                      <div className="space-y-3">
                        {['Ana Ilić (Environment)', 'Marko Ristić (Digital Economy)', 'Jelena Kostić (Tax & Finance)', 'Nikola Krstić (Healthcare)'].map((e, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm font-medium">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             {e}
                          </div>
                        ))}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); navigateTo('committee'); }} className="mt-4 flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                        Manage Committees <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
        </div>

        {/* Timeline & Activity */}
        <div className="space-y-6">
           <h3 className="text-2xl font-serif font-light px-2 mb-2">Renewal Timeline</h3>
           <div className="bg-card p-6 md:p-8 rounded-[32px] border border-border shadow-sm">
             <div className="relative border-l-2 border-muted ml-3 space-y-8 py-2">
               {billing.invoices.slice(0, 3).map((inv: any, i: number) => (
                 <div key={i} className="relative pl-6">
                   <div className={cn("absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background", i === 0 ? "bg-primary" : "bg-muted")} />
                   <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-1">{inv.date}</div>
                   <div className="text-sm font-medium text-foreground">{inv.amount} • {inv.status}</div>
                   <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><FileText className="w-3 h-3"/> Invoice {inv.id}</div>
                 </div>
               ))}
               <div className="relative pl-6 pt-4">
                   <div className="absolute -left-[9px] top-5 w-4 h-4 rounded-full border-2 border-background bg-background border-dashed border-muted-foreground" />
                   <div className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">Next Expected</div>
                   <div className="text-sm font-medium text-foreground">Oct 15, 2027</div>
               </div>
             </div>
           </div>

           <div className="bg-primary/5 rounded-[32px] p-6 border border-primary/10">
              <div className="text-[10px] font-bold uppercase text-primary tracking-widest mb-4">Recent Activity Logs</div>
              <div className="space-y-3">
                {notifications.slice(0, 3).map((n: any) => (
                  <div key={n.id} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{n.text}</div>
                      <div className="text-xs text-muted-foreground mt-1">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
