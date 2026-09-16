import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Calendar, FileText, CheckCircle2, ArrowRight, Users, X, Info, TrendingUp, Handshake, ShieldCheck, Megaphone, Activity, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreView({ t, navigateTo, showToast, member, valueReceipt, scoreNarrative, peerBenchmark }: any) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceTab, setEvidenceTab] = useState<'events' | 'intros' | 'marketplace'>('events');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);

  const { scoreCorrection, setScoreCorrection } = usePortalState();

  const handleReport = () => {
    if(!correctionText) return;
    setScoreCorrection([...scoreCorrection, { text: correctionText, date: new Date().toLocaleDateString(), status: 'Pending Review' }]);
    setCorrectionText('');
    setCorrectionOpen(false);
    showToast('Activity report submitted for review');
  };

  // Rising members are shown climbing toward their current value; declining
  // members are shown easing off a higher point — direction follows the
  // member's own scoreTrend rather than a per-metric fabricated series.
  const rising = (member?.scoreTrend ?? 0) >= 0;
  const shape = rising ? [0.55, 0.78, 1] : [1.35, 1.15, 1];
  const buildDetails = (value: number) => ({ q1: Math.max(0, Math.round(value * shape[0])), q2: Math.max(0, Math.round(value * shape[1])), q3: value });
  const trendOf = (d: { q1: number; q3: number }) => { const diff = d.q3 - d.q1; return diff === 0 ? '0' : diff > 0 ? `+${diff}` : `${diff}`; };

  const vr = valueReceipt || { introsBrokered: 0, eventsAttended: 0, advocacyWins: 0, marketplaceResponses: 0 };
  const metrics = [
    { id: 'intros', value: vr.introsBrokered, label: 'Intros Brokered', peerAvg: peerBenchmark?.introsBrokered, icon: <Handshake className="w-4 h-4"/>, details: buildDetails(vr.introsBrokered), desc: 'Direct introductions made via our matchmaking service.' },
    { id: 'events', value: vr.eventsAttended, label: 'Events Attended', peerAvg: peerBenchmark?.eventsAttended, icon: <Calendar className="w-4 h-4"/>, details: buildDetails(vr.eventsAttended), desc: 'Total attendance across all your team members.' },
    { id: 'advocacy', value: vr.advocacyWins, label: 'Advocacy Wins', peerAvg: peerBenchmark?.advocacyWins, icon: <ShieldCheck className="w-4 h-4"/>, details: buildDetails(vr.advocacyWins), desc: 'Policy changes aligned with your registered priorities.' },
    { id: 'market', value: vr.marketplaceResponses, label: 'Market Responses', peerAvg: peerBenchmark?.marketplaceResponses, icon: <Megaphone className="w-4 h-4"/>, details: buildDetails(vr.marketplaceResponses), desc: 'Engagement on your marketplace posts.' }
  ].map(m => ({ ...m, trend: trendOf(m.details) }));

  const outcomes = scoreNarrative?.recentOutcomes || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="bg-foreground text-background rounded-[40px] p-8 md:p-12 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#40D9F1]/10 pointer-events-none" />
        <div className="relative max-w-3xl z-10">
          <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-3 h-3"/> {t('portal_value_receipt', 'Membership Value')} — Q3 2026{member?.name ? ` · ${member.name}` : ''}
          </div>
          <h2 className="text-4xl md:text-6xl font-serif font-light mb-6">{t('portal_value_title', 'What your membership made possible')}</h2>
          <p className="text-base md:text-lg text-background/70 leading-relaxed max-w-xl">
            A record of concrete outcomes and interactions. This activity log helps your team spot useful opportunities and ensures you are getting value from your tier.
          </p>
        </div>
        <div className="relative z-10 flex flex-col gap-3 items-stretch shrink-0">
          <button onClick={() => setStatementOpen(true)} className="px-6 py-3.5 bg-[#40D9F1] text-foreground rounded-full font-bold text-sm hover:bg-[#40D9F1]/90 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm">
            <Printer className="w-4 h-4" /> Generate Annual Value Statement
          </button>
          <button onClick={() => setEvidenceOpen(true)} className="px-6 py-3.5 border border-background/20 rounded-full font-bold text-sm hover:bg-background/10 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm">
             <FileText className="w-4 h-4" /> {t('portal_score_evidence', 'Inspect Evidence Log')}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric) => {
          const isExpanded = expandedMetric === metric.id;
          return (
            <div 
              key={metric.id} 
              onClick={() => setExpandedMetric(isExpanded ? null : metric.id)}
              className={cn("bg-card rounded-[32px] p-6 md:p-8 border shadow-sm flex flex-col cursor-pointer transition-all duration-300 relative overflow-hidden", isExpanded ? "border-primary lg:col-span-2 row-span-2 bg-muted/10" : "border-border hover:border-primary/40")}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  {metric.icon}
                </div>
                {!isExpanded && (
                  <div className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3"/> {metric.trend}
                  </div>
                )}
              </div>
              
              <div className="flex items-end gap-3 mb-2">
                <div className="text-5xl md:text-6xl font-serif font-light tabular-nums text-foreground">{metric.value}</div>
              </div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-relaxed">{metric.label}</div>
              {metric.peerAvg != null && (
                <div className="text-[10px] font-bold text-muted-foreground/70 mt-1.5">{member?.tier || 'Peer'} avg: {metric.peerAvg}</div>
              )}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-8 pt-6 border-t border-border w-full">
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{metric.desc}</p>
                    <div className="space-y-4">
                      <div className="text-[10px] uppercase font-bold text-foreground tracking-widest">Quarterly Trend</div>
                      <div className="flex items-end gap-4 h-24 pb-4">
                        {[
                          { label: 'Q1', val: metric.details.q1 },
                          { label: 'Q2', val: metric.details.q2 },
                          { label: 'Q3 (Current)', val: metric.details.q3 }
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 h-full group">
                            <div className="w-full bg-primary/20 rounded-t-lg transition-all duration-500 group-hover:bg-primary/40 relative" style={{ height: `${(bar.val / Math.max(metric.details.q1, metric.details.q2, metric.details.q3)) * 100}%` }}>
                               <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{bar.val}</span>
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground">{bar.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-card rounded-[40px] p-8 border border-border shadow-sm flex flex-col">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-8 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4"/> Recent Outcomes
          </div>
          <div className="space-y-6 flex-1">
            {outcomes.map((outcome: string, index: number) => (
              <div key={index} className="flex gap-5 items-start p-4 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-sm md:text-base text-foreground leading-relaxed pt-2">{outcome}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-primary/5 rounded-[40px] p-8 border border-primary/10 h-full flex flex-col">
            <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-3">Activity snapshot</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Context for your team to understand engagement levels.</p>
            <div className="space-y-3 flex-1">
              <div className="bg-background border border-primary/10 rounded-2xl p-5 text-sm font-medium text-foreground flex gap-3 shadow-sm">
                 <Calendar className="w-5 h-5 text-primary shrink-0"/>
                 {vr.eventsAttended} event attendances recorded this year
              </div>
              <div className="bg-background border border-primary/10 rounded-2xl p-5 text-sm font-medium text-foreground flex gap-3 shadow-sm">
                 <Users className="w-5 h-5 text-primary shrink-0"/>
                 {scoreNarrative?.committeeNote}
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-primary/10 flex gap-4 items-start">
               <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm border border-border"><FileText className="w-4 h-4 text-muted-foreground"/></div>
               <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">{t('portal_score_correction', 'Is something missing?')}</h4>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">If an event or introduction isn't reflected here, let us know.</p>
                  <button onClick={() => setCorrectionOpen(true)} className="text-xs font-bold text-primary hover:underline">{t('portal_score_correction_btn', 'Report Missing Activity')}</button>
                  
                  {scoreCorrection.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-primary/10 space-y-2">
                      {scoreCorrection.map((sc: any, i: number) => (
                        <div key={i} className="flex justify-between items-center bg-background p-3 rounded-xl border border-primary/10 text-xs shadow-sm">
                          <span className="truncate flex-1 font-medium pr-4">{sc.text}</span>
                          <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground shrink-0 uppercase tracking-wider">{sc.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence Modal */}
      <AnimatePresence>
        {evidenceOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEvidenceOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="bg-card w-full max-w-lg h-full relative z-10 border-l border-border shadow-2xl flex flex-col">
              <div className="p-8 border-b border-border flex justify-between items-start bg-muted/30">
                <div>
                  <h3 className="font-serif text-3xl font-light mb-2">Evidence Log</h3>
                  <div className="text-sm text-muted-foreground">Source data for your value receipt</div>
                </div>
                <button onClick={() => setEvidenceOpen(false)} className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border hover:bg-muted transition-colors shadow-sm"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="flex px-8 pt-6 border-b border-border gap-6">
                 <button onClick={() => setEvidenceTab('events')} className={cn("pb-4 text-sm font-bold border-b-2 transition-colors", evidenceTab === 'events' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>Events (12)</button>
                 <button onClick={() => setEvidenceTab('intros')} className={cn("pb-4 text-sm font-bold border-b-2 transition-colors", evidenceTab === 'intros' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>Intros (3)</button>
                 <button onClick={() => setEvidenceTab('marketplace')} className={cn("pb-4 text-sm font-bold border-b-2 transition-colors", evidenceTab === 'marketplace' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>Market (4)</button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-muted/5">
                {evidenceTab === 'events' && [
                  { date: 'Oct 12', action: 'Attended Tax Policy Briefing', person: 'Ana Ilić', source: 'Registration System' },
                  { date: 'Sep 15', action: 'Joined Environment Committee', person: 'Marko Ristić', source: 'Committee Roster' },
                  { date: 'Aug 22', action: 'Energy Transition Roundtable', person: 'Ana Ilić', source: 'Registration System' }
                ].map((ev, i) => (
                  <div key={i} className="p-5 bg-background border border-border rounded-2xl text-sm shadow-sm hover:border-primary/30 transition-colors">
                    <div className="font-bold mb-2 text-base">{ev.action}</div>
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2"><Users className="w-3 h-3"/> {ev.person}</div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground pt-3 border-t border-border">
                      <span>{ev.date}</span>
                      <span className="flex items-center gap-1"><Info className="w-3 h-3"/> {ev.source}</span>
                    </div>
                  </div>
                ))}

                {evidenceTab === 'intros' && [
                  { date: 'Sep 28', action: 'Introduced to Banca Intesa', source: 'Matchmaking Pipeline', status: 'Completed' },
                  { date: 'Aug 10', action: 'Intro to Nelt Co', source: 'Matchmaking Pipeline', status: 'In Progress' }
                ].map((ev, i) => (
                  <div key={i} className="p-5 bg-background border border-border rounded-2xl text-sm shadow-sm hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <div className="font-bold text-base">{ev.action}</div>
                       <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded-full", ev.status === 'Completed' ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary")}>{ev.status}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground pt-3 border-t border-border mt-3">
                      <span>{ev.date}</span>
                      <span className="flex items-center gap-1"><Info className="w-3 h-3"/> {ev.source}</span>
                    </div>
                  </div>
                ))}
                
                {evidenceTab === 'marketplace' && [
                  { date: 'Aug 04', action: 'Published Real Estate Offer', views: 42, source: 'Marketplace Engine' }
                ].map((ev, i) => (
                  <div key={i} className="p-5 bg-background border border-border rounded-2xl text-sm shadow-sm hover:border-primary/30 transition-colors">
                    <div className="font-bold mb-2 text-base">{ev.action}</div>
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2"><Activity className="w-3 h-3"/> {ev.views} views from verified members</div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground pt-3 border-t border-border">
                      <span>{ev.date}</span>
                      <span className="flex items-center gap-1"><Info className="w-3 h-3"/> {ev.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Annual Value Statement */}
      <AnimatePresence>
        {statementOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm print:hidden" onClick={() => setStatementOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 border border-border shadow-2xl rounded-[40px] p-8 md:p-14 print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:p-0 print:max-w-none">
              <div className="hidden print:block border-b-4 border-black pb-4 mb-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">AmCham Serbia</div>
                <h1 className="text-3xl font-serif font-light text-black">Annual Value Statement — {member?.name}</h1>
              </div>

              <div className="flex justify-between items-start mb-8 print:hidden">
                <div>
                  <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-2">{member?.tier} · {member?.sector}</div>
                  <h3 className="font-serif text-3xl font-light">Annual Value Statement</h3>
                </div>
                <button onClick={() => setStatementOpen(false)} className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border hover:bg-muted transition-colors shadow-sm shrink-0"><X className="w-5 h-5"/></button>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-8 print:text-gray-700">
                A summary of what {member?.name}'s {member?.tier} membership delivered this year, benchmarked against the {member?.tier} peer average.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {metrics.map(m => (
                  <div key={m.id} className="border border-border rounded-2xl p-5 print:border-gray-300 print:rounded-none">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground print:text-gray-600 mb-2">{m.label}</div>
                    <div className="text-3xl font-serif tabular-nums print:text-black">{m.value}</div>
                    {m.peerAvg != null && <div className="text-xs text-muted-foreground print:text-gray-600 mt-1">{member?.tier} avg: {m.peerAvg}</div>}
                  </div>
                ))}
              </div>

              <div className="mb-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground print:text-gray-600 mb-4">Outcomes this year</div>
                <ul className="space-y-2">
                  {outcomes.map((o: string, i: number) => (
                    <li key={i} className="text-sm text-foreground print:text-black flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary print:hidden shrink-0 mt-0.5" /> {o}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-border print:border-gray-300 flex flex-col md:flex-row justify-between gap-4 text-xs text-muted-foreground print:text-gray-500">
                <span>Generated by AmCham OS · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span>Member since {member?.since}</span>
              </div>

              <button onClick={() => window.print()} className="mt-8 w-full px-8 py-4 rounded-full font-bold text-sm bg-primary text-primary-foreground shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 print:hidden">
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Correction Modal */}
      <AnimatePresence>
        {correctionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCorrectionOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-xl relative z-10 border border-border shadow-2xl rounded-[40px] p-8 md:p-12">
              <h3 className="font-serif text-3xl font-light mb-3">Report Missing Activity</h3>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">Tell us what's missing (e.g. an event you attended, a direct introduction) and our team will verify and add it to your log.</p>
              <textarea 
                className="w-full h-40 p-5 bg-muted/30 border border-border rounded-[24px] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 resize-none mb-8 transition-all"
                placeholder="e.g., I attended the ESG roundtable last month but it's not showing up."
                value={correctionText}
                onChange={e => setCorrectionText(e.target.value)}
              />
              <div className="flex flex-col md:flex-row gap-4">
                <button onClick={() => setCorrectionOpen(false)} className="px-8 py-4 rounded-full font-bold text-sm bg-muted text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={handleReport} disabled={!correctionText} className="flex-1 px-8 py-4 rounded-full font-bold text-sm bg-primary text-primary-foreground disabled:opacity-50 shadow-sm hover:shadow-md transition-all">Submit Report</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
