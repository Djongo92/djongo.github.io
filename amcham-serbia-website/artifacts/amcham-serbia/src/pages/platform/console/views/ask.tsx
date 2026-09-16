import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData, Company, committeeRosters } from '@/data/platform';
import { Search, Download, ShieldCheck, Clock, Check, X, ArrowRight, Activity, Calendar, Building, Eye, UserMinus, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConsoleState } from '../console-state';
import { cn } from '@/lib/utils';

interface AppliedFilter {
  id: string;
  label: string;
  type: string;
}

interface DepartedMember {
  id: string;
  name: string;
  sector: string;
  tier: string;
  lastScore: number;
  departedDate: string;
  lastManager: string;
  reason: string;
}

// "12d ago" / "3w ago" / "2m ago" -> approximate days elapsed. Every
// lastInteraction string in the fixture data follows this shape.
function parseLastInteractionDays(s: string): number | null {
  const m = /(\d+)\s*(d|w|m)\s*ago/i.exec(s);
  if (!m) return null;
  const n = +m[1];
  const unit = m[2].toLowerCase();
  if (unit === 'd') return n;
  if (unit === 'w') return n * 7;
  return n * 30;
}

function runFixtureQuery(query: string, t: (path: string, fallback?: string) => string): { results: Company[]; departed: DepartedMember[] | null; explanation: string; applied: AppliedFilter[] } {
  const q = query.toLowerCase();
  let filtered = [...platformData.allMembers];
  const applied: AppliedFilter[] = [];

  const hasWord = (term: string) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(query);

  // Departure/churn questions get a fundamentally different answer shape (a
  // short, historical list, not a live company table) so they're resolved
  // first and short-circuit the rest of the filter chain entirely.
  const departedDaysMatch = /\b(?:left|departed|churned|canceled|cancelled)\b.*?\b(?:in the |over the )?(?:past|last)\s+(\d+)\s*days?\b/i.exec(query);
  const departedGeneric = /\bwho\s+(?:left|departed|churned|cancell?ed)\b|\bdeparted members?\b|\brecent (?:cancellations?|departures?|churn)\b|\bchurned members?\b/i.test(query);
  if (departedDaysMatch || departedGeneric) {
    const now = new Date();
    let departed = [...(platformData.console as any).departedMembers] as DepartedMember[];
    const departedApplied: AppliedFilter[] = [];
    if (departedDaysMatch) {
      const threshold = parseInt(departedDaysMatch[1], 10);
      departed = departed.filter(d => {
        const days = (now.getTime() - new Date(d.departedDate).getTime()) / 86400000;
        return days >= 0 && days <= threshold;
      });
      departedApplied.push({ id: `departed-${threshold}`, label: `Departed ≤ ${threshold}d ago`, type: 'departed' });
    } else {
      departedApplied.push({ id: 'departed-all', label: 'Departed members', type: 'departed' });
    }
    departed.sort((a, b) => new Date(b.departedDate).getTime() - new Date(a.departedDate).getTime());
    return {
      results: [],
      departed,
      explanation: departed.length === 0
        ? 'No departures matched that window.'
        : `${departed.length} departed member${departed.length === 1 ? '' : 's'} found.`,
      applied: departedApplied,
    };
  }

  const sectors = [...new Set(platformData.allMembers.map(c => c.sector))].sort((a, b) => b.length - a.length);
  const matchedSector = sectors.find(s => hasWord(s.toLowerCase()));
  if (matchedSector) { 
    filtered = filtered.filter(c => c.sector === matchedSector); 
    applied.push({ id: `sector-${matchedSector}`, label: `Sector: ${matchedSector}`, type: 'sector' }); 
  }

  const tiers = [...new Set(platformData.allMembers.map(c => String(c.tier)))].sort((a, b) => b.length - a.length);
  const matchedTier = tiers.find(tier => hasWord(tier.toLowerCase()) || (tier.toLowerCase() === 'patron' && /patrons?\b/i.test(query)));
  if (matchedTier) { 
    filtered = filtered.filter(c => String(c.tier) === matchedTier); 
    applied.push({ id: `tier-${matchedTier}`, label: `Tier: ${matchedTier}`, type: 'tier' }); 
  }

  if (/\bexporters?\b/i.test(query)) { 
    filtered = filtered.filter(c => c.exporter); 
    applied.push({ id: 'exporter-true', label: 'Exporters only', type: 'boolean' }); 
  }
  
  if (/\blow engagement\b|\blow score\b/i.test(query)) {
    filtered = filtered.filter(c => c.score < 60);
    applied.push({ id: 'score-low', label: 'Score < 60', type: 'metric' });
  }

  if (/\bbelow (the )?(book )?average\b/i.test(query)) {
    const bookAverage = Math.round(platformData.allMembers.reduce((sum, c) => sum + c.score, 0) / platformData.allMembers.length);
    filtered = filtered.filter(c => c.score < bookAverage);
    applied.push({ id: 'score-below-avg', label: `Score < book avg (${bookAverage})`, type: 'metric' });
  } else if (/\babove (the )?(book )?average\b/i.test(query)) {
    const bookAverage = Math.round(platformData.allMembers.reduce((sum, c) => sum + c.score, 0) / platformData.allMembers.length);
    filtered = filtered.filter(c => c.score >= bookAverage);
    applied.push({ id: 'score-above-avg', label: `Score ≥ book avg (${bookAverage})`, type: 'metric' });
  }

  if (/\bat.risk\b/i.test(query)) {
    filtered = filtered.filter(c => c.lifecycle === 'at-risk');
    applied.push({ id: 'lifecycle-at-risk', label: 'Lifecycle: at-risk', type: 'lifecycle' });
  }

  const contactDaysMatch = /\b(?:no contact|haven'?t (?:talked|spoken|been in touch)|not (?:talked|spoken)|no touchpoint)\b.*?\b(\d+)\s*days?\b/i.exec(query);
  if (contactDaysMatch) {
    const threshold = parseInt(contactDaysMatch[1], 10);
    filtered = filtered.filter(c => {
      const days = parseLastInteractionDays(c.lastInteraction);
      return days !== null && days >= threshold;
    });
    applied.push({ id: `contact-days-${threshold}`, label: `No contact ≥ ${threshold}d`, type: 'contact' });
  } else if (/\bstale contacts?\b|\bhaven'?t (?:talked|spoken|been in touch)\b|\bwho haven'?t i (?:talked|spoken)\b|\bno recent contact\b/i.test(query)) {
    filtered = filtered.filter(c => c.contactFreshness === 'stale');
    applied.push({ id: 'contact-stale', label: 'Contact: stale', type: 'contact' });
  }

  const joinedDaysMatch = /\bjoined\b.*?\b(?:in the |over the )?(?:past|last)\s+(\d+)\s*days?\b/i.exec(query);
  if (joinedDaysMatch) {
    const threshold = parseInt(joinedDaysMatch[1], 10);
    const now = new Date();
    filtered = filtered.filter(c => {
      const days = (now.getTime() - new Date(c.joinDate).getTime()) / 86400000;
      return days >= 0 && days <= threshold;
    });
    applied.push({ id: `joined-${threshold}`, label: `Joined ≤ ${threshold}d ago`, type: 'joined' });
  } else if (/\bnew members?\b|\brecently joined\b|\bnew joiners?\b/i.test(query)) {
    filtered = filtered.filter(c => c.lifecycle === 'onboarding');
    applied.push({ id: 'joined-onboarding', label: 'Lifecycle: onboarding', type: 'joined' });
  }

  const matchedCommittee = committeeRosters.find(cm => hasWord(cm.name.toLowerCase()) || query.toLowerCase().includes(cm.name.toLowerCase()));
  if (matchedCommittee) {
    const rosterIds = new Set([matchedCommittee.chairCompanyId, ...matchedCommittee.memberCompanyIds]);
    filtered = filtered.filter(c => rosterIds.has(c.id));
    applied.push({ id: `committee-${matchedCommittee.id}`, label: `Committee: ${matchedCommittee.name}`, type: 'committee' });
  }

  const renewalDays = /renewal[s]?\s+in\s+(\d+)\s+days/i.exec(query);
  if (renewalDays) {
    const horizon = new Date(); horizon.setDate(horizon.getDate() + parseInt(renewalDays[1], 10));
    filtered = filtered.filter(c => {
      const d = (c as any).renewalDate ? new Date((c as any).renewalDate) : null;
      return d && !isNaN(d.getTime()) && d >= new Date() && d <= horizon;
    });
    applied.push({ id: `renewal-${renewalDays[1]}`, label: `Renewal ≤ ${renewalDays[1]}d`, type: 'date' });
  } else if (/\brenewal[s]?\b/i.test(query)) {
    filtered = filtered.filter(c => (c as any).renewalDate);
    applied.push({ id: 'renewal-any', label: 'Has renewal', type: 'date' });
  }

  const location = platformData.allMembers.map(c => String(c.location)).filter(Boolean).sort((a, b) => b.length - a.length).find(loc => hasWord(loc.toLowerCase()));
  if (location) { 
    filtered = filtered.filter(c => c.location === location); 
    applied.push({ id: `location-${location}`, label: `Location: ${location}`, type: 'location' }); 
  }

  if (applied.length === 0) {
    return { results: [], departed: null, explanation: t('console_v2.ask_no_filter', 'No recognizable filter in this query. Try naming a sector, tier, location, "exporters", "low engagement", "below average", "haven\'t talked to in 30 days", "joined in the past 90 days", or "who left in the past 90 days".'), applied: [] };
  }
  return { results: filtered, departed: null, explanation: `${t('console_v2.ask_applied', 'Applied')} ${applied.length} filters — returning ${filtered.length} records.`, applied };
}

export function AskView({ showToast }: { showToast: (m:string) => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Company[] | null>(null);
  const [departed, setDeparted] = useState<DepartedMember[] | null>(null);
  const [explanation, setExplanation] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const { queueOutreach, isQueued } = useConsoleState();
  const [exported, setExported] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (e: React.FormEvent | null, overrideQuery?: string) => {
    e?.preventDefault();
    const q = overrideQuery ?? query;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setLoading(false);
      setResults(null);
      setDeparted(null);
      setExplanation('');
      setAppliedFilters([]);
      return;
    }
    setLoading(true);
    setExported(false);
    searchTimer.current = setTimeout(() => {
      setLoading(false);
      const { results: found, departed: departedFound, explanation: expl, applied } = runFixtureQuery(q, t);
      setResults(found);
      setDeparted(departedFound);
      setExplanation(expl);
      setAppliedFilters(applied);
    }, 800);
  };

  const removeFilter = (filter: AppliedFilter) => {
    let newQuery = query;
    if (filter.type === 'sector' || filter.type === 'tier' || filter.type === 'location') {
      const val = filter.label.split(': ')[1];
      newQuery = newQuery.replace(new RegExp(val, 'ig'), '').trim();
    } else if (filter.type === 'boolean') {
      newQuery = newQuery.replace(/exporters?/ig, '').trim();
    } else if (filter.type === 'metric') {
      newQuery = newQuery.replace(/low engagement|low score|(below|above) (the )?(book )?average/ig, '').trim();
    } else if (filter.type === 'date') {
      newQuery = newQuery.replace(/renewals?\s+in\s+\d+\s+days|renewals?/ig, '').trim();
    } else if (filter.type === 'lifecycle') {
      newQuery = newQuery.replace(/at.risk/ig, '').trim();
    } else if (filter.type === 'committee') {
      const val = filter.label.split(': ')[1];
      newQuery = newQuery.replace(new RegExp(val, 'ig'), '').trim();
    } else if (filter.type === 'contact') {
      newQuery = newQuery.replace(/(?:no contact|haven'?t (?:talked|spoken|been in touch)|not (?:talked|spoken)|no touchpoint).*?\d+\s*days?|stale contacts?|haven'?t (?:talked|spoken|been in touch)|who haven'?t i (?:talked|spoken)|no recent contact/ig, '').trim();
    } else if (filter.type === 'joined') {
      newQuery = newQuery.replace(/joined.*?(?:in the |over the )?(?:past|last)\s+\d+\s*days?|new members?|recently joined|new joiners?/ig, '').trim();
    } else if (filter.type === 'departed') {
      newQuery = '';
    }
    setQuery(newQuery);
    handleSearch(null as any, newQuery);
  };

  const drawerCompany = platformData.allMembers.find(m => m.id === drawerId);

  return (
    <div className="max-w-6xl mx-auto font-sans pb-20 flex flex-col h-full">
      <div className="mb-12">
        <h2 className="text-5xl font-serif font-light tracking-tight text-foreground mb-4">{t('platform.console.ask')}</h2>
        <p className="text-sm font-medium text-muted-foreground max-w-2xl">Governed analyst assistant. Results are strictly bounded by active permissions and cited to verifiable platform data.</p>
      </div>
      
      <form onSubmit={(e) => handleSearch(e)} className="mb-8 relative group">
        <div className="absolute inset-0 bg-primary/5 rounded-[40px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('platform.console.ask_placeholder', 'e.g. Manufacturing exporters in Kragujevac with low engagement')} 
          className="w-full bg-card border-2 border-border rounded-[40px] p-8 pl-12 pr-40 text-2xl text-foreground placeholder:text-muted-foreground shadow-sm focus:border-primary/50 outline-none font-light transition-all relative z-10"
        />
        <button type="submit" disabled={!query || loading} className="absolute right-6 top-1/2 -translate-y-1/2 bg-foreground text-background px-8 py-4 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 z-20 flex items-center gap-2">
          {loading ? "Searching..." : <><Search className="w-4 h-4"/> Query</>}
        </button>
      </form>

      {!results && !loading && (
        <div className="flex gap-4 flex-wrap">
          {["Manufacturing exporters in Kragujevac", "Patrons with renewal in 90 days", "IT companies with low engagement", "At-risk accounts", "Digital Economy committee members", "Legal sector companies in Belgrade", "Companies below the book average", "Startup tier companies", "Haven't talked to in 30 days", "Joined in the past 90 days", "Who left in the past 90 days"].map(q => (
            <button key={q} onClick={() => { setQuery(q); handleSearch(null as any, q); }} className="bg-background border border-border rounded-full px-5 py-3 text-sm font-bold text-foreground hover:border-primary hover:bg-primary/5 transition-colors shadow-sm flex items-center gap-2">
              <Search className="w-3 h-3 text-muted-foreground"/> {q}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin mb-8 shadow-lg"></div>
          <div className="text-sm font-bold text-primary uppercase tracking-widest animate-pulse flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Querying Knowledge Graph...</div>
        </div>
      )}

      <AnimatePresence>
        {results && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col space-y-6"
          >
            <div className="bg-card rounded-[40px] shadow-sm border border-border p-8 relative overflow-hidden flex flex-col flex-1">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 relative z-10 gap-6">
                <div>
                  <h3 className="text-4xl font-serif font-light text-foreground mb-4">
                    {departed !== null
                      ? (departed.length === 0 ? 'No Departures Found' : `${departed.length} Departed Member${departed.length === 1 ? '' : 's'}`)
                      : (results!.length === 0 ? t('console_v2.ask_no_matches', 'No matching companies') : `${results!.length} ${t('console_v2.ask_found', 'Results Found')}`)}
                  </h3>

                  {appliedFilters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">Filters Applied:</span>
                      {appliedFilters.map(f => (
                        <div key={f.id} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          {f.label}
                          <button onClick={() => removeFilter(f)} className="hover:bg-primary/20 p-0.5 rounded-full transition-colors ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                     <span className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border border-border/50"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Platform Fixture Data</span>
                  </div>
                </div>

                {departed === null && results && (
                  <div className="flex items-center gap-3">
                    {results.filter(c => !isQueued(c.id)).length > 0 && (
                      <button
                        onClick={() => {
                          const toQueue = results.filter(c => !isQueued(c.id));
                          toQueue.forEach(c => queueOutreach(c));
                          showToast(`Queued ${toQueue.length} for outreach`);
                        }}
                        className="text-sm font-bold bg-primary text-primary-foreground flex items-center gap-2 hover:bg-primary/90 px-6 py-3 rounded-full transition-colors shadow-md"
                      >
                        <Users className="w-4 h-4" /> Queue All ({results.filter(c => !isQueued(c.id)).length})
                      </button>
                    )}
                    {exported ? (
                      <span className="text-sm font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-2 px-6 py-3 rounded-full shadow-sm"><Check className="w-4 h-4" /> {t('console_v2.ask_export_ready', 'Export Ready')} ({results.length})</span>
                    ) : (
                      <button onClick={() => { if (results.length === 0) return; setExported(true); showToast("Exported to CSV"); }} disabled={results.length === 0} className="text-sm font-bold bg-background border border-border text-foreground flex items-center gap-2 hover:bg-muted px-6 py-3 rounded-full transition-colors shadow-sm disabled:opacity-50">
                        <Download className="w-4 h-4" /> Export CSV
                      </button>
                    )}
                  </div>
                )}
              </div>

              {departed !== null ? (
                <div className="flex-1 relative z-10 space-y-3">
                  {departed.length === 0 && (
                    <div className="text-muted-foreground font-medium italic text-center py-16 border border-dashed border-border rounded-3xl">No members departed in that window.</div>
                  )}
                  {departed.map(d => (
                    <div key={d.id} className="bg-background border border-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                      <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0"><UserMinus className="w-5 h-5" /></div>
                      <div className="flex-1">
                        <div className="font-bold text-lg text-foreground">{d.name}</div>
                        <div className="text-xs font-medium text-muted-foreground mt-0.5">{d.sector} · {d.tier} · last managed by {d.lastManager}</div>
                        <p className="text-sm text-foreground/80 mt-2">{d.reason}</p>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest"><Clock className="w-3 h-3" /> {new Date(d.departedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-sm font-serif tabular-nums text-muted-foreground">Last score: {d.lastScore}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="flex-1 overflow-x-auto relative z-10 bg-background rounded-3xl border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground sticky top-0 backdrop-blur-xl">
                    <tr>
                      <th className="px-6 py-4 font-bold rounded-tl-3xl">Company</th>
                      <th className="px-6 py-4 font-bold">Details</th>
                      <th className="px-6 py-4 font-bold">Score</th>
                      <th className="px-6 py-4 font-bold text-right rounded-tr-3xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {results!.map((c, i) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={c.id} 
                        className="transition-colors hover:bg-muted/30 group cursor-pointer"
                        onClick={() => setDrawerId(c.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-sm font-bold text-muted-foreground shadow-inner border border-border shrink-0">{c.avatar}</div>
                            <div>
                              <div className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{c.name}</div>
                              <div className="text-xs font-medium text-muted-foreground mt-0.5">{c.tier}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground/80">{c.sector}</div>
                          <div className="text-xs font-medium text-muted-foreground mt-0.5">{c.location}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="font-serif text-xl tabular-nums leading-none">{c.score}</div>
                             <div className={cn("text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md", c.scoreTrend > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>{c.scoreTrend > 0 ? `+${c.scoreTrend}` : c.scoreTrend}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-3" onClick={e => e.stopPropagation()}>
                             <button onClick={() => setDrawerId(c.id)} className="p-2 rounded-full hover:bg-background border border-transparent hover:border-border text-muted-foreground transition-colors shadow-sm opacity-0 group-hover:opacity-100">
                               <Eye className="w-4 h-4"/>
                             </button>
                             {isQueued(c.id) ? (
                               <span className="text-[10px] font-bold px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 uppercase tracking-widest"><Check className="w-3 h-3"/> Queued</span>
                             ) : (
                               <button onClick={() => { queueOutreach(c); showToast(`Added ${c.name} to Outreach queue`); }} className="text-[10px] font-bold uppercase tracking-widest bg-foreground px-4 py-2 rounded-full text-background hover:bg-foreground/90 transition-transform active:scale-95 shadow-md flex items-center gap-1">
                                 Queue <ArrowRight className="w-3 h-3"/>
                               </button>
                             )}
                           </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              <div className="mt-8 bg-muted p-5 rounded-3xl border border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10 shadow-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2"><Activity className="w-3 h-3"/> Provenance & Execution</div>
                  <div className="text-sm font-medium text-foreground">{explanation}</div>
                </div>
                <div className="text-xs font-bold bg-background px-3 py-1.5 rounded-lg border border-border text-muted-foreground whitespace-nowrap">
                   Execution Time: 0.8s
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

                <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Outreach Status</div>
                  {isQueued(drawerCompany.id) ? (
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-600"><Check className="w-4 h-4"/> Currently in Outreach Queue</div>
                  ) : (
                    <button onClick={() => { queueOutreach(drawerCompany); showToast(`Added ${drawerCompany.name} to Outreach queue`); }} className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl shadow-md hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center gap-2">
                       Add to Outreach Queue <ArrowRight className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
