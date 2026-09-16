import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { cn } from '@/lib/utils';
import { Users, BarChart, TrendingUp, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle, Clock, ChevronDown, Activity, Info, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MyTeamView({ navigateTo, showToast }: any) {
  const { t } = useI18n();
  const [team, setTeam] = useState(platformData.console.team);
  const [balanced, setBalanced] = useState(false);
  const [coached, setCoached] = useState<string[]>([]);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showMath, setShowMath] = useState(false);
  const [reassignments, setReassignments] = useState<Record<string, string>>({});

  // A company is a coverage gap when its manager isn't one of the real
  // staffers on this team — an owner the book-size/workload math above
  // never actually accounts for. Scoped to Patron tier ("key accounts")
  // so the alert stays actionable rather than flagging every member company.
  const teamNames = new Set(team.map(m => m.name));
  const coverageGaps = platformData.allMembers.filter(c => c.tier === 'Patron' && !teamNames.has(c.manager) && !reassignments[c.id]);

  const reassign = (companyId: string, staffName: string) => {
    setReassignments(prev => ({ ...prev, [companyId]: staffName }));
    showToast(`Reassigned to ${staffName}`);
  };

  const handleReassign = () => {
    if (balanced) return;
    const parse = (w: string) => parseInt(w, 10) || 0;
    const values = team.map(m => parse(m.workload));
    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    const target = team.map(m => {
      const v = parse(m.workload);
      // Ensure it clamps to +-5% and the spread is <= 10
      let newW = v;
      if (v > avg + 5) newW = avg + 5;
      else if (v < avg - 5) newW = avg - 5;
      return { ...m, workload: `${newW}%` };
    });
    const result = target.map(m => parse(m.workload));
    const spread = Math.max(...result) - Math.min(...result);
    if (spread > 10) {
      showToast("Cannot balance: standard deviation too high");
      return;
    }
    setTeam(target);
    setBalanced(true);
    showToast("Workload rebalanced across the team");
  };

  const handleCoach = (memberId: string, name: string) => {
    if (coached.includes(memberId)) return;
    setCoached(prev => [...prev, memberId]);
    showToast(`Coaching session logged for ${name}`);
  };

  const toggleExpand = (id: string) => {
    setExpandedMember(expandedMember === id ? null : id);
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">My Team</h2>
          <p className="text-muted-foreground">Manage workload and member success operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMath(!showMath)} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors border", showMath ? "bg-foreground text-background border-foreground shadow-md" : "bg-card text-muted-foreground border-border hover:border-foreground/30")}>
            <Info className="w-4 h-4" />
          </button>
          <button onClick={handleReassign} disabled={balanced} className={cn("px-6 py-3 rounded-full text-sm font-bold shadow-md transition-all flex items-center gap-2", balanced ? "bg-green-500/10 text-green-600 border border-green-500/20 cursor-default" : "bg-foreground text-background hover:bg-foreground/90 active:scale-95")}>
            {balanced ? <><CheckCircle className="w-4 h-4"/> {t('console_v2.team_balanced', 'Workload Balanced')}</> : <><Activity className="w-4 h-4"/> {t('console_v2.team_reassign', 'Auto-Balance Workload')}</>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMath && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-foreground text-background p-6 rounded-[32px] shadow-lg mb-6 flex flex-col md:flex-row gap-8 items-center border border-foreground">
              <div className="flex-1">
                <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-2">Distribution Logic</div>
                <h3 className="text-xl font-serif mb-2">How auto-balance works</h3>
                <p className="text-background/80 text-sm leading-relaxed">The algorithm calculates the true team average workload and redistributes active cases to ensure no team member is more than <span className="font-bold text-white">±5%</span> away from the mean. It will refuse to run if the standard deviation results in a spread <span className="font-bold text-white">&gt; 10%</span> after adjustment.</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-serif text-[#40D9F1]">±5</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-background/60">Clamp limit</div>
                </div>
                <div className="w-px bg-background/20 h-12 self-center"></div>
                <div className="text-center">
                  <div className="text-3xl font-serif text-[#40D9F1]">≤10</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-background/60">Max spread</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Book Size", value: "172", trend: "+17", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Avg Compliance", value: "92%", trend: "+2%", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Rituals Completed", value: "91", trend: "Today", icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
          { label: "SLA Aging", value: "1.2d", trend: "-0.3d", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" }
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-30 blur-2xl group-hover:scale-150 transition-transform duration-700" style={{ backgroundColor: `var(--${stat.color.split('-')[1]})` }}></div>
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${stat.bg} ${stat.color} border border-${stat.color.split('-')[1]}-500/20 shadow-sm`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{stat.label}</div>
            <div className="text-3xl font-serif tabular-nums flex items-end justify-between text-foreground">
              {stat.value}
              <span className={`text-sm font-bold font-sans ${stat.color}`}>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {coverageGaps.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-[32px] p-6 md:p-8">
          <div className="flex items-center gap-2 mb-5">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-bold text-foreground">Coverage Gap — {coverageGaps.length} Key Account{coverageGaps.length > 1 ? 's' : ''} Unowned</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">These Patron-tier accounts are assigned to a manager who isn't on this team's active roster — their workload never shows up in the capacity math above.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coverageGaps.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
                <div className="min-w-0">
                  <button onClick={() => navigateTo('heatmap', c.id)} className="font-bold text-foreground hover:text-primary transition-colors text-sm truncate block">{c.name}</button>
                  <div className="text-xs text-muted-foreground truncate">Assigned to <span className="text-destructive font-medium">{c.manager}</span> — not on this team</div>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) reassign(c.id, e.target.value); }}
                  className="text-xs font-bold bg-muted border border-border rounded-full px-3 py-2 shrink-0 outline-none cursor-pointer"
                >
                  <option value="" disabled>Reassign to…</option>
                  {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-[40px] overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="px-8 py-6 font-bold">Team Member</th>
              <th className="px-8 py-6 font-bold">Book Size</th>
              <th className="px-8 py-6 font-bold">Workload Cap</th>
              <th className="px-8 py-6 font-bold">At Risk Cases</th>
              <th className="px-8 py-6 font-bold">Quality</th>
              <th className="px-8 py-6 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {team.map((member, idx) => {
              const wl = parseInt(member.workload);
              const isOverloaded = wl > 90;
              const isUnderloaded = wl < 70;
              const isExpanded = expandedMember === member.id;

              return (
                <React.Fragment key={member.id}>
                  <tr className={cn("hover:bg-muted/30 transition-colors group cursor-pointer", isExpanded ? "bg-muted/20" : "")} onClick={() => toggleExpand(member.id)}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center font-bold shadow-inner font-serif text-lg">{member.avatar}</div>
                        <div className="flex flex-col">
                          <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            {member.name}
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded ? "rotate-180" : "opacity-0 group-hover:opacity-100")} />
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">{member.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-foreground/80 tabular-nums">{member.bookSize}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-3 bg-muted rounded-full overflow-hidden shadow-inner border border-border/50">
                          <div className={cn("h-full rounded-full transition-all duration-1000", isOverloaded ? "bg-destructive" : isUnderloaded ? "bg-amber-400" : "bg-emerald-500")} style={{ width: member.workload }}></div>
                        </div>
                        <span className="text-xs font-bold text-foreground tabular-nums w-10">{member.workload}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {member.atRisk > 0 ? (
                        <span className="flex items-center gap-1.5 text-destructive font-bold text-xs bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-full w-fit shadow-sm"><AlertTriangle className="w-3.5 h-3.5"/> {member.atRisk} Accounts</span>
                      ) : <span className="text-muted-foreground text-xs font-bold px-3 py-1.5 rounded-full bg-muted border border-border inline-block flex items-center w-fit gap-1.5"><CheckCircle className="w-3.5 h-3.5"/> Healthy</span>}
                    </td>
                    <td className="px-8 py-5 font-bold text-foreground/80 flex items-center gap-1 tabular-nums mt-3">
                      {member.qualityScore} <span className="text-muted-foreground font-normal">/ 5</span>
                    </td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className={cn("flex items-center justify-end gap-3 transition-opacity", isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        <button onClick={() => handleCoach(member.id, member.name)} disabled={coached.includes(member.id)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-colors border", coached.includes(member.id) ? "text-green-600 bg-green-500/10 border-green-500/20 cursor-default" : "text-foreground bg-card border-border hover:border-foreground/30 shadow-sm")}>
                          {coached.includes(member.id) ? t('console_v2.team_coached', 'Coached ✓') : (t('console_v2.team_coach', 'Coach'))}
                        </button>
                        <button onClick={() => navigateTo('outreach')} className="px-4 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95 flex items-center gap-1.5">Queue <ArrowRight className="w-3 h-3"/></button>
                      </div>
                    </td>
                  </tr>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-muted/10 border-b border-border/50">
                        <td colSpan={6} className="p-0">
                          <div className="px-8 py-6 flex gap-8">
                            <div className="flex-1 bg-card border border-border rounded-3xl p-6 shadow-sm">
                              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4">Capacity Breakdown</div>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between text-xs font-bold mb-1"><span>Target Book</span> <span>{member.bookSize} / 50</span></div>
                                  <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-primary h-full rounded-full" style={{width: `${(member.bookSize/50)*100}%`}}></div></div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-xs font-bold mb-1"><span>SLA Compliance</span> <span>{member.compliance}%</span></div>
                                  <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-emerald-500 h-full rounded-full" style={{width: `${member.compliance}%`}}></div></div>
                                </div>
                                <div className="pt-4 mt-4 border-t border-border flex justify-between text-xs">
                                  <span className="text-muted-foreground">Rituals Completed</span>
                                  <span className="font-bold">{member.ritualsCompleted} this month</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Avg Flag Resolution</span>
                                  <span className="font-bold">{member.flagAvgTime}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex-1 bg-card border border-border rounded-3xl p-6 shadow-sm">
                               <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4">Member Temperature (Last 30d)</div>
                               <div className="h-32 flex items-end gap-2 px-2 mt-8">
                                 {member.temperature.map((val: number, i: number) => (
                                   <div key={i} className="flex-1 bg-primary/20 hover:bg-primary transition-colors rounded-t-sm relative group flex justify-center" style={{ height: `${(val/30)*100}%`, minHeight: '4px' }}>
                                     <div className="absolute -top-8 bg-foreground text-background text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">{val} touches</div>
                                   </div>
                                 ))}
                               </div>
                               <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase mt-2 px-2">
                                 <span>Week 1</span>
                                 <span>Week 3</span>
                               </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
