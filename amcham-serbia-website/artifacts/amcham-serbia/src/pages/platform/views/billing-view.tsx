import React, { useState, useEffect } from 'react';
import { usePortalState } from '../portal-state';
import { CreditCard, Download, Edit2, ShieldCheck, X, ChevronDown, ChevronUp, LifeBuoy, TrendingUp, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function TicketDrawer({ ticket, onClose }: { ticket: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-md bg-card border-l border-border h-full overflow-y-auto shadow-2xl p-8">
        <button onClick={onClose} className="absolute top-8 right-8 text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{ticket.id}</div>
        <h3 className="text-2xl font-serif font-light mb-6 pr-8">{ticket.title}</h3>
        
        <div className="bg-muted/30 rounded-3xl p-6 border border-border mb-8">
           <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">Status Timeline</div>
           <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:h-full before:w-px before:bg-border">
             {ticket.timeline.map((event:any, idx:number) => (
                <div key={idx} className="relative flex gap-4">
                  <div className={cn("w-6 h-6 rounded-full border-4 border-card shrink-0 z-10 -ml-1.5 mt-0.5", idx === ticket.timeline.length - 1 ? "bg-primary" : "bg-muted-foreground")} />
                  <div>
                    <div className="font-bold text-sm mb-0.5">{event.status}</div>
                    <div className="text-xs text-muted-foreground mb-1">{event.time}</div>
                    <div className="text-sm">{event.desc}</div>
                  </div>
                </div>
             ))}
           </div>
        </div>
        
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6">
           <h4 className="font-bold text-sm mb-2 text-primary">Need more help?</h4>
           <p className="text-sm text-muted-foreground mb-4">Reply to this ticket to add more context or escalate to your membership manager.</p>
           <button className="w-full px-6 py-3 bg-background border border-border hover:bg-muted text-foreground rounded-full font-bold text-sm transition-colors">Add Reply</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function BillingView({ t, showToast }: any) {
  const { billing, setBilling } = usePortalState();
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadedInvoices, setDownloadedInvoices] = useState<string[]>([]);
  const [ticketCreated, setTicketCreated] = useState(false);
  
  const [spendExpanded, setSpendExpanded] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const toggleAutoRenew = () => {
    setBilling({ ...billing, autoRenew: !billing.autoRenew });
    showToast(billing.autoRenew ? 'Auto-renew disabled' : 'Auto-renew enabled');
  };

  const spendData = {
    total: "€24,500",
    trend: "+12%",
    categories: [
      { name: "Membership", amount: 18000, color: "bg-[#40D9F1]", pct: 73 },
      { name: "Sponsorships", amount: 5000, color: "bg-primary", pct: 20 },
      { name: "Events", amount: 1500, color: "bg-muted-foreground", pct: 7 }
    ]
  };

  const supportTickets = [
    { id: "SUP-1104", title: "Invoice #INV-2025-0104 query", status: "In Progress", date: "Oct 01, 2026", timeline: [
      { status: "Opened", time: "Oct 01, 14:20", desc: "Ticket created by Marko." },
      { status: "In Progress", time: "Oct 02, 09:15", desc: "Investigating charge discrepancies." }
    ]},
    { id: "SUP-1092", title: "Update billing address", status: "Resolved", date: "Sep 10, 2026", timeline: [
      { status: "Opened", time: "Sep 10, 10:00", desc: "Ticket created by Ana." },
      { status: "In Progress", time: "Sep 10, 11:30", desc: "Assigned to Billing team." },
      { status: "Resolved", time: "Sep 11, 09:00", desc: "Address updated in system." }
    ]}
  ];

  const getInvoiceDetails = (id: string) => [
    { item: "Annual Membership Fee", amount: "€4,000" },
    { item: "Gala Dinner Table (10 seats)", amount: "€500" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* SPEND ANALYTICS */}
      <div className="bg-card border border-border p-8 md:p-10 rounded-[40px] shadow-sm cursor-pointer hover:shadow-md transition-all group" onClick={() => setSpendExpanded(!spendExpanded)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">YTD Spend Analytics</div>
            <div className="flex items-end gap-4">
              <h2 className="text-4xl md:text-5xl font-serif font-light tabular-nums">{spendData.total}</h2>
              <span className="text-sm font-bold text-green-500 mb-2 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> {spendData.trend}</span>
            </div>
          </div>
          <div className="flex-1 w-full md:max-w-xs flex flex-col gap-2 md:mr-8">
            <div className="flex w-full h-3 rounded-full overflow-hidden bg-muted">
              {spendData.categories.map(c => <div key={c.name} className={cn("h-full", c.color)} style={{ width: `${c.pct}%` }} />)}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {spendData.categories.map(c => <div key={c.name} className="flex items-center gap-1"><div className={cn("w-2 h-2 rounded-full", c.color)}/>{c.name}</div>)}
            </div>
          </div>
          <button className="p-2 bg-muted/50 rounded-full group-hover:bg-muted text-foreground transition-colors shrink-0 hidden md:block">
            {spendExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
          </button>
        </div>
        
        <AnimatePresence>
          {spendExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-8 border-t border-border mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {spendData.categories.map(c => (
                  <div key={c.name} className="p-5 bg-muted/30 rounded-3xl border border-border">
                    <div className="flex items-center gap-2 mb-2">
                       <div className={cn("w-3 h-3 rounded-full", c.color)} />
                       <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{c.name}</div>
                    </div>
                    <div className="text-2xl font-serif font-light tabular-nums mb-1">€{(c.amount).toLocaleString()}</div>
                    <div className="text-xs font-bold text-muted-foreground">{c.pct}% of total spend</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-foreground text-background p-8 md:p-12 rounded-[40px] shadow-xl relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#40D9F1]/10 pointer-events-none" />
          <div className="relative z-10 mb-8">
            <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Renewal Status</div>
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-2">Oct 15, 2026</h2>
            <p className="text-background/80 text-sm">Your next renewal date. (42 days away)</p>
          </div>
          
          <div className="relative z-10 flex items-center justify-between pt-6 border-t border-background/20 mt-auto">
             <div className="text-sm font-bold">Auto-Renew</div>
             <button onClick={toggleAutoRenew} className={cn("w-12 h-6 rounded-full transition-colors relative", billing.autoRenew ? "bg-[#40D9F1]" : "bg-background/20")}>
               <motion.div animate={{ x: billing.autoRenew ? 24 : 2 }} className="w-5 h-5 bg-background rounded-full absolute top-0.5" />
             </button>
          </div>
        </div>

        <div className="bg-card border border-border p-8 md:p-10 rounded-[40px] shadow-sm flex flex-col justify-between">
           <div>
             <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-6">Payment Method</div>
             <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
               <CreditCard className="w-6 h-6 text-primary" />
               <div className="font-bold text-sm text-foreground">{billing.paymentMethod}</div>
             </div>
           </div>
           
           <div className="mt-8 pt-6 border-t border-border">
             <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-primary flex items-center gap-2 hover:underline"><Edit2 className="w-3 h-3"/> Update Payment Method</button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INVOICE HISTORY */}
        <div className="lg:col-span-2 bg-card border border-border rounded-[40px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-border flex items-center justify-between">
            <h3 className="font-serif text-2xl font-light">Invoice History</h3>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Click row to expand</div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/20 border-b border-border">
                <tr>
                  <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Date</th>
                  <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Invoice #</th>
                  <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Amount</th>
                  <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status</th>
                  <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {billing.invoices.map((inv:any) => (
                  <React.Fragment key={inv.id}>
                    <tr onClick={() => setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id)} className="hover:bg-muted/10 transition-colors cursor-pointer group">
                      <td className="p-6 font-bold text-sm text-foreground flex items-center gap-2">
                        {expandedInvoiceId === inv.id ? <ChevronDown className="w-4 h-4 text-muted-foreground"/> : <ChevronUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"/>}
                        {inv.date}
                      </td>
                      <td className="p-6 text-sm text-muted-foreground">{inv.id}</td>
                      <td className="p-6 text-sm font-medium tabular-nums">{inv.amount}</td>
                      <td className="p-6">
                        <span className="text-[10px] uppercase font-bold tracking-widest bg-green-500/10 text-green-600 px-3 py-1 rounded-full">{inv.status}</span>
                      </td>
                      <td className="p-6 text-right">
                        {downloadedInvoices.includes(inv.id) ? (
                          <span className="text-xs font-bold text-green-600 flex items-center justify-end gap-1 ml-auto"><ShieldCheck className="w-3 h-3"/> {t('portal_downloaded', 'Downloaded ✓')}</span>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setDownloadedInvoices(d => [...d, inv.id]); showToast(`Invoice ${inv.id} downloaded`); }} className="text-xs font-bold text-primary flex items-center justify-end gap-1 ml-auto hover:underline"><Download className="w-3 h-3"/> PDF</button>
                        )}
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedInvoiceId === inv.id && (
                        <tr>
                          <td colSpan={5} className="p-0 border-b border-border">
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-muted/5">
                              <div className="px-6 md:px-12 py-6 grid gap-4">
                                 <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-2">Line Items</div>
                                 {getInvoiceDetails(inv.id).map((li, i) => (
                                   <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                                     <span className="text-sm font-medium text-muted-foreground">{li.item}</span>
                                     <span className="text-sm font-bold tabular-nums">{li.amount}</span>
                                   </div>
                                 ))}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUPPORT TICKETS */}
        <div className="bg-card border border-border rounded-[40px] shadow-sm overflow-hidden p-8 flex flex-col">
           <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-6">Support Tickets</div>
           <div className="space-y-4 flex-1">
             {supportTickets.map(ticket => (
               <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="p-4 rounded-2xl border border-border hover:border-primary/50 cursor-pointer transition-colors flex flex-col gap-3 group">
                 <div className="flex items-start justify-between gap-4">
                   <div>
                     <div className="font-bold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">{ticket.title}</div>
                     <div className="text-xs text-muted-foreground">{ticket.id} &bull; {ticket.date}</div>
                   </div>
                   <span className={cn("text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full shrink-0", ticket.status === 'Resolved' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600")}>{ticket.status}</span>
                 </div>
               </div>
             ))}
           </div>
           <button onClick={() => setModalOpen(true)} className="mt-6 w-full py-3 bg-muted/50 hover:bg-muted rounded-full text-xs font-bold text-foreground transition-colors flex items-center justify-center gap-2">
             <LifeBuoy className="w-4 h-4"/> New Ticket
           </button>
        </div>

      </div>

      {/* Payment Method Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div role="dialog" aria-modal="true" aria-label="Update payment method" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border shadow-2xl rounded-[40px] p-8 md:p-12 w-full max-w-md relative z-10">
              <button onClick={() => setModalOpen(false)} aria-label="Close dialog" className="absolute top-8 right-8 text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
              <h3 className="text-3xl font-serif font-light mb-2">Update Payment</h3>
              <p className="text-sm text-muted-foreground mb-8">Contact AmCham staff to update banking details or switch to card payments.</p>
              
              {ticketCreated ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
                  <div className="text-sm font-bold text-green-600 mb-1">{t('portal_ticket_created', 'Ticket #SUP-2481 Created')}</div>
                  <div className="text-xs text-muted-foreground">{t('portal_ticket_eta', 'Billing team will respond within 1 business day.')}</div>
                </div>
              ) : (
                <button onClick={() => { setTicketCreated(true); showToast('Support ticket created'); }} className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all">{t('portal_request_support', 'Request Billing Support')}</button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {selectedTicket && (
            <TicketDrawer ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
         )}
      </AnimatePresence>
    </div>
  );
}
