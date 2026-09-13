import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Search, Filter, Zap, Clock, ArrowRight, X, UserPlus, CheckCircle2, ChevronRight, BarChart3, ArrowUpRight, MapPin, Briefcase, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function DirectoryView({ t, showToast }: any) {
  const { directory, setDirectory } = usePortalState();
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'saved' | 'pending'>('all');
  
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [requestContext, setRequestContext] = useState('');

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDirectory(directory.map((d: any) => d.id === id ? { ...d, saved: !d.saved } : d));
    showToast(t('portal_saved_network', 'Saved to your network'));
  };

  const handleRequestSubmit = () => {
    if (!requestContext.trim() || !selectedMember) return;
    setDirectory(directory.map((d: any) => d.id === selectedMember.id ? { ...d, reqStatus: 'pending' } : d));
    const name = selectedMember.name;
    setSelectedMember(null);
    setRequestContext('');
    showToast(`${t('portal_intro_sent', 'Intro request sent to')} ${name}`);
  };

  const filtered = directory.filter((d:any) => {
    if (viewMode === 'saved' && !d.saved) return false;
    if (viewMode === 'pending' && d.reqStatus !== 'pending') return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.sector.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTier && d.tier !== filterTier) return false;
    if (filterSector && d.sector !== filterSector) return false;
    return true;
  });

  const stats = {
    total: directory.length,
    saved: directory.filter((d:any) => d.saved).length,
    pending: directory.filter((d:any) => d.reqStatus === 'pending').length,
  };

  const sectors = directory.reduce((acc:any, curr:any) => {
    acc[curr.sector] = (acc[curr.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSectors = Object.entries(sectors).sort((a:any, b:any) => b[1] - a[1]).slice(0, 4);
  const maxSectorVal = Math.max(...topSectors.map((s:any) => s[1] as number));

  return (
    <div className="space-y-6 relative pb-20">
       
       {/* KPI Toggle Strip */}
       <div className="grid grid-cols-3 gap-4 mb-8">
         <button onClick={() => setViewMode('all')} className={cn("text-left p-6 rounded-[32px] border transition-all relative overflow-hidden", viewMode === 'all' ? "bg-foreground text-background border-foreground shadow-md" : "bg-card border-border hover:border-primary/30")}>
           <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-2 transition-opacity", viewMode === 'all' ? "text-background/80" : "text-muted-foreground")}>{t('portal_all_members', 'All Members')}</div>
           <div className="text-4xl font-serif tabular-nums">{stats.total}</div>
           {viewMode === 'all' && <div className="absolute right-0 bottom-0 w-24 h-24 bg-background/10 rounded-full translate-x-8 translate-y-8" />}
         </button>
         <button onClick={() => setViewMode('saved')} className={cn("text-left p-6 rounded-[32px] border transition-all relative overflow-hidden", viewMode === 'saved' ? "bg-foreground text-background border-foreground shadow-md" : "bg-card border-border hover:border-primary/30")}>
           <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-2 transition-opacity", viewMode === 'saved' ? "text-background/80" : "text-muted-foreground")}>{t('portal_saved_network', 'My Network')}</div>
           <div className="text-4xl font-serif tabular-nums">{stats.saved}</div>
           {viewMode === 'saved' && <div className="absolute right-0 bottom-0 w-24 h-24 bg-background/10 rounded-full translate-x-8 translate-y-8" />}
         </button>
         <button onClick={() => setViewMode('pending')} className={cn("text-left p-6 rounded-[32px] border transition-all relative overflow-hidden", viewMode === 'pending' ? "bg-foreground text-background border-foreground shadow-md" : "bg-card border-border hover:border-primary/30")}>
           <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-2 transition-opacity", viewMode === 'pending' ? "text-background/80" : "text-muted-foreground")}>{t('portal_pending_intros', 'Pending Intros')}</div>
           <div className="text-4xl font-serif tabular-nums">{stats.pending}</div>
           {viewMode === 'pending' && <div className="absolute right-0 bottom-0 w-24 h-24 bg-background/10 rounded-full translate-x-8 translate-y-8" />}
         </button>
       </div>

       <div className="flex flex-col md:flex-row gap-8 mb-8">
         <div className="md:w-3/4 space-y-4">
           {/* Filters */}
           <div className="flex flex-col md:flex-row gap-4 mb-4">
             <div className="flex-1 relative">
               <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
               <input 
                 type="text" 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder={t('portal_search_members', 'Search members or sectors...')}
                 className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-full shadow-sm text-sm focus:outline-none focus:border-primary transition-colors" 
               />
             </div>
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 shrink-0">
               <select 
                 className="px-6 py-4 bg-card border border-border rounded-full shadow-sm text-sm font-bold focus:outline-none appearance-none cursor-pointer text-foreground"
                 onChange={(e) => setFilterSector(e.target.value || null)}
                 value={filterSector || ""}
               >
                 <option value="">{t('portal_all_sectors', 'All Sectors')}</option>
                 <option value="Finance">Finance</option>
                 <option value="IT">IT</option>
                 <option value="Logistics">Logistics</option>
                 <option value="FMCG">FMCG</option>
                 <option value="Manufacturing">Manufacturing</option>
               </select>
               <button onClick={() => setFilterTier(filterTier ? null : 'Patron')} className={cn("px-6 py-4 border rounded-full shadow-sm transition-colors flex items-center gap-2 font-bold text-sm whitespace-nowrap", filterTier ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:bg-muted text-foreground")}>
                 <Filter className="w-4 h-4" /> {t('portal_tier_patron', 'Tier: Patron')}
               </button>
             </div>
           </div>

           {/* Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {filtered.length === 0 && (
               <div className="col-span-1 md:col-span-2 text-center p-12 text-muted-foreground border border-dashed border-border rounded-3xl">
                  {t('portal_no_members_found', 'No members found matching your criteria.')}
               </div>
             )}
             {filtered.map((d:any) => (
               <div key={d.id} onClick={() => setSelectedMember(d)} className="bg-card p-8 rounded-[32px] border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col relative cursor-pointer group">
                  <button 
                    onClick={(e) => toggleSave(d.id, e)} 
                    className={cn("absolute top-6 right-6 p-2 rounded-full transition-colors z-10", d.saved ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={d.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </button>
                  
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-muted px-3 py-1 rounded-full">{d.sector}</span>
                  </div>
                  <h3 className="text-2xl font-serif font-light text-foreground mb-1 group-hover:text-primary transition-colors">{d.name}</h3>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-primary mb-4">{d.tier}</div>
                  
                  <p className="text-sm text-muted-foreground flex-1 mb-6 leading-relaxed line-clamp-3">{d.description}</p>
                  
                  {d.reqStatus === 'pending' ? (
                    <div className="w-full py-3 bg-muted text-muted-foreground rounded-full font-bold text-xs text-center border border-border flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4"/> {t('portal_request_pending', 'Request Pending')}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs font-bold text-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                      {t('portal_view_profile', 'View Profile')} <ChevronRight className="w-4 h-4 ml-1"/>
                    </div>
                  )}
               </div>
             ))}
           </div>
         </div>

         {/* Sector Mini-bars Sidebar */}
         <div className="md:w-1/4">
            <div className="bg-card border border-border rounded-[32px] p-6 shadow-sm sticky top-8">
               <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> {t('portal_sector_distribution', 'Sector Distribution')}</div>
               <div className="space-y-4">
                 {topSectors.map(([sector, count]: any, i) => (
                   <div key={i}>
                     <div className="flex justify-between text-xs font-medium mb-1.5">
                       <span className="text-foreground">{sector}</span>
                       <span className="text-muted-foreground tabular-nums">{count}</span>
                     </div>
                     <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                       <div className="h-full bg-primary rounded-full" style={{ width: `${(count / maxSectorVal) * 100}%` }} />
                     </div>
                   </div>
                 ))}
               </div>
            </div>
         </div>
       </div>

       {/* Rich Detail Drawer */}
       <AnimatePresence>
         {selectedMember && (
           <div className="fixed inset-0 z-50 flex justify-end">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setSelectedMember(null); setRequestContext(''); }} />
             <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="bg-card w-full max-w-lg h-full border-l border-border shadow-2xl relative z-10 flex flex-col overflow-y-auto">
               
               <div className="p-8 border-b border-border bg-muted/10 relative">
                 <button onClick={() => { setSelectedMember(null); setRequestContext(''); }} className="absolute top-6 right-6 p-2 bg-background border border-border rounded-full hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground"/></button>
                 
                 <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mb-6">{selectedMember.avatar || selectedMember.name.charAt(0)}</div>
                 <div className="flex items-center gap-2 mb-2">
                   <h2 className="text-3xl font-serif font-light">{selectedMember.name}</h2>
                   {selectedMember.tier === 'Patron' && <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500/20"/>}
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                   <span>{selectedMember.sector}</span>
                   <span>•</span>
                   <span>{selectedMember.tier}</span>
                 </div>
               </div>

               <div className="p-8 space-y-8 flex-1">
                 <div>
                   <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3">{t('portal_about', 'About')}</h4>
                   <p className="text-sm text-foreground leading-relaxed">{selectedMember.description}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-start gap-3">
                     <MapPin className="w-4 h-4 text-primary mt-0.5" />
                     <div>
                       <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">{t('portal_location', 'Location')}</div>
                       <div className="text-sm font-bold">{selectedMember.location || 'Belgrade'}</div>
                     </div>
                   </div>
                   <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-start gap-3">
                     <Briefcase className="w-4 h-4 text-primary mt-0.5" />
                     <div>
                       <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">{t('portal_employees', 'Employees')}</div>
                       <div className="text-sm font-bold tabular-nums">{selectedMember.employees || '500+'}</div>
                     </div>
                   </div>
                 </div>

                 {parseInt(selectedMember.score) >= 80 && (
                   <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl">
                     <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-2 flex items-center gap-2"><Zap className="w-3 h-3"/> {t('portal_strong_overlap', 'Strong Match')}</div>
                     <p className="text-xs text-foreground font-medium">{t('portal_match_rationale', 'This member shares 3 advocacy priorities with your profile and is active in the same working groups.')}</p>
                   </div>
                 )}

                 {selectedMember.reqStatus === 'pending' ? (
                    <div className="p-6 bg-muted rounded-[24px] border border-border text-center">
                      <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2"/>
                      <h4 className="font-bold text-sm mb-1">{t('portal_intro_pending', 'Introduction Pending')}</h4>
                      <p className="text-xs text-muted-foreground mb-4">{t('portal_intro_pending_desc', 'AmCham staff is currently reviewing this request.')}</p>
                      <button onClick={() => {
                         setDirectory(directory.map((item: any) => item.id === selectedMember.id ? { ...item, reqStatus: 'none' } : item));
                         showToast(t('portal_request_cancelled', 'Request Cancelled'));
                         setSelectedMember(null);
                      }} className="px-5 py-2 bg-background border border-border rounded-full text-xs font-bold hover:bg-muted transition-colors">{t('portal_cancel_request', 'Cancel Request')}</button>
                    </div>
                 ) : (
                    <div className="bg-card border border-border p-6 rounded-[24px] shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-3 flex items-center gap-2"><Mail className="w-3 h-3"/> {t('portal_request_intro', 'Request Introduction')}</div>
                      <p className="text-xs text-muted-foreground mb-4">{t('portal_intro_desc', 'AmCham staff will broker this connection based on shared interests. Mutual consent is required.')}</p>
                      <textarea 
                        className="w-full h-24 bg-muted/30 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary resize-none mb-4"
                        placeholder={t('portal_intro_placeholder', 'E.g., We are looking for logistics partners...')}
                        value={requestContext}
                        onChange={(e) => setRequestContext(e.target.value)}
                      ></textarea>
                      <button onClick={handleRequestSubmit} disabled={!requestContext.trim()} className="w-full px-6 py-3 rounded-full font-bold text-sm bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2">
                        {t('portal_send_request', 'Send Request')} <ArrowRight className="w-4 h-4"/>
                      </button>
                    </div>
                 )}
               </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
}
