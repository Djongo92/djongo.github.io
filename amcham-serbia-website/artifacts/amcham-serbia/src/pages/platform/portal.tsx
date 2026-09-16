import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { 
  Building2, Users, BarChart, Store, Settings, Calendar, ArrowRight,
  Bell, Search, Target, Zap, CreditCard, Activity
} from 'lucide-react';
import { PortalStateProvider, usePortalState } from './portal-state';
import { TourOverlay } from './console/components/Overlays';
import { platformData, resolveViewAsMember, VIEW_AS_OPTIONS } from '@/data/platform';

// Import Views
import HomeView from './views/home-view';
import ScoreView from './views/score-view';
import GlanceView from './views/glance-view';
import DirectoryView from './views/directory-view';
import LapTimeView from './views/laptime-view';
import EventsView from './views/events-view';
import MarketplaceView from './views/marketplace-view';
import CommitteeView from './views/committee-view';
import OnboardingView from './views/onboarding-view';
import SeamView from './views/seam-view';
import PeopleView from './views/people-view';
import BillingView from './views/billing-view';
import NotificationsView from './views/notifications-view';

function PortalContent({ viewAs }: { viewAs: ReturnType<typeof resolveViewAsMember> }) {
  const { t } = useI18n();
  const searchString = useSearch();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(searchString);
  const roleParam = searchParams.get('role') || 'member';
  const view = searchParams.get('view') || 'home';
  const viewAsId = searchParams.get('member') || platformData.member.id;
  
  const { notifications, setNotifications } = usePortalState();
  const [toast, setToast] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tourDisabled = searchParams.get('tour') === 'off';
  const [tourStep, setTourStep] = useState(-1);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const navGroups = [
    {
      title: t('portal_nav_daily', 'Daily'),
      items: [
        { id: 'home', icon: Building2, label: t('portal_home', 'Home') },
        { id: 'score', icon: Activity, label: t('portal_score', 'Membership Value') },
        { id: 'glance', icon: Target, label: t('portal_glance', 'At a Glance') },
      ]
    },
    {
      title: t('portal_nav_tools', 'Tools'),
      items: [
        { id: 'directory', icon: Search, label: t('portal_directory', 'Directory') },
        { id: 'events', icon: Calendar, label: t('portal_events', 'Events') },
        { id: 'marketplace', icon: Store, label: t('portal_marketplace', 'Opportunities') },
        { id: 'committee', icon: Users, label: t('portal_committee', 'Committees') },
        { id: 'laptime', icon: BarChart, label: t('portal_laptime', 'Lap Time') },
      ]
    },
    {
      title: t('portal_nav_account', 'Account'),
      items: [
        { id: 'onboarding', icon: Zap, label: t('portal_onboarding', 'Onboarding') },
        { id: 'seam', icon: Settings, label: t('portal_seam', 'The Seam') },
        ...(roleParam === 'admin' ? [
          { id: 'people', icon: Users, label: t('portal_people', 'People') },
          { id: 'billing', icon: CreditCard, label: t('portal_billing', 'Billing') },
        ] : []),
      ]
    },
  ];
  const navItems = navGroups.flatMap(g => g.items);

  const navigateTo = (newView: string) => {
    setLocation(`/platform/portal?view=${newView}&role=${roleParam}${viewAsId !== platformData.member.id ? `&member=${viewAsId}` : ''}`);
  };

  useEffect(() => {
    if (!tourDisabled && !localStorage.getItem('amcham_portal_tour_done')) {
      setTourStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourDisabled]);

  useEffect(() => {
    if (tourStep === -1) return;
    setNotificationsOpen(false);
    if (tourStep === 0 && view !== 'home') navigateTo('home');
    if (tourStep === 1 && view !== 'score') navigateTo('score');
    if (tourStep === 2 && view !== 'directory') navigateTo('directory');
    if (tourStep === 3 && view !== 'events') navigateTo('events');
    if (tourStep === 4 && view !== 'directory') navigateTo('directory');
    if (tourStep === 5) {
      if (view !== 'seam') navigateTo('seam');
      setNotificationsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep]);

  const endTour = () => { setTourStep(-1); localStorage.setItem('amcham_portal_tour_done', 'true'); };

  const roleConfig = roleParam === 'admin'
    ? { name: 'Ana Jokić', roleStr: t('portal_admin_view', 'Admin View'), avatar: 'AJ', company: viewAs.member.name }
    : { name: 'Marko R.', roleStr: t('portal_member_view', 'Member View'), avatar: 'MR', company: viewAs.member.name };

  const unreadCount = notifications.filter((n:any) => n.status === 'unread').length;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex font-sans selection:bg-primary/20">
      {/* Sidebar */}
      <nav className="hidden md:flex w-72 border-r border-border flex-col shrink-0 sticky top-0 h-[100dvh] bg-background/60 backdrop-blur-3xl z-40">
        <div className="p-6 border-b border-border">
          <Link href="/platform" className="font-bold text-foreground tracking-widest uppercase mb-1 block hover:text-primary transition-colors">AmCham OS</Link>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Member Portal</div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 space-y-8 px-4 no-scrollbar">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div className="px-4 mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.title}</div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const isActive = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200",
                        isActive ? "bg-foreground text-background shadow-md" : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-background" : "text-muted-foreground")} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-h-[100dvh] pt-16 md:pt-0 overflow-hidden">
        <header className="fixed md:sticky top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border h-16 md:h-20 flex items-center justify-between px-4 md:px-10 shrink-0">
          <div className="md:hidden font-bold tracking-widest text-sm uppercase">AmCham OS</div>
          <h1 className="hidden md:block text-2xl font-serif font-light text-foreground capitalize">
            {navItems.find(i => i.id === view)?.label || view}
          </h1>

          <div className="flex items-center gap-4 relative">
            <select
              value={viewAsId}
              onChange={(e) => setLocation(`/platform/portal?view=${view}&role=${roleParam}&member=${e.target.value}`)}
              className="hidden lg:block bg-background border border-border rounded-full pl-4 pr-3 py-1.5 text-xs font-bold text-foreground outline-none cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
              title="Demo: view the portal as a different member"
            >
              {VIEW_AS_OPTIONS.map(id => {
                const c = platformData.allMembers.find(m => m.id === id);
                return <option key={id} value={id}>{c?.name}</option>;
              })}
            </select>

            <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-12 mt-2 w-80 bg-card border border-border shadow-xl rounded-3xl overflow-hidden z-50 flex flex-col max-h-[400px]">
                  <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                    <span className="text-[10px] uppercase font-bold tracking-widest">{t('portal_notifications', 'Notifications')}</span>
                    <button onClick={() => { setNotificationsOpen(false); navigateTo('notifications'); }} className="text-xs text-primary font-bold hover:underline">View All</button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {notifications.filter((n:any) => n.status !== 'archived').slice(0, 5).map((n:any) => (
                      <button key={n.id} onClick={() => {
                        setNotifications(notifications.map((x:any) => x.id === n.id ? { ...x, status: 'read' } : x));
                        setNotificationsOpen(false);
                        navigateTo(n.view || 'notifications');
                      }} className="w-full text-left p-3 bg-muted/30 rounded-2xl text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
                         <div className="font-bold text-xs mb-1 flex items-center justify-between">{n.type.toUpperCase()}{n.status === 'unread' && <span className="w-2 h-2 rounded-full bg-primary"/>}</div>
                         <div className="text-muted-foreground">{n.text}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className="relative"
              onMouseEnter={() => { if (roleMenuTimer.current) clearTimeout(roleMenuTimer.current); setRoleMenuOpen(true); }}
              onMouseLeave={() => { roleMenuTimer.current = setTimeout(() => setRoleMenuOpen(false), 300); }}
            >
              <button onClick={() => setRoleMenuOpen(o => !o)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-colors">
                <div className="flex flex-col items-start leading-none mr-2 hidden md:flex">
                  <span className="text-foreground font-bold">{roleConfig.name}</span>
                  <span className="text-[10px] uppercase tracking-widest">{roleConfig.roleStr}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{roleConfig.avatar}</div>
              </button>
              <div className={`absolute top-full right-0 pt-2 w-48 transition-all z-50 ${roleMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
                  <button onClick={() => { setRoleMenuOpen(false); setLocation(`/platform/portal?view=${roleParam === 'admin' ? view : 'home'}&role=admin`); }} className="px-4 py-3 text-left hover:bg-muted font-medium text-foreground text-sm border-b border-border">{t('portal_switch_admin', 'Switch to Admin')}</button>
                  <button onClick={() => { setRoleMenuOpen(false); setLocation(`/platform/portal?view=${roleParam === 'admin' && (view === 'people' || view === 'billing') ? 'home' : view}&role=member`); }} className="px-4 py-3 text-left hover:bg-muted font-medium text-foreground text-sm border-b border-border">{t('portal_switch_member', 'Switch to Member')}</button>
                  <button onClick={() => { setRoleMenuOpen(false); setTourStep(0); }} className="px-4 py-3 text-left hover:bg-muted font-medium text-primary text-xs uppercase tracking-widest flex items-center justify-between">
                    {t('portal_tour_replay', 'Replay Tour')} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-10 relative">
          <div className="max-w-6xl mx-auto space-y-12 pb-20">
             <AnimatePresence mode="wait">
               <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                 {view === 'home' && <HomeView t={t} navigateTo={navigateTo} roleConfig={roleConfig} showToast={showToast} valueReceipt={viewAs.valueReceipt} />}
                 {view === 'score' && <ScoreView t={t} navigateTo={navigateTo} showToast={showToast} member={viewAs.member} valueReceipt={viewAs.valueReceipt} scoreNarrative={viewAs.scoreNarrative} peerBenchmark={viewAs.peerBenchmark} />}
                 {view === 'glance' && <GlanceView t={t} navigateTo={navigateTo} roleParam={roleParam} member={viewAs.member} billing={viewAs.billing} glanceData={viewAs.glance} />}
                 {view === 'directory' && <DirectoryView t={t} showToast={showToast} initialViewMode={tourStep === 2 ? 'pending' : undefined} />}
                 {view === 'laptime' && <LapTimeView t={t} showToast={showToast} member={viewAs.member} />}
                 {view === 'events' && <EventsView t={t} showToast={showToast} />}
                 {view === 'marketplace' && <MarketplaceView t={t} showToast={showToast} />}
                 {view === 'committee' && <CommitteeView t={t} showToast={showToast} />}
                 {view === 'onboarding' && <OnboardingView t={t} navigateTo={navigateTo} showToast={showToast} member={viewAs.member} />}
                 {view === 'seam' && <SeamView t={t} showToast={showToast} />}
                 {view === 'people' && roleParam === 'admin' && <PeopleView t={t} showToast={showToast} />}
                 {view === 'billing' && roleParam === 'admin' && <BillingView t={t} showToast={showToast} />}
                 {view === 'notifications' && <NotificationsView t={t} showToast={showToast} navigateTo={navigateTo} />}
                 {(view === 'people' || view === 'billing') && roleParam !== 'admin' && (
                   <div className="text-center py-20 border border-dashed border-border rounded-[40px]">
                     <h3 className="font-serif text-2xl font-light mb-3">Restricted Area</h3>
                     <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">This area is only available to account administrators for your company.</p>
                     <button onClick={() => navigateTo('home')} className="px-6 py-3 bg-foreground text-background rounded-full font-bold text-sm">Back to Home</button>
                   </div>
                 )}
                 {!['home','score','glance','directory','laptime','events','marketplace','committee','onboarding','seam','people','billing','notifications'].includes(view) && (
                   <div className="text-center py-20 border border-dashed border-border rounded-[40px]">
                     <h3 className="font-serif text-2xl font-light mb-3">Page Not Found</h3>
                     <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">This section doesn't exist or may have been moved.</p>
                     <button onClick={() => navigateTo('home')} className="px-6 py-3 bg-foreground text-background rounded-full font-bold text-sm">Back to Home</button>
                   </div>
                 )}
               </motion.div>
             </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-6 right-6 z-[60] bg-foreground text-background px-6 py-4 text-sm font-medium rounded-2xl shadow-xl flex items-center gap-3">
            <Activity className="w-5 h-5 text-background" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tourStep > -1 && (
          <TourOverlay
            step={tourStep}
            setStep={setTourStep}
            endTour={endTour}
            steps={[
              { title: t('portal_tour_step1_title', 'Home Base'), desc: t('portal_tour_step1_desc', 'Your personalized command center. Start here for the big picture.') },
              { title: t('portal_tour_step2_title', 'Membership Value'), desc: t('portal_tour_step2_desc', 'See the outcomes your membership has supported and find a useful next step.') },
              { title: t('portal_tour_step3_title', 'Introductions Pipeline'), desc: t('portal_tour_step3_desc', 'Watch your requested connections move from requested to connected in real time.') },
              { title: t('portal_tour_step4_title', 'Events & Registration'), desc: t('portal_tour_step4_desc', 'Register yourself or colleagues for upcoming roundtables and events.') },
              { title: t('portal_tour_step5_title', 'Member Directory'), desc: t('portal_tour_step5_desc', 'Find partners, filter by sector, and request introductions instantly.') },
              { title: t('portal_tour_step6_title', 'Notifications & Seam'), desc: t('portal_tour_step6_desc', 'Control how you hear from us and manage your data boundaries.') },
            ]}
            labels={{
              skip: t('portal_tour_skip', 'Skip Tour'),
              next: t('portal_tour_next', 'Next'),
              done: t('portal_tour_done', 'Done'),
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Portal() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const viewAsId = searchParams.get('member') || platformData.member.id;
  const viewAs = resolveViewAsMember(viewAsId);

  return (
    <PortalStateProvider key={viewAsId} viewAs={viewAs}>
      <PortalContent viewAs={viewAs} />
    </PortalStateProvider>
  );
}