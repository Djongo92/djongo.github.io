import React, { useState, useMemo } from 'react';
import { platformData, Company } from '@/data/platform';
import { Search, Mail, Download, Eye, SlidersHorizontal, Check, Building, Phone, Calendar, Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function AccountsView({ navigateTo }: any) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: keyof Company, dir: 'asc'|'desc'}>({ key: 'name', dir: 'asc' });
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const members = platformData.allMembers;
  const tiers = [...new Set(members.map(m => m.tier))];

  const filtered = useMemo(() => {
    let result = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.sector.toLowerCase().includes(search.toLowerCase()));
    if (tierFilter) result = result.filter(m => m.tier === tierFilter);
    
    return result.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [members, search, tierFilter, sortConfig]);

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) setSelected(selected.filter(s => s !== id));
    else setSelected([...selected, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(f => f.id));
  };

  const handleSort = (key: keyof Company) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const drawerCompany = members.find(m => m.id === drawerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 font-sans h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h2 className="text-4xl font-serif font-light mb-2 tracking-tight">Accounts Database</h2>
          <p className="text-sm font-medium text-muted-foreground">Filter, segment, and action the entire member list.</p>
        </div>
        <div className="flex gap-3 h-12">
          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.9, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: 20 }} className="flex gap-2">
                <button className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95">
                  <Mail className="w-4 h-4"/> Bulk Email ({selected.length})
                </button>
                <button className="flex items-center gap-2 px-6 py-2 bg-foreground text-background text-sm font-bold rounded-full shadow-md hover:bg-foreground/90 transition-transform active:scale-95">
                  <Download className="w-4 h-4"/> Export
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[32px] shadow-sm flex flex-col min-h-[60vh] flex-1 overflow-hidden relative">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 shrink-0 bg-muted/20">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search accounts, sectors..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-full text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm font-medium" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <button onClick={() => setTierFilter(null)} className={cn("px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors shadow-sm", tierFilter === null ? "bg-foreground text-background" : "bg-background border border-border text-foreground hover:bg-muted")}>All Tiers</button>
            {tiers.map(tier => (
              <button key={tier} onClick={() => setTierFilter(tier)} className={cn("px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors shadow-sm", tierFilter === tier ? "bg-foreground text-background" : "bg-background border border-border text-foreground hover:bg-muted")}>
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground sticky top-0 backdrop-blur-xl z-10">
              <tr>
                <th className="px-6 py-4 text-center w-14">
                  <div onClick={toggleAll} className={cn("w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors mx-auto shadow-sm", selected.length === filtered.length && filtered.length > 0 ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border")}>
                    {selected.length === filtered.length && filtered.length > 0 && <Check className="w-3 h-3"/>}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>Company {sortConfig.key === 'name' && (sortConfig.dir === 'asc' ? '↑' : '↓')}</th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('sector')}>Sector & Tier {sortConfig.key === 'sector' && (sortConfig.dir === 'asc' ? '↑' : '↓')}</th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('score')}>Score {sortConfig.key === 'score' && (sortConfig.dir === 'asc' ? '↑' : '↓')}</th>
                <th className="px-6 py-4 font-bold">Manager</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(m => {
                const isSelected = selected.includes(m.id);
                return (
                  <tr key={m.id} className={cn("transition-colors group", isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30")}>
                    <td className="px-6 py-4">
                      <div onClick={() => toggleSelect(m.id)} className={cn("w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors mx-auto shadow-sm", isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border group-hover:border-primary/50")}>
                        {isSelected && <Check className="w-3 h-3"/>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground border border-border shadow-inner shrink-0">{m.avatar}</div>
                        <div>
                          <div className="font-bold text-foreground text-base group-hover:text-primary transition-colors cursor-pointer" onClick={() => setDrawerId(m.id)}>{m.name}</div>
                          <div className="text-xs font-medium text-muted-foreground">{m.location} • {m.employees.toLocaleString()} emp</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground/80">{m.sector}</div>
                      <div className="text-xs font-medium text-muted-foreground mt-0.5">{m.tier}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-xl leading-none tabular-nums">{m.score}</span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums", m.scoreTrend > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>{m.scoreTrend > 0 ? `+${m.scoreTrend}` : m.scoreTrend}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-muted-foreground">{m.manager}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest inline-block border", m.lifecycle === 'at-risk' ? "bg-destructive/10 text-destructive border-destructive/20" : m.lifecycle === 'renewing' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-muted text-muted-foreground border-border")}>{m.lifecycle}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDrawerId(m.id)} className="px-4 py-2 rounded-full text-xs font-bold text-foreground bg-background border border-border hover:bg-muted shadow-sm transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-2 ml-auto"><Eye className="w-3 h-3"/> Quick View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-32 text-muted-foreground font-medium">No accounts match your criteria.</div>}
        </div>
      </div>

      <AnimatePresence>
        {drawerCompany && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" 
              onClick={() => setDrawerId(null)} 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border flex justify-between items-start bg-muted/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-background border border-border shadow-sm flex items-center justify-center text-2xl font-serif text-muted-foreground">{drawerCompany.avatar}</div>
                  <div>
                    <h3 className="text-2xl font-serif font-light text-foreground">{drawerCompany.name}</h3>
                    <p className="text-sm font-bold text-primary">{drawerCompany.tier} Tier</p>
                  </div>
                </div>
                <button onClick={() => setDrawerId(null)} className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors relative z-10 shadow-sm">
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div>
                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><Building className="w-3 h-3" /> Company Profile</div>
                   <p className="text-sm font-medium text-foreground leading-relaxed bg-muted/50 p-4 rounded-2xl border border-border/50">{drawerCompany.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-background border border-border p-4 rounded-2xl shadow-sm">
                     <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Renewal</div>
                     <div className="font-serif text-lg text-foreground">{drawerCompany.renewalDate}</div>
                   </div>
                   <div className="bg-background border border-border p-4 rounded-2xl shadow-sm">
                     <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Score</div>
                     <div className="flex items-center gap-2">
                       <span className="font-serif text-lg text-foreground">{drawerCompany.score}</span>
                       <span className={cn("text-xs font-bold", drawerCompany.scoreTrend > 0 ? "text-emerald-500" : "text-destructive")}>{drawerCompany.scoreTrend > 0 ? '+' : ''}{drawerCompany.scoreTrend}</span>
                     </div>
                   </div>
                </div>

                <div>
                   <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><Phone className="w-3 h-3" /> Account Management</div>
                   <div className="bg-background border border-border p-4 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground">Manager</span>
                        <span className="text-sm font-bold text-foreground">{drawerCompany.manager}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground">Contact Freshness</span>
                        <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest", drawerCompany.contactFreshness === 'fresh' ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>{drawerCompany.contactFreshness}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground">Last Interaction</span>
                        <span className="text-sm font-medium text-foreground">{drawerCompany.lastInteraction}</span>
                      </div>
                   </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-border bg-background shrink-0 flex gap-3">
                 <button onClick={() => { setDrawerId(null); navigateTo('heatmap', drawerCompany.id); }} className="flex-1 py-3 bg-foreground text-background font-bold text-sm rounded-full shadow-md hover:bg-foreground/90 transition-transform active:scale-95">Full Dossier</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
