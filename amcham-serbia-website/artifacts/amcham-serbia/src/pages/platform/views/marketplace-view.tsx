import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Plus, Target, CheckCircle2, X, Filter, BarChart3, MessageSquare, Clock, ArrowRight, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function MarketplaceView({ t, showToast }: any) {
  const { opportunities, setOpportunities } = usePortalState();
  const [activeTab, setActiveTab] = useState<'asks'|'offers'|'mine'>('asks');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [respondModalOpen, setRespondModalOpen] = useState<string | null>(null);
  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  
  const [newType, setNewType] = useState<'Ask'|'Offer'>('Offer');
  const [newTitle, setNewTitle] = useState('');
  const [newIntent, setNewIntent] = useState('');
  
  const [responseText, setResponseText] = useState('');
  const [respondedListings, setRespondedListings] = useState<string[]>([]);

  const currentListings = opportunities.filter((o: any) => {
    if (activeTab === 'mine' && o.author !== 'You') return false;
    if (activeTab !== 'mine' && o.type.toLowerCase() !== activeTab.replace(/s$/, '')) return false;
    if (categoryFilter && o.category !== categoryFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(opportunities.map((o:any) => o.category)));

  const handleCreate = () => {
    if(!newTitle || !newIntent) return;
    setOpportunities([...opportunities, {
      id: `new-${Date.now()}`, type: newType, title: newTitle, intent: newIntent, author: 'You', date: 'Just now', status: 'pending', category: 'General'
    }]);
    setNewModalOpen(false);
    setNewTitle(''); setNewIntent('');
    showToast(t('portal_listing_submitted', 'Listing submitted for staff review'));
    setActiveTab('mine');
  };

  const handleRespond = () => {
    if(!responseText || !respondModalOpen) return;
    setRespondedListings(prev => [...prev, respondModalOpen]);
    setRespondModalOpen(null);
    setResponseText('');
    showToast(t('portal_response_sent', 'Response sent securely via AmCham staff'));
  };

  const handleClose = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpportunities(opportunities.map((o: any) => o.id === id ? { ...o, status: 'closed' } : o));
    showToast(t('portal_listing_closed', 'Listing closed'));
  };

  const stats = {
    active: opportunities.filter((o:any) => o.status === 'active').length,
    mine: opportunities.filter((o:any) => o.author === 'You').length,
    responses: respondedListings.length,
  };

  return (
    <div className="space-y-8 pb-20">
       
       {/* KPI Header */}
       <div className="grid grid-cols-3 gap-4 mb-8">
         <div className="bg-card border border-border p-6 rounded-[32px] shadow-sm flex flex-col justify-between">
           <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_active_listings', 'Active Listings')}</div>
           <div className="flex items-end gap-3">
             <div className="text-4xl font-serif tabular-nums">{stats.active}</div>
             <div className="text-xs text-green-500 font-bold mb-1 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> 12%</div>
           </div>
         </div>
         <div className="bg-card border border-border p-6 rounded-[32px] shadow-sm flex flex-col justify-between">
           <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_my_listings', 'My Listings')}</div>
           <div className="text-4xl font-serif tabular-nums">{stats.mine}</div>
         </div>
         <div className="bg-card border border-border p-6 rounded-[32px] shadow-sm flex flex-col justify-between">
           <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_my_responses', 'My Responses')}</div>
           <div className="text-4xl font-serif tabular-nums">{stats.responses}</div>
         </div>
       </div>

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex gap-3">
           <button onClick={() => { setActiveTab('asks'); setCategoryFilter(null); }} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", activeTab === 'asks' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_asks', 'Asks')}</button>
           <button onClick={() => { setActiveTab('offers'); setCategoryFilter(null); }} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", activeTab === 'offers' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_offers', 'Offers')}</button>
           <button onClick={() => { setActiveTab('mine'); setCategoryFilter(null); }} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", activeTab === 'mine' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_my_listings', 'My Listings')}</button>
         </div>
         <button onClick={() => setNewModalOpen(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"><Plus className="w-4 h-4"/> {t('portal_new_listing', 'New Listing')}</button>
       </div>

       {/* Category Chips */}
       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
         <button onClick={() => setCategoryFilter(null)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border", categoryFilter === null ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted")}>{t('portal_all_categories', 'All Categories')}</button>
         {categories.map((cat:any) => (
           <button key={cat} onClick={() => setCategoryFilter(cat)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border", categoryFilter === cat ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted")}>{cat}</button>
         ))}
       </div>

       <div className="grid grid-cols-1 gap-4">
         {currentListings.length === 0 && (
           <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-3xl">
             {t('portal_no_listings', 'No listings found.')}
           </div>
         )}
         {currentListings.map((m:any) => {
           const isExpanded = expandedListing === m.id;
           const hasResponded = respondedListings.includes(m.id);

           return (
             <div key={m.id} className={cn("bg-card rounded-[32px] border shadow-sm transition-all overflow-hidden", m.status === 'closed' ? "border-border opacity-60" : "border-border hover:border-primary/30")}>
                <div onClick={() => setExpandedListing(isExpanded ? null : m.id)} className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={cn("text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full", m.type === 'Offer' ? 'bg-green-500/10 text-green-600' : 'bg-primary/10 text-primary')}>{m.type}</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{m.category}</span>
                      {m.status !== 'active' && <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-full ml-auto md:ml-0">{m.status}</span>}
                    </div>
                    <h3 className="text-2xl font-serif font-light text-foreground group-hover:text-primary transition-colors">{m.title}</h3>
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                      <span className="font-bold text-foreground">{m.author}</span> • {m.date}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-4">
                    {hasResponded && <span className="text-[10px] uppercase font-bold tracking-widest text-green-600 bg-green-500/10 px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {t('portal_responded', 'Responded')}</span>}
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-muted/10 border-t border-border">
                      <div className="p-6 md:p-8 space-y-6">
                        <div className="p-5 bg-background rounded-2xl border border-border shadow-sm">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 flex items-center gap-2"><Target className="w-3 h-3"/> {t('portal_intent', 'Intent / Details')}</div>
                          <p className="text-sm text-foreground leading-relaxed">{m.intent}</p>
                        </div>
                        
                        {hasResponded && (
                          <div className="p-5 bg-background rounded-2xl border border-border shadow-sm">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 flex items-center gap-2"><MessageSquare className="w-3 h-3"/> {t('portal_your_response', 'Your Response Thread')}</div>
                            <div className="bg-muted/50 p-4 rounded-xl text-sm italic text-muted-foreground">
                              {t('portal_response_sent_text', 'You securely responded to this listing. The author will follow up directly.')}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                          {activeTab === 'mine' ? (
                            m.status !== 'closed' && (
                              <button onClick={(e) => handleClose(m.id, e)} className="px-6 py-3 rounded-full font-bold text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">{t('portal_close_listing', 'Close Listing')}</button>
                            )
                          ) : (
                            m.status === 'active' && !hasResponded && (
                              <button onClick={(e) => { e.stopPropagation(); setRespondModalOpen(m.id); }} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2">
                                {t('portal_respond', 'Respond to Listing')} <ArrowRight className="w-4 h-4"/>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
           );
         })}
       </div>

       <div className="flex items-center justify-center p-6 bg-primary/5 rounded-[32px] border border-primary/10">
         <span className="text-xs font-bold text-primary flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> {t('portal_staff_review_notice', 'Listings and responses are securely brokered by AmCham staff.')}</span>
       </div>

       {/* Create Modal */}
       <AnimatePresence>
         {newModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setNewModalOpen(false)} />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border shadow-2xl rounded-[40px] p-8 md:p-12 w-full max-w-xl relative z-10">
               <button onClick={() => setNewModalOpen(false)} className="absolute top-8 right-8 text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
               <h3 className="text-3xl font-serif font-light mb-6">{t('portal_new_listing', 'New Listing')}</h3>
               
               <div className="space-y-4 mb-8">
                 <div className="flex gap-4 mb-4">
                   <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={newType==='Offer'} onChange={()=>setNewType('Offer')} className="accent-primary"/> {t('portal_offer', 'Offer')}</label>
                   <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={newType==='Ask'} onChange={()=>setNewType('Ask')} className="accent-primary"/> {t('portal_ask', 'Ask')}</label>
                 </div>
                 
                 <label className="block text-sm font-bold text-foreground">{t('portal_title', 'Title')}</label>
                 <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary" placeholder={t('portal_title_placeholder', 'Short and clear headline')} />
                 
                 <label className="block text-sm font-bold text-foreground mt-4">{t('portal_intent_details', 'Intent (Details)')}</label>
                 <textarea value={newIntent} onChange={e=>setNewIntent(e.target.value)} className="w-full h-24 bg-muted/30 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary resize-none" placeholder={t('portal_intent_placeholder', 'Provide context and what you\'re looking for...')}></textarea>
               </div>
               
               <div className="flex gap-4">
                 <button onClick={handleCreate} disabled={!newTitle || !newIntent} className="w-full px-6 py-3 rounded-full font-bold text-sm bg-primary text-primary-foreground disabled:opacity-50 transition-colors shadow-sm">{t('portal_submit_review', 'Submit for Review')}</button>
               </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>

       {/* Respond Modal */}
       <AnimatePresence>
         {respondModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setRespondModalOpen(null)} />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border shadow-2xl rounded-[40px] p-8 w-full max-w-lg relative z-10">
               <button onClick={() => setRespondModalOpen(null)} className="absolute top-8 right-8 text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
               <h3 className="text-2xl font-serif font-light mb-2">{t('portal_respond_listing', 'Respond to Listing')}</h3>
               <p className="text-sm text-muted-foreground mb-6">{t('portal_respond_desc', 'Your message will be securely routed through AmCham staff.')}</p>
               
               <textarea value={responseText} onChange={e=>setResponseText(e.target.value)} className="w-full h-32 bg-muted/30 border border-border rounded-xl p-4 text-sm focus:outline-none focus:border-primary resize-none mb-6" placeholder={t('portal_respond_placeholder', 'Hi, we can help with this...')}></textarea>
               
               <button onClick={handleRespond} disabled={!responseText} className="w-full px-6 py-3 rounded-full font-bold text-sm bg-primary text-primary-foreground disabled:opacity-50 transition-colors shadow-sm">{t('portal_send_response', 'Send Response')}</button>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
}
