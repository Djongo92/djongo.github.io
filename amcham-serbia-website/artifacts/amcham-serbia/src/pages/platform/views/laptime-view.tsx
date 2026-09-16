import React, { useState } from 'react';
import { Download, Activity, Target, Zap, Clock, ChevronDown, ChevronUp, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { platformData } from '@/data/platform';

const REAL = (platformData.portal as any).lapTime;
const SECTOR = (platformData.portal as any).laptimeSectorBreakdown;

export default function LapTimeView({ t, showToast, member }: any) {
  const [tab, setTab] = useState<'overview'|'performance'|'priorities'>('overview');
  const [period, setPeriod] = useState<'2025' | '2024'>('2025');
  const sectorRow = SECTOR?.[period]?.[member?.sector];
  const [briefingRequested, setBriefingRequested] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  
  // Accordion states
  const [expandedSection, setExpandedSection] = useState<string | null>('climate');

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  };

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      showToast(`Lap Time ${period} PDF downloaded.`);
    }, 1500);
  };

  const handleBriefing = () => {
    setBriefingRequested(true);
    showToast('Briefing request submitted. Staff will contact you shortly.');
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="bg-foreground text-background rounded-[40px] p-8 md:p-12 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#40D9F1]/10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4 flex items-center gap-2">
             <Activity className="w-3 h-3" /> Research & Intelligence
          </div>
          <div className="flex items-center gap-4 mb-4">
             <h2 className="text-4xl md:text-6xl font-serif font-light">Lap Time</h2>
             <div className="bg-background/20 p-1 rounded-full flex gap-1">
               <button onClick={() => setPeriod('2025')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors", period === '2025' ? "bg-background text-foreground shadow-sm" : "text-background/70 hover:text-background")}>2025</button>
               <button onClick={() => setPeriod('2024')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-colors", period === '2024' ? "bg-background text-foreground shadow-sm" : "text-background/70 hover:text-background")}>2024</button>
             </div>
          </div>
          <p className="text-background/70 text-sm md:text-base leading-relaxed mb-6">
            Anonymized, aggregated market sentiment as of late Q3 {period}. This is not an evaluation of any individual member, but a pulse check on the Serbian business environment.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-1.5 bg-background/10 border border-background/20 rounded-full text-xs font-bold text-[#40D9F1]">Sample: {period === '2025' ? REAL?.methodology?.sampleMembers ?? 145 : '132'} Members</span>
            <span className="px-4 py-1.5 bg-background/10 border border-background/20 rounded-full text-xs font-bold text-[#40D9F1]">Partner: Ipsos</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 relative z-10 w-full md:w-auto mt-4 md:mt-0">
          <button onClick={handleDownload} disabled={downloading} className={cn("px-8 py-4 border rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm", downloaded ? "border-green-500/40 text-green-300 bg-green-500/10" : "border-background/20 hover:bg-background/10")}>
            <Download className="w-4 h-4"/> {downloading ? t('portal_downloading', 'Downloading...') : downloaded ? t('portal_report_downloaded', 'Report Downloaded ✓') : `Download ${period} Report`}
          </button>
          <button onClick={handleBriefing} disabled={briefingRequested} className={cn("px-8 py-4 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2", briefingRequested ? "bg-[#40D9F1]/20 text-[#40D9F1] cursor-default" : "bg-[#40D9F1] text-foreground hover:bg-[#40D9F1]/90 shadow-sm")}>
            {briefingRequested ? <><CheckCircle2 className="w-4 h-4"/> Request Pending</> : 'Request Executive Briefing'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 bg-muted p-1.5 rounded-full w-fit">
        <button onClick={() => setTab('overview')} className={cn("px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap", tab === 'overview' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Climate & Outlook</button>
        <button onClick={() => setTab('performance')} className={cn("px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap", tab === 'performance' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Business Performance</button>
        <button onClick={() => setTab('priorities')} className={cn("px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap", tab === 'priorities' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Reform Priorities</button>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <Activity className="w-5 h-5"/>
                  <h3 className="font-serif text-2xl font-medium">Business Climate Satisfaction</h3>
                </div>
                <div className="text-6xl md:text-7xl font-serif font-light text-foreground mb-4 tabular-nums">{period === '2025' ? REAL?.climate?.satisfaction ?? '2.6' : '2.9'}<span className="text-2xl md:text-3xl text-muted-foreground">/5</span></div>
                <p className="text-sm text-muted-foreground leading-relaxed">Average score. {period === '2025' ? REAL?.climate?.dissatisfied ?? 36 : '35'}% of surveyed members are dissatisfied with the current climate, indicating a slight drop in confidence year-over-year.</p>
                {sectorRow && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-xs font-bold">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{member.sector} sector:</span>
                    <span className={cn(sectorRow.climate >= (period === '2025' ? (REAL?.climate?.satisfaction ?? 2.6) : 2.9) ? "text-emerald-600" : "text-orange-500")}>{sectorRow.climate}/5</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <Zap className="w-5 h-5"/>
                  <h3 className="font-serif text-2xl font-medium">Innovation Readiness</h3>
                </div>
                <div className="text-6xl md:text-7xl font-serif font-light text-foreground mb-4 tabular-nums">{period === '2025' ? REAL?.readiness?.innovation ?? 76 : '62'}<span className="text-3xl text-muted-foreground">%</span></div>
                <p className="text-sm text-muted-foreground leading-relaxed">Members prepared for digital transformation and automation. This area shows steady improvement as structural investments mature.</p>
                {sectorRow && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-xs font-bold">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{member.sector} sector:</span>
                    <span className={cn(sectorRow.innovation >= (period === '2025' ? (REAL?.readiness?.innovation ?? 76) : 62) ? "text-emerald-600" : "text-orange-500")}>{sectorRow.innovation}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 cursor-pointer flex justify-between items-center hover:bg-muted/30 transition-colors" onClick={() => toggleSection('climate')}>
               <div className="font-bold text-sm">Detailed Sentiment Breakdown</div>
               {expandedSection === 'climate' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <AnimatePresence>
              {expandedSection === 'climate' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                   <div className="p-6 md:p-8 pt-0 border-t border-border mt-4">
                     <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-2">
                            <span>Optimistic about Next 12 Months</span>
                            <span className="text-primary">{period === '2025' ? '54%' : '61%'}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-1000" style={{ width: period === '2025' ? '54%' : '61%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-2">
                            <span>Expect Regulatory Stability</span>
                            <span className="text-orange-500">{period === '2025' ? '28%' : '32%'}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: period === '2025' ? '28%' : '32%' }}></div>
                          </div>
                        </div>
                     </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="bg-card p-8 md:p-12 rounded-[40px] border border-border shadow-sm">
           <h3 className="font-serif text-3xl font-light mb-8">Performance Metrics</h3>
           <div className="space-y-8">
             <div>
               <div className="flex justify-between text-sm font-bold mb-3">
                 <span>Revenue Growth ({period})</span>
                 <span className="text-primary">{period === '2025' ? REAL?.performance?.revenueGrowth2025 ?? 51 : REAL?.performance?.revenueGrowth2024 ?? 71}%</span>
               </div>
               <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${period === '2025' ? REAL?.performance?.revenueGrowth2025 ?? 51 : REAL?.performance?.revenueGrowth2024 ?? 71}%` }} transition={{ duration: 1 }} className="bg-primary h-full"></motion.div>
               </div>
               <div className="text-xs text-muted-foreground mt-3 font-medium">Percentage of members reporting year-over-year growth.</div>
               {sectorRow && (
                 <div className="mt-3 flex items-center gap-2 text-xs font-bold">
                   <Users className="w-3.5 h-3.5 text-muted-foreground" />
                   <span className="text-muted-foreground">{member.sector} sector:</span>
                   <span className="text-foreground">{sectorRow.revenueGrowth}%</span>
                 </div>
               )}
             </div>
             <div>
               <div className="flex justify-between text-sm font-bold mb-3">
                 <span>Plan Additional Investment (Next Year)</span>
                 <span className="text-foreground">{period === '2025' ? REAL?.performance?.expectInvestment2026 ?? 59 : '65'}%</span>
               </div>
               <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${period === '2025' ? REAL?.performance?.expectInvestment2026 ?? 59 : 65}%` }} transition={{ duration: 1 }} className="bg-foreground h-full"></motion.div>
               </div>
               <div className="text-xs text-muted-foreground mt-3 font-medium">Capex expansion plans remain cautious.</div>
             </div>
             <div>
               <div className="flex justify-between text-sm font-bold mb-3">
                 <span>Plan to Increase Headcount</span>
                 <span className="text-green-600">{period === '2025' ? REAL?.performance?.expectEmployment2026 ?? 35 : '52'}%</span>
               </div>
               <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${period === '2025' ? REAL?.performance?.expectEmployment2026 ?? 35 : 52}%` }} transition={{ duration: 1 }} className="bg-green-500 h-full"></motion.div>
               </div>
             </div>
           </div>
        </div>
      )}

      {tab === 'priorities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-primary/5 p-8 md:p-12 rounded-[40px] border border-primary/10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-8 text-primary">
              <Target className="w-6 h-6"/>
              <h3 className="font-serif text-3xl font-medium">Top Reform Areas</h3>
            </div>
            <ul className="space-y-6">
              {[...(REAL?.priorities?.general || []), ...(REAL?.priorities?.labor || [])]
                .sort((a: any, b: any) => b.value - a.value)
                .slice(0, 4)
                .map((item: any, i: number) => (
                <li key={item.id} className="flex gap-4 items-center bg-background/50 p-4 rounded-2xl border border-primary/10 shadow-sm">
                  <span className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-foreground font-medium flex-1">{item.label}</span>
                  <span className="text-primary font-bold text-sm tabular-nums">{item.value}%</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-card p-8 md:p-12 rounded-[40px] border border-border shadow-sm">
            <h3 className="font-serif text-3xl font-light mb-6">Deep Dive: Labor Specifics</h3>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">Labor shortage continues to be a bottleneck. The priorities inside labor relations reflect a need for operational flexibility.</p>
            <div className="space-y-4">
              <div className="bg-muted/50 p-5 rounded-2xl border border-border/50 text-sm font-medium flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                 Simplifying foreign worker permits
              </div>
              <div className="bg-muted/50 p-5 rounded-2xl border border-border/50 text-sm font-medium flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                 Flexible remote work legislation
              </div>
              <div className="bg-muted/50 p-5 rounded-2xl border border-border/50 text-sm font-medium flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                 Tax incentives for new hires
              </div>
              <div className="bg-muted/50 p-5 rounded-2xl border border-border/50 text-sm font-medium flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                 Modernization of seasonal work rules
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
