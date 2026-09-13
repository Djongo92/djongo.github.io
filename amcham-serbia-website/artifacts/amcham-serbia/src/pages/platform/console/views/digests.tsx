import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { platformData } from '@/data/platform';
import { Check, ArrowRight, Play, Pause, Edit3, Send, ChevronDown, BarChart2, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function DigestsView({ showToast }: { showToast: (m:string) => void }) {
  const { t } = useI18n();
  const data = (platformData as any).console.digests;
  const [activeVariant, setActiveVariant] = useState(data.variants[0]);
  const [variants, setVariants] = useState(data.variants);
  const [testSent, setTestSent] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');
  const [expandedPreview, setExpandedPreview] = useState(false);

  const startEdit = () => {
    setEditSubject(activeVariant.subject || `${activeVariant.name} — Weekly Digest`);
    setEditContent(activeVariant.content || '');
    setEditing(true);
  };

  const saveEdit = () => {
    const updated = variants.map((v: any) => v.id === activeVariant.id ? { ...v, subject: editSubject, content: editContent } : v);
    setVariants(updated);
    setActiveVariant(updated.find((v:any) => v.id === activeVariant.id));
    setEditing(false);
    showToast('Draft updated');
  };

  const toggleStatus = (id: string, current: string) => {
    const next = current === 'schedule' ? 'pause' : 'schedule';
    const updated = variants.map((v:any) => v.id === id ? { ...v, draftStatus: next } : v);
    setVariants(updated);
    showToast(next === 'schedule' ? 'Digest Scheduled' : 'Digest Paused');
    setActiveVariant(updated.find((v:any) => v.id === activeVariant.id));
  };

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditing(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const activeV = variants.find((v:any) => v.id === activeVariant.id) || activeVariant;

  return (
    <div className="space-y-8 font-sans pb-20 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
         <div>
           <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">Automated Digests</h2>
           <p className="text-sm font-medium text-muted-foreground">{t('platform.console.digests_purpose', 'Review and approve automatically generated email briefings.')} Governed publication workflow.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="space-y-8">
          <div className="bg-card rounded-[32px] border border-border p-8 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Status</div>
              <div className="text-xl font-serif text-foreground">{t('platform.console.digest_sending', 'Sending {time}').replace('{time}', data.nextSend)}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center"><Send className="w-5 h-5" /></div>
          </div>
          
          <div className="bg-foreground text-background rounded-[32px] p-8 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#40D9F1] blur-[80px] opacity-20 pointer-events-none rounded-full"></div>
             <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-6 flex items-center gap-2"><BarChart2 className="w-3 h-3"/> Performance Metrics</div>
             
             <div className="space-y-6">
                <div>
                   <div className="flex justify-between items-center text-sm mb-2">
                      <span className="font-medium text-background/80">Open Rate</span>
                      <span className="font-bold">{data.deliveryMetrics.openRate}</span>
                   </div>
                   <div className="w-full bg-background/20 rounded-full h-1.5 overflow-hidden">
                     <div className="bg-[#40D9F1] h-full rounded-full" style={{ width: data.deliveryMetrics.openRate }}></div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between items-center text-sm mb-2">
                      <span className="font-medium text-background/80">Click Rate</span>
                      <span className="font-bold">{data.deliveryMetrics.clickRate}</span>
                   </div>
                   <div className="w-full bg-background/20 rounded-full h-1.5 overflow-hidden">
                     <div className="bg-primary h-full rounded-full" style={{ width: data.deliveryMetrics.clickRate }}></div>
                   </div>
                </div>
             </div>
             
             <div className="mt-6 pt-5 border-t border-background/20 flex items-center justify-between text-xs">
                <span className="text-background/60">Bounce Rate</span>
                <span className="font-bold text-red-400">{data.deliveryMetrics.bounceRate}</span>
             </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4 ml-2">{t('platform.console.digest_variants', 'Variants')}</h3>
            <div className="space-y-3">
              {variants.map((v:any) => (
                <button 
                  key={v.id} 
                  onClick={() => { setActiveVariant(v); setExpandedPreview(false); }}
                  className={cn("w-full p-5 rounded-[24px] border text-left transition-all flex justify-between items-center group", activeV.id === v.id ? "bg-card border-foreground shadow-md ring-1 ring-foreground" : "bg-card/50 border-border hover:border-foreground/30")}
                >
                  <div>
                    <div className="font-bold text-base mb-1">{v.name}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3"/> {t('platform.console.digest_audience', '{count} recipients').replace('{count}', v.id === 'patron' ? '42' : '203')}</div>
                      <div className={cn("w-1.5 h-1.5 rounded-full", v.draftStatus === 'schedule' ? "bg-green-500" : "bg-amber-500")}></div>
                    </div>
                  </div>
                  <ArrowRight className={cn("w-5 h-5", activeV.id === v.id ? "text-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity")} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 flex flex-col min-h-[800px]">
          <div className="flex justify-between items-center mb-4">
             <div className="flex flex-col">
               <div className="text-sm font-bold text-foreground uppercase tracking-widest">{activeV.name}</div>
               <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                 <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest", activeV.draftStatus === 'schedule' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600')}>{activeV.draftStatus}</span>
                 • AI Generated Draft
               </div>
             </div>
             
             <div className="flex gap-2">
                {testSent.includes(activeV.id) ? (
                  <span className="px-4 py-2 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-2"><Check className="w-3 h-3"/> {t('console_v2.test_sent', 'Test Sent')}</span>
                ) : (
                  <button onClick={() => { setTestSent(s => [...s, activeV.id]); showToast("Test email sent."); }} className="px-4 py-2 rounded-full text-xs font-bold bg-card border border-border text-foreground hover:bg-muted transition-colors">Send Test</button>
                )}
                <button onClick={startEdit} className="px-4 py-2 rounded-full text-xs font-bold bg-card border border-border text-foreground hover:bg-muted transition-colors flex items-center gap-2"><Edit3 className="w-3 h-3"/> Edit Draft</button>
                <button 
                  onClick={() => toggleStatus(activeV.id, activeV.draftStatus)} 
                  className={cn("px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm transition-all", activeV.draftStatus === 'schedule' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg transform active:scale-95")}
                >
                  {activeV.draftStatus === 'schedule' ? <><Pause className="w-3 h-3"/> Pause</> : <><Play className="w-3 h-3"/> Approve & Schedule</>}
                </button>
             </div>
          </div>

          <div className="bg-white text-black rounded-[40px] border border-border shadow-lg overflow-hidden flex flex-col flex-1 relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="bg-gray-100 p-4 border-b border-gray-200 flex gap-2 relative z-10 items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="text-xs font-medium text-gray-500">amcham.rs / {activeV.id}-digest</div>
            </div>
            
            <div className="p-8 border-b border-gray-200 bg-white relative z-10 transition-colors hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedPreview(!expandedPreview)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText className="w-3 h-3" /> {t('platform.console.digest_subject', 'Subject Line')}</div>
                  <div className="text-2xl font-serif text-gray-900">{activeV.subject}</div>
                </div>
                <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><ChevronDown className={cn("w-4 h-4 transition-transform", expandedPreview ? "rotate-180" : "")}/></button>
              </div>
              
              <AnimatePresence>
                {expandedPreview && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-6 mt-6 border-t border-gray-200">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Sample Recipients ({activeV.id === 'patron' ? '42' : '203'})</div>
                      <div className="flex flex-wrap gap-2">
                        {activeV.id === 'patron' ? (
                          <>
                            <span className="text-xs px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">m.jovanovic@adriatica.rs</span>
                            <span className="text-xs px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">n.krstic@hemofarm.com</span>
                            <span className="text-xs px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">a.savic@ncr.com</span>
                            <span className="text-xs px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200 text-gray-400">+39 more</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">j.kostic@s-leasing.rs</span>
                            <span className="text-xs px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">m.ristic@pwc.rs</span>
                            <span className="text-xs px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200 text-gray-400">+201 more</span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-gray-50 relative z-10">
              <div className="max-w-xl mx-auto bg-white p-12 rounded-[32px] shadow-sm border border-gray-200 relative">
                 <div className="absolute top-8 right-8 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                   <div className="font-serif text-blue-900 text-lg font-bold">A</div>
                 </div>
                 <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-10">AmCham Serbia Intelligence</div>
                 <h1 className="text-4xl font-serif font-light mb-8 text-gray-900 leading-tight">Weekly Executive Brief</h1>
                 <div className="text-gray-700 leading-relaxed mb-10 text-lg font-medium whitespace-pre-wrap">
                    {activeV.content}
                 </div>
                 
                 <div className="space-y-4 mb-12">
                   {activeV.id === 'patron' ? (
                     <>
                       <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl border-l-4 border-l-blue-500">
                         <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Policy Radar</div>
                         <div className="font-bold text-gray-900 mb-1">New Supply Chain Draft Law</div>
                         <div className="text-sm text-gray-600">Expected to impact manufacturing exporters. Public consultation opens next week.</div>
                       </div>
                       <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                         <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Recommended Intro</div>
                         <div className="font-bold text-gray-900 mb-1">Nelt Co — Supply Chain Synergies</div>
                         <div className="text-sm text-gray-600 mb-3">Both active in Transport sub-committee with overlapping challenges.</div>
                         <button className="text-xs font-bold text-white bg-black px-4 py-2 rounded-full">Request Intro</button>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl border-l-4 border-l-purple-500">
                         <div className="text-[10px] font-bold uppercase tracking-widest text-purple-500 mb-2">Committee Update</div>
                         <div className="font-bold text-gray-900 mb-1">Tech Committee Roadmap 2027</div>
                         <div className="text-sm text-gray-600">Review the draft agenda for the upcoming working group.</div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
                           <div className="text-xs font-bold text-gray-900 mb-1">Office Space NBG</div>
                           <div className="text-[10px] text-gray-500">From Microsoft</div>
                         </div>
                         <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
                           <div className="text-xs font-bold text-gray-900 mb-1">Fleet Financing</div>
                           <div className="text-[10px] text-gray-500">From S-Leasing</div>
                         </div>
                       </div>
                     </>
                   )}
                 </div>

                 <div className="h-px w-full bg-gray-200 mb-8"></div>
                 <div className="text-xs text-gray-500 font-medium leading-relaxed">
                   Personalized for <span className="font-bold text-black">{activeV.name}</span> companies.<br/>
                   Prepared automatically by AmCham OS Engine v4.
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditing(false)} />
            <motion.div role="dialog" aria-modal="true" aria-label="Edit digest draft" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-card border border-border shadow-2xl rounded-[40px] p-10 w-full max-w-2xl relative z-10 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-serif font-light mb-2">{t('console_v2.edit_draft_title', 'Edit Digest Draft')}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted tracking-widest">{activeVariant.name}</span>
                    {activeVariant.id === 'patron' ? '42 Recipients' : '203 Recipients'}
                  </p>
                </div>
                <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"><Check className="w-5 h-5 text-muted-foreground rotate-45 opacity-0" style={{ transform: 'rotate(45deg)' }} /></button>
              </div>
              
              <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Subject Line</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 ring-primary/20 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Introductory Content</label>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 ring-primary/20 transition-all shadow-inner min-h-[200px] resize-none"
                  />
                </div>
                
                <div className="bg-muted/50 p-5 rounded-2xl border border-border/50">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Dynamic Blocks</div>
                  <p className="text-xs text-muted-foreground mb-4">The following blocks will be appended automatically based on the recipient's sector and activity:</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1.5 bg-background rounded-full text-xs font-medium border border-border shadow-sm">Policy Radar</span>
                    <span className="px-3 py-1.5 bg-background rounded-full text-xs font-medium border border-border shadow-sm">Marketplace Offers (Max 3)</span>
                    <span className="px-3 py-1.5 bg-background rounded-full text-xs font-medium border border-border shadow-sm">Recommended Intros</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-8 mt-6 border-t border-border">
                <button onClick={() => setEditing(false)} className="px-6 py-3 rounded-full font-bold text-sm bg-muted text-muted-foreground hover:text-foreground transition-colors">{t('console_v2.cancel', 'Cancel')}</button>
                <button onClick={saveEdit} disabled={!editSubject.trim() || !editContent.trim()} className="px-8 py-3 rounded-full font-bold text-sm bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg transform active:scale-95 disabled:opacity-50 transition-all">{t('console_v2.save_draft', 'Save Draft')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
