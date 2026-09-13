import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Bell, Archive, EyeOff, Settings, Calendar, Target, Zap, CheckCircle2, MessageSquare, ChevronDown, ChevronUp, Clock, FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationsView({ t, showToast, navigateTo }: any) {
  const { notifications, setNotifications, notificationPrefs, setNotificationPrefs } = usePortalState();
  const [tab, setTab] = useState<'inbox'|'archived'|'prefs'>('inbox');
  const [expandedNotif, setExpandedNotif] = useState<string | null>(null);

  const toggleExpand = (n: any) => {
    if (expandedNotif === n.id) {
      setExpandedNotif(null);
    } else {
      setExpandedNotif(n.id);
      if (n.status === 'unread') {
        setNotifications(notifications.map((x: any) => x.id === n.id ? { ...x, status: 'read' } : x));
      }
    }
  };

  const action = (id: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications(notifications.map((n:any) => n.id === id ? { ...n, status: newStatus } : n));
    showToast(`${t('portal_notification', 'Notification')} ${newStatus}`);
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n:any) => n.status === 'unread' ? { ...n, status: 'read' } : n));
    showToast(t('portal_all_read', 'All marked as read'));
  };

  const filtered = notifications.filter((n:any) => {
    if (tab === 'inbox') return n.status !== 'archived';
    if (tab === 'archived') return n.status === 'archived';
    return false;
  });

  const grouped = {
    intro: filtered.filter((n:any) => n.type === 'intro'),
    event: filtered.filter((n:any) => n.type === 'event'),
    value: filtered.filter((n:any) => n.type === 'value'),
  };

  const renderList = (list: any[]) => {
    if (list.length === 0) return null;
    return list.map((n:any) => {
      const isExpanded = expandedNotif === n.id;
      return (
        <div key={n.id} className={cn("p-6 md:p-8 border-b border-border last:border-0 transition-colors flex flex-col group/n", n.status === 'unread' ? "bg-primary/5" : "hover:bg-muted/30")}>
           <div className="flex gap-4 items-start md:items-center justify-between cursor-pointer" onClick={() => toggleExpand(n)}>
             <div className="flex-1 text-left">
               <div className="flex items-center gap-3 mb-2">
                 <span className={cn("text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded", n.type === 'intro' ? 'bg-blue-500/10 text-blue-500' : n.type === 'event' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500')}>{n.type}</span>
                 <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> {n.time}</span>
               </div>
               <p className={cn("text-sm", n.status === 'unread' ? "font-bold text-foreground" : "font-medium text-foreground")}>{n.text}</p>
             </div>
             <div className="flex gap-2 shrink-0 items-center">
               <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground transition-colors group-hover/n:text-foreground">
                 {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
               </div>
               {tab === 'inbox' && (
                 <>
                   <button onClick={(e) => action(n.id, 'read', e)} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors" title={t('portal_mark_read', 'Mark Read')}><CheckCircle2 className="w-4 h-4"/></button>
                   <button onClick={(e) => action(n.id, 'archived', e)} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors" title={t('portal_archive', 'Archive')}><Archive className="w-4 h-4"/></button>
                 </>
               )}
               {tab === 'archived' && (
                 <button onClick={(e) => action(n.id, 'read', e)} className="px-4 py-2 bg-background border border-border rounded-full text-xs font-bold hover:bg-muted transition-colors">{t('portal_restore', 'Restore')}</button>
               )}
             </div>
           </div>
           
           <AnimatePresence>
             {isExpanded && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="mt-6 p-5 bg-background rounded-2xl border border-border shadow-sm">
                   <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
                     {n.type === 'event' ? t('portal_notif_detail_event', 'This event requires your attention. Register your delegates before capacity is reached.') : 
                      n.type === 'intro' ? t('portal_notif_detail_intro', 'Your request has been moved to the active brokering queue. A staff member will reach out shortly.') :
                      t('portal_notif_detail_value', 'We have updated your activity record. Your engagement score has been recalculated.')}
                   </div>
                   {n.view && (
                     <button onClick={() => { if(navigateTo) navigateTo(n.view); }} className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs font-bold shadow-sm hover:scale-95 transition-transform flex items-center gap-2">
                       {t('portal_view_details', 'View Details')} <ArrowRight className="w-3 h-3"/>
                     </button>
                   )}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      );
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex gap-3 mb-6">
         <button onClick={() => setTab('inbox')} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", tab === 'inbox' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_inbox', 'Inbox')}</button>
         <button onClick={() => setTab('archived')} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", tab === 'archived' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_archived', 'Archived')}</button>
         <button onClick={() => setTab('prefs')} className={cn("px-5 py-2.5 rounded-full text-xs font-bold transition-all", tab === 'prefs' ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{t('portal_preferences', 'Preferences')}</button>
       </div>

       {tab !== 'prefs' && (
         <div className="bg-card border border-border rounded-[40px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-muted/20">
               <h3 className="font-serif text-xl font-medium">{tab === 'inbox' ? t('portal_recent_notifications', 'Recent Notifications') : t('portal_archive_title', 'Archive')}</h3>
               {tab === 'inbox' && filtered.length > 0 && (
                 <button onClick={markAllRead} className="text-xs font-bold text-primary hover:underline">{t('portal_mark_all_read', 'Mark all as read')}</button>
               )}
            </div>
            <div>
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium text-sm">
                  {t('portal_nothing_to_see', 'Nothing to see here.')}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {renderList(grouped.intro)}
                  {renderList(grouped.event)}
                  {renderList(grouped.value)}
                </div>
              )}
            </div>
         </div>
       )}

       {tab === 'prefs' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-[40px] p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-8">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-serif text-2xl font-light">{t('portal_delivery_prefs', 'Delivery Preferences')}</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="pb-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('portal_topic', 'Topic')}</th>
                        <th className="pb-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">{t('portal_in_app', 'In-App')}</th>
                        <th className="pb-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">{t('portal_email_instant', 'Email (Instant)')}</th>
                        <th className="pb-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">{t('portal_weekly_digest', 'Weekly Digest')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {['intros', 'events', 'score', 'market'].map((topic) => (
                        <tr key={topic} className="hover:bg-muted/20 transition-colors">
                          <td className="py-5 font-bold text-sm text-foreground capitalize">{topic === 'score' ? t('portal_membership_value', 'Membership Value') : topic}</td>
                          {['inapp', 'email', 'digest'].map((channel) => (
                            <td key={channel} className="py-5 text-center">
                              <label className="flex items-center justify-center cursor-pointer w-full h-full">
                                <input 
                                  type="radio" 
                                  name={topic} 
                                  checked={(notificationPrefs as any)[topic] === channel} 
                                  onChange={() => {
                                    setNotificationPrefs({ ...notificationPrefs, [topic]: channel });
                                    showToast(t('portal_pref_saved', 'Preference saved'));
                                  }}
                                  className="accent-primary w-4 h-4 cursor-pointer"
                                />
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/10 rounded-[32px] p-8 text-center shadow-sm">
                <Bell className={cn("w-10 h-10 mx-auto mb-4 transition-colors", notificationPrefs.quietHours ? "text-muted-foreground" : "text-primary")} />
                <h4 className="font-serif text-xl font-medium mb-2">{t('portal_quiet_hours', 'Quiet Hours')}</h4>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">{t('portal_quiet_hours_desc', 'Pause email notifications outside of business hours (6 PM - 8 AM).')}</p>
                <button onClick={() => {
                  setNotificationPrefs({ ...notificationPrefs, quietHours: !notificationPrefs.quietHours });
                  showToast(t('portal_quiet_hours_toggled', 'Quiet hours toggled'));
                }} className={cn("w-full py-4 rounded-full font-bold text-sm transition-all shadow-sm", notificationPrefs.quietHours ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:border-primary/50")}>
                  {notificationPrefs.quietHours ? t('portal_quiet_active', 'Quiet Hours Active') : t('portal_enable_quiet', 'Enable Quiet Hours')}
                </button>
              </div>

              <div className="bg-card border border-border rounded-[32px] p-8 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">{t('portal_live_preview', 'Live Preview')}</div>
                <p className="text-xs text-muted-foreground mb-6">{t('portal_based_on_settings', 'Based on your settings, you will receive:')}</p>
                <ul className="space-y-4 text-sm font-medium text-foreground">
                  <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500" /> {t('portal_preview_intros', 'Instant Emails for Intros')}</li>
                  <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-orange-500" /> {t('portal_preview_events', 'App badges for Events')}</li>
                  <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green-500" /> {t('portal_preview_value', 'Digest summary for Value')}</li>
                </ul>
              </div>
           </div>
         </div>
       )}
    </div>
  );
}
