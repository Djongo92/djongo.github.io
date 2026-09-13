import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Users, FileText, CheckCircle2, MessageSquare, ArrowRight, Download, Eye, EyeOff, BarChart3, Clock, ChevronDown, ChevronUp, ArrowUpRight, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_ANALYTICS = {
  c1: {
    attendance: 100,
    sectorMix: [ { label: 'IT', val: 50 }, { label: 'Finance', val: 30 }, { label: 'Consulting', val: 20 } ],
    recent: [
      { date: "Oct 12", type: "comment", desc: "Commented on AI Draft" },
      { date: "Sep 28", type: "event", desc: "Attended Q3 Strategy Meeting" }
    ]
  },
  c2: {
    attendance: 60,
    sectorMix: [ { label: 'Pharma', val: 60 }, { label: 'IT', val: 20 }, { label: 'Legal', val: 20 } ],
    recent: [
      { date: "Oct 01", type: "event", desc: "Missed Pricing Strategy Meeting" }
    ]
  }
};

export default function CommitteeView({ t, showToast }: any) {
  const { committees, setCommittees } = usePortalState();
  const [activeTab, setActiveTab] = useState<'my'|'discover'>('my');
  const [rsvp, setRsvp] = useState<Record<string, boolean>>({});
  const [downloadedDocs, setDownloadedDocs] = useState<string[]>([]);
  const [discussionOpen, setDiscussionOpen] = useState<string | null>(null);
  const [discussionText, setDiscussionText] = useState('');
  const [postedReplies, setPostedReplies] = useState<Record<string, string[]>>({});
  const [expandedCommittee, setExpandedCommittee] = useState<string | null>(null);

  const postReply = (cid: string) => {
    if (!discussionText.trim()) return;
    setPostedReplies(prev => ({ ...prev, [cid]: [...(prev[cid] || []), discussionText.trim()] }));
    setDiscussionText('');
    showToast(t('portal_reply_posted', 'Reply posted to committee thread'));
  };

  const toggleJoin = (id: string) => {
    setCommittees(committees.map((c: any) => {
      if (c.id === id) {
        if (c.joined) {
          showToast(t('portal_left_committee', 'Left Committee'));
          return { ...c, joined: false };
        } else {
          showToast(t('portal_request_sent', 'Request sent to join Committee'));
          return { ...c, joined: 'pending' };
        }
      }
      return c;
    }));
  };

  const myCommittees = committees.filter((c: any) => c.joined === true);
  const discoverCommittees = committees.filter((c: any) => c.joined !== true);

  const getDocIcon = (name: string) => {
    if (name.toLowerCase().endsWith('.pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (name.toLowerCase().endsWith('.docx')) return <FileText className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex gap-3 mb-6">
        <button onClick={() => setActiveTab('my')} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", activeTab === 'my' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_my_committees', 'My Committees')}</button>
        <button onClick={() => setActiveTab('discover')} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", activeTab === 'discover' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_discover', 'Discover')}</button>
      </div>

      {activeTab === 'my' && (
        <div className="space-y-8">
          {/* KPI Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between group hover:border-primary/30 transition-colors">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex items-center justify-between">
                {t('portal_participation_score', 'Participation Score')}
                <BarChart3 className="w-3 h-3 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <div className="flex items-end gap-3 mb-3">
                  <div className="text-4xl font-serif tabular-nums">88</div>
                  <div className="text-xs text-green-500 font-bold mb-1 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> 12 pts</div>
                </div>
                <div className="flex items-end gap-1 h-6">
                  {[40, 50, 60, 55, 75, 88].map((v, i) => (
                    <div key={i} className="flex-1 bg-primary/10 rounded-t-sm relative" style={{ height: `${v}%` }}>
                       {i === 5 && <div className="absolute inset-0 bg-primary rounded-t-sm" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_time_invested', 'Time Invested')}</div>
              <div className="flex items-end gap-3">
                <div className="text-4xl font-serif tabular-nums">14h</div>
                <div className="text-xs text-green-500 font-bold mb-1 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> 2h</div>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_peers_engaged', 'Peers Engaged')}</div>
              <div className="text-4xl font-serif tabular-nums">45</div>
            </div>
            <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_docs_reviewed', 'Docs Reviewed')}</div>
              <div className="flex items-end gap-3">
                <div className="text-4xl font-serif tabular-nums">8</div>
                <div className="text-xs text-muted-foreground mb-2">/ 12 total</div>
              </div>
            </div>
          </div>

          {myCommittees.length === 0 && (
            <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-[40px]">
              {t('portal_no_committees', 'You haven\'t joined any committees yet. Explore the Discover tab.')}
            </div>
          )}

          {myCommittees.map((c:any) => {
            const isExpanded = expandedCommittee === c.id;
            const analytics = MOCK_ANALYTICS[c.id as keyof typeof MOCK_ANALYTICS] || MOCK_ANALYTICS.c1;

            return (
              <div key={c.id} className="space-y-6">
                <div className="bg-foreground text-background rounded-[40px] p-8 md:p-12 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8 group">
                  <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#40D9F1]/10 pointer-events-none" />
                  <div className="max-w-2xl relative z-10">
                    <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4">{t('portal_working_group', 'Working Group')}</div>
                    <h2 className="text-4xl md:text-5xl font-serif font-light mb-4">{c.name}</h2>
                    <p className="text-background/80 text-sm md:text-base leading-relaxed">{c.mandate}</p>
                  </div>
                  <div className="bg-background/10 backdrop-blur-md border border-background/20 rounded-[32px] p-6 shrink-0 text-center relative z-10 min-w-[200px]">
                     <div className="text-[10px] uppercase font-bold text-[#40D9F1] tracking-widest mb-2">{t('portal_next_meeting', 'Next Meeting')}</div>
                     <div className="text-2xl font-serif font-light mb-1">{c.nextMeeting.date}</div>
                     <div className="text-xs text-background/80 font-medium mb-3">{c.nextMeeting.type} • {c.nextMeeting.topic}</div>
                     <button onClick={() => { setRsvp(p => ({ ...p, [c.id]: !p[c.id] })); showToast(rsvp[c.id] ? t('portal_rsvp_cancelled', 'RSVP cancelled') : t('portal_rsvp_confirmed', 'RSVP confirmed')); }} className={cn("w-full py-3 rounded-full text-xs font-bold shadow-sm hover:scale-95 transition-transform", rsvp[c.id] ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-primary text-primary-foreground")}>
                       {rsvp[c.id] ? t('portal_attending', 'Attending ✓') : t('portal_rsvp', 'RSVP')}
                     </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-4 md:col-span-2">
                     <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">{c.chair.name.charAt(0)}</div>
                     <div>
                       <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">{t('portal_chair', 'Chair')}</div>
                       <div className="text-sm font-bold text-foreground">{c.chair.name}</div>
                     </div>
                   </div>
                   
                   <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-center">
                     <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_my_status', 'My Status')}</div>
                     <div className="text-sm font-bold text-primary flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> {t('portal_active_member', 'Active Member')}</div>
                   </div>

                   <button onClick={() => setExpandedCommittee(isExpanded ? null : c.id)} className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center justify-between hover:bg-muted/50 transition-colors group">
                      <div className="flex flex-col items-start">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{t('portal_drilldown', 'Analytics')}</div>
                        <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t('portal_view_details', 'View Details')}</div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                   </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                       <div className="bg-muted/30 border border-border rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                         <div>
                           <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">{t('portal_attendance_rate', 'Attendance Rate')}</h4>
                           <div className="flex items-center gap-4">
                             <div className="relative w-16 h-16 flex items-center justify-center">
                               <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                 <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="100, 100" className="text-border" />
                                 <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${analytics.attendance}, 100`} className="text-primary" />
                               </svg>
                               <span className="absolute text-sm font-bold tabular-nums">{analytics.attendance}%</span>
                             </div>
                             <div className="text-xs text-muted-foreground max-w-[120px]">
                               {analytics.attendance === 100 ? t('portal_perfect_attendance', 'Perfect attendance this year.') : t('portal_missed_sessions', 'You missed some sessions.')}
                             </div>
                           </div>
                         </div>
                         <div>
                           <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">{t('portal_sector_mix', 'Sector Composition')}</h4>
                           <div className="space-y-3">
                             {analytics.sectorMix.map((s:any, i:number) => (
                               <div key={i}>
                                 <div className="flex justify-between text-xs mb-1">
                                   <span className="font-medium text-foreground">{s.label}</span>
                                   <span className="text-muted-foreground tabular-nums">{s.val}%</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                   <div className="h-full bg-primary rounded-full" style={{ width: `${s.val}%` }} />
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                         <div>
                           <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">{t('portal_recent_activity', 'Your Recent Activity')}</h4>
                           <div className="space-y-4">
                             {analytics.recent.map((r:any, i:number) => (
                               <div key={i} className="flex gap-3">
                                 <div className="mt-0.5 shrink-0">
                                   {r.type === 'comment' ? <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                                 </div>
                                 <div>
                                   <div className="text-xs font-medium text-foreground">{r.desc}</div>
                                   <div className="text-[10px] text-muted-foreground mt-0.5">{r.date}</div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-card rounded-[40px] border border-border shadow-sm overflow-hidden flex flex-col md:flex-row">
                  <div className="md:w-1/2 p-8 md:p-10 border-b md:border-b-0 md:border-r border-border">
                    <div className="flex items-center gap-2 mb-6">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-2xl font-medium">{t('portal_documents', 'Documents')}</h3>
                    </div>
                    {c.documents.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t('portal_no_documents', 'No documents yet.')}</div>
                    ) : (
                      <ul className="space-y-4">
                        {c.documents.map((doc:any) => (
                          <li key={doc.id} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                            <div className="mt-1 bg-background p-2 rounded-xl border border-border shadow-sm">
                              {getDocIcon(doc.name)}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold text-foreground line-clamp-1">{doc.name}</div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {doc.isPublic ? <Eye className="w-3 h-3 text-green-500" /> : <EyeOff className="w-3 h-3 text-orange-500" />}
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                  {doc.isPublic ? t('portal_publishable', 'Publishable') : t('portal_internal', 'Internal Only')}
                                </div>
                              </div>
                            </div>
                            {downloadedDocs.includes(doc.id) ? (
                              <span className="p-2 text-[10px] font-bold text-green-600 uppercase tracking-widest whitespace-nowrap self-center">{t('portal_downloaded', 'Downloaded ✓')}</span>
                            ) : (
                              <button onClick={() => { setDownloadedDocs(d => [...d, doc.id]); showToast(t('portal_doc_downloaded', 'Document downloaded')); }} className="p-2 hover:bg-background border border-transparent hover:border-border rounded-full transition-all shadow-sm self-center" aria-label={`Download ${doc.name}`}><Download className="w-4 h-4 text-foreground"/></button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  <div className="md:w-1/2 p-8 md:p-10 bg-muted/20">
                    <div className="flex items-center gap-2 mb-6">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-2xl font-medium">{t('portal_discussion', 'Discussion')}</h3>
                    </div>
                    <div className="flex gap-4 mb-6">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">{c.chair.name.charAt(0)}</div>
                      <div className="bg-card border border-border rounded-2xl p-4 text-sm text-foreground shadow-sm">
                        <div className="font-bold mb-1 text-xs">{c.chair.name} <span className="text-muted-foreground font-normal ml-2">Chair</span></div>
                        "{t('portal_chair_message', 'Please review the AI draft by Friday. We will submit comments on Monday.')}"
                      </div>
                    </div>

                    {(postedReplies[c.id] || []).map((reply: string, ri: number) => (
                      <div key={ri} className="flex gap-4 mb-4 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0">Y</div>
                        <div className="bg-primary text-primary-foreground rounded-2xl p-4 text-sm shadow-sm max-w-[85%]">
                          <div className="font-bold mb-1 text-xs text-primary-foreground/80">{t('portal_you', 'You')} <span className="font-normal ml-2">{t('portal_just_now', 'Just now')}</span></div>
                          <p>{reply}</p>
                        </div>
                      </div>
                    ))}

                    {discussionOpen === c.id ? (
                      <div className="space-y-3 mt-6">
                        <textarea
                          value={discussionText}
                          onChange={e => setDiscussionText(e.target.value)}
                          placeholder={t('portal_write_reply', 'Write a reply for committee members...')}
                          rows={3}
                          className="w-full bg-background border border-border rounded-2xl p-4 text-sm outline-none focus:border-primary/50 resize-none shadow-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setDiscussionOpen(null); setDiscussionText(''); }} className="px-5 py-2 text-muted-foreground font-bold text-xs hover:text-foreground">{t('portal_cancel', 'Cancel')}</button>
                          <button onClick={() => postReply(c.id)} disabled={!discussionText.trim()} className="px-5 py-2 bg-primary text-primary-foreground rounded-full font-bold text-xs shadow-sm disabled:opacity-50">{t('portal_post_reply', 'Post Reply')}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setDiscussionOpen(c.id)} className="w-full mt-2 py-4 bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">{t('portal_join_discussion', 'Reply to thread')} <ArrowRight className="w-4 h-4"/></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'discover' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {discoverCommittees.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center p-12 text-muted-foreground border border-dashed border-border rounded-[40px]">
              {t('portal_all_joined', 'You are already in all committees.')}
            </div>
          )}
          {discoverCommittees.map((c:any) => (
            <div key={c.id} className="bg-card p-8 rounded-[32px] border border-border shadow-sm flex flex-col group hover:border-primary/30 transition-colors relative">
               <div className="flex justify-between items-start mb-6">
                 <div className="text-[10px] uppercase font-bold text-primary tracking-widest">{c.name}</div>
               </div>
               <h3 className="text-3xl font-serif font-light text-foreground mb-4">{c.mandate}</h3>
               <div className="text-sm text-muted-foreground mb-8">
                 {t('portal_chair', 'Chair')}: {c.chair.name}
               </div>
               <div className="mt-auto pt-6 border-t border-border">
                 {c.joined === 'pending' ? (
                   <div className="w-full py-3 bg-muted text-muted-foreground rounded-full font-bold text-xs text-center border border-border">
                     {t('portal_request_pending', 'Request Pending')}
                   </div>
                 ) : (
                   <button onClick={() => toggleJoin(c.id)} className="w-full py-3 bg-foreground text-background rounded-full font-bold text-xs shadow-sm hover:bg-foreground/90 transition-colors">
                     {t('portal_request_join', 'Request to Join')}
                   </button>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
