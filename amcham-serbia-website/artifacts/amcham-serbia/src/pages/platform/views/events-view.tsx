import React, { useState, useEffect } from 'react';
import { usePortalState } from '../portal-state';
import { Calendar, ChevronRight, X, Clock, Users, Target, CheckCircle2, Info, Filter, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventsView({ t, showToast }: any) {
  const { events, setEvents } = usePortalState();
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const [calendarAdded, setCalendarAdded] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'networking' | 'policy'>('all');

  useEffect(() => {
    if (!activeEvent) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveEvent(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeEvent]);

  const toggleRegistration = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEvents(events.map((ev: any) => {
      if (ev.id === id) {
        if (!ev.registered && ev.capacity.booked >= ev.capacity.total) {
          if(ev.waitlist) {
            showToast('Left waitlist');
            return { ...ev, waitlist: false };
          } else {
            showToast('Joined waitlist');
            return { ...ev, waitlist: true };
          }
        }
        if (!ev.registered) showToast('Registration confirmed');
        else showToast('Registration cancelled');
        
        const change = ev.registered ? -1 : 1;
        return { 
          ...ev, 
          registered: !ev.registered,
          capacity: { ...ev.capacity, booked: ev.capacity.booked + change }
        };
      }
      return ev;
    }));
  };

  const filteredEvents = events.filter((e: any) => {
    if (filter === 'all') return true;
    if (filter === 'networking') return e.title.includes('Roundtable');
    if (filter === 'policy') return e.title.includes('Policy');
    return true;
  });

  return (
    <div className="space-y-8 relative animate-in fade-in duration-500">
      
      {/* Summary Panel */}
      <div className="bg-primary/5 border border-primary/10 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
             <Calendar className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">Attendance Analytics</div>
            <div className="text-xl font-serif font-medium text-foreground">Your team attended 12 events this year.</div>
            <div className="text-sm text-muted-foreground mt-1">4 out of 10 base seats remaining for Q4.</div>
          </div>
        </div>
        <div className="flex gap-2 bg-background border border-border rounded-full p-1.5">
           <button onClick={() => setFilter('all')} className={cn("px-5 py-2 rounded-full text-xs font-bold transition-colors", filter === 'all' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}>All ({events.length})</button>
           <button onClick={() => setFilter('policy')} className={cn("px-5 py-2 rounded-full text-xs font-bold transition-colors", filter === 'policy' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted")}>Policy</button>
           <button onClick={() => setFilter('networking')} className={cn("px-5 py-2 rounded-full text-xs font-bold transition-colors", filter === 'networking' ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted")}>Networking</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredEvents.map((e:any) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={e.id} 
              onClick={() => setActiveEvent(e.id)} 
              className="bg-card rounded-[40px] border border-border shadow-sm overflow-hidden flex flex-col cursor-pointer group hover:border-primary/40 hover:shadow-md transition-all duration-300"
            >
              <div className="p-8 border-b border-border bg-muted/20 relative">
                <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                  <ArrowRight className="w-4 h-4"/>
                </div>
                <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-3 flex items-center gap-2"><Calendar className="w-3 h-3"/> {e.date}</div>
                <h3 className="text-2xl md:text-3xl font-serif font-light text-foreground mb-3 pr-12 leading-tight">{e.title}</h3>
                <div className="text-sm font-medium text-muted-foreground">{e.location}</div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between gap-6">
                 <div>
                   <div className="flex justify-between items-end mb-3">
                     <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Registered Attendees</div>
                     <div className={cn("text-xs font-bold", e.capacity.total - e.capacity.booked > 0 ? "text-primary" : "text-orange-500")}>
                       {e.capacity.total - e.capacity.booked > 0 ? `${e.capacity.total - e.capacity.booked} spots left` : 'Capacity Reached'}
                     </div>
                   </div>
                   
                   {/* Inline CSS progress bar for capacity */}
                   <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                     <div className={cn("h-full transition-all duration-500", e.capacity.booked >= e.capacity.total ? "bg-orange-500" : "bg-primary")} style={{ width: `${(e.capacity.booked / e.capacity.total) * 100}%` }} />
                   </div>

                   {e.attendees.length > 0 ? (
                     <div className="flex flex-wrap gap-2 mt-4">
                       {e.attendees.map((a:string, i:number) => <span key={i} className="text-[10px] uppercase tracking-wider font-bold bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border/50">{a}</span>)}
                     </div>
                   ) : (
                     <span className="text-sm text-muted-foreground italic">No colleagues registered yet.</span>
                   )}
                 </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={(ev) => toggleRegistration(e.id, ev)} className={cn("flex-1 py-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]", e.registered ? "bg-green-500/10 text-green-600 border border-green-500/30" : e.capacity.booked >= e.capacity.total ? (e.waitlist ? "bg-orange-500/10 text-orange-600 border border-orange-500/30" : "bg-background border border-border text-foreground hover:bg-muted") : "bg-primary text-primary-foreground shadow-sm hover:shadow-md")}>
                      {e.registered ? <><CheckCircle2 className="w-4 h-4"/> Registered</> : e.capacity.booked >= e.capacity.total ? (e.waitlist ? <><Clock className="w-4 h-4"/> On Waitlist</> : 'Join Waitlist') : 'Register'}
                   </button>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
         {activeEvent && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 pt-20">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveEvent(null)} />
             
             {events.filter((e:any) => e.id === activeEvent).map((e:any) => (
               <motion.div key={e.id} role="dialog" aria-modal="true" aria-label={e.title} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-card border border-border shadow-2xl rounded-[40px] flex flex-col w-full max-w-4xl max-h-[85vh] relative z-10 overflow-hidden">
                 
                 <div className="p-8 md:p-12 border-b border-border bg-muted/20 relative shrink-0">
                   <button onClick={() => setActiveEvent(null)} aria-label="Close event details" className="absolute top-8 right-8 w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm text-muted-foreground hover:text-foreground border border-border transition-colors hover:bg-muted"><X className="w-5 h-5"/></button>
                   <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-3 flex items-center gap-2"><Calendar className="w-3 h-3"/> {e.date} • {e.location}</div>
                   <h2 className="text-3xl md:text-5xl font-serif font-light pr-12 leading-tight">{e.title}</h2>
                 </div>

                 <div className="p-8 md:p-12 overflow-y-auto flex-1 bg-background space-y-12">
                   <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex gap-4 text-sm text-primary items-start">
                     <Info className="w-5 h-5 shrink-0 mt-0.5" />
                     <p className="leading-relaxed">Your registration is visible to other members to facilitate networking. Consider reviewing the attendee list beforehand.</p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div>
                       <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-6 flex items-center gap-2"><Clock className="w-4 h-4"/> Agenda</h4>
                       <div className="space-y-6">
                         {e.agenda?.map((ag:any, i:number) => (
                           <div key={i} className="flex gap-4 items-start group">
                             <div className="w-14 text-xs font-bold text-muted-foreground pt-0.5 tabular-nums group-hover:text-primary transition-colors">{ag.time}</div>
                             <div className="flex-1 text-sm font-medium text-foreground pb-6 border-b border-border last:border-0 last:pb-0">{ag.desc}</div>
                           </div>
                         ))}
                       </div>
                     </div>
                     <div className="space-y-10">
                       <div>
                         <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4"/> Speakers</h4>
                         <ul className="space-y-3">
                           {e.speakers?.map((s:string, i:number) => (
                             <li key={i} className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{s.charAt(0)}</div>
                               <span className="text-sm font-medium">{s}</span>
                             </li>
                           ))}
                         </ul>
                       </div>
                       <div>
                         <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4 flex items-center gap-2"><Target className="w-4 h-4"/> Audience</h4>
                         <div className="flex flex-wrap gap-2">
                           {e.audience?.map((a:string, i:number) => <span key={i} className="text-xs font-bold bg-muted px-4 py-1.5 rounded-full border border-border/50">{a}</span>)}
                         </div>
                       </div>
                     </div>
                   </div>

                 </div>

                 <div className="p-6 md:p-8 border-t border-border bg-card shrink-0 flex flex-col md:flex-row gap-6 items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full border border-border bg-muted/50 flex items-center justify-center">
                       <span className="text-xs font-bold text-foreground">{e.capacity.booked}/{e.capacity.total}</span>
                     </div>
                     <div>
                       <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Capacity</div>
                       <div className={cn("text-sm font-bold", e.capacity.total - e.capacity.booked > 0 ? "text-primary" : "text-orange-500")}>{e.capacity.total - e.capacity.booked > 0 ? `${e.capacity.total - e.capacity.booked} spots left` : 'Full'}</div>
                     </div>
                   </div>
                   <div className="flex flex-wrap justify-end gap-3 w-full md:w-auto">
                     {calendarAdded.includes(e.id) ? (
                       <span className="px-6 py-3.5 rounded-full border border-green-500/30 bg-green-500/10 font-bold text-sm text-green-600 flex items-center gap-2 whitespace-nowrap"><CheckCircle2 className="w-4 h-4"/> {t('portal_added_calendar', 'Added to Calendar')}</span>
                     ) : (
                       <button onClick={() => { setCalendarAdded(c => [...c, e.id]); showToast('Calendar invite added'); }} className="px-6 py-3.5 rounded-full border border-border font-bold text-sm bg-background shadow-sm hover:bg-muted transition-colors whitespace-nowrap">{t('portal_add_calendar', 'Add to Calendar')}</button>
                     )}
                      <button onClick={(ev) => toggleRegistration(e.id, ev)} className={cn("flex-1 md:flex-none px-8 py-3.5 rounded-full font-bold text-sm shadow-sm transition-all whitespace-nowrap", e.registered ? "bg-green-500/10 text-green-600 border border-green-500/30" : e.capacity.booked >= e.capacity.total ? (e.waitlist ? "bg-orange-500/10 text-orange-600 border border-orange-500/30" : "bg-background border border-border text-foreground hover:bg-muted") : "bg-primary text-primary-foreground")}>
                        {e.registered ? <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/> Registered</span> : e.capacity.booked >= e.capacity.total ? (e.waitlist ? <span className="flex items-center justify-center gap-2"><Clock className="w-4 h-4"/> On Waitlist</span> : 'Join Waitlist') : 'Register'}
                     </button>
                   </div>
                 </div>

               </motion.div>
             ))}
           </div>
         )}
       </AnimatePresence>
    </div>
  );
}
