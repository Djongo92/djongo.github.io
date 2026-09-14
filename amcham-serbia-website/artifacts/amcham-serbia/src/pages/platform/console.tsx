import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { useLocation, useSearch } from 'wouter';
import { platformData, companies, Company } from '@/data/platform';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Users, FileText, AlertTriangle, 
  Target, MessageSquare, Handshake, Flag, 
  CheckSquare, Inbox, Repeat, ArrowRight,
  Search, X, Check, Eye, Download, ChevronLeft,
  Command, Menu, Phone, Activity, Globe, Mail, Plus, Book
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { 
  RitualView, HeatmapView, AccountsView, RetentionView,
  OutreachView, AskView, MatchmakingView, IntelligenceView,
  FlagsView, ApprovalsView, CoverView, DossierView,
  BriefView, MyTeamView, BoardSummaryView, DigestsView
} from './console/views';
import { CommandPalette, GlossaryDrawer, TourOverlay } from './console/components/Overlays';
import { ConsoleStateProvider } from './console/console-state';

export default function Console() {
  const { t } = useI18n();
  const searchString = useSearch();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(searchString);
  const tourDisabled = searchParams.get('tour') === 'off';
  const roleParam = searchParams.get('role') || 'staffer';
  const defaultView = roleParam === 'exec' ? 'board-summary' : 'ritual';
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const view = searchParams.get('view') || defaultView;
  const selectedCompanyId = searchParams.get('company');
  
  const [toast, setToast] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [tourStep, setTourStep] = useState(-1);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!tourDisabled && !localStorage.getItem('amcham_tour_done')) {
      setTourStep(0);
    }
  }, [tourDisabled]);

  useEffect(() => {
    if (tourStep === -1) return;
    if (roleParam === 'exec') {
      if (tourStep === 4) {
        setCmdOpen(true);
      } else if (view !== 'board-summary') {
        setLocation(`/platform/console?view=board-summary&role=${roleParam}`);
      }
      return;
    }
    if (tourStep === 0 && view !== 'ritual') setLocation(`/platform/console?view=ritual&role=${roleParam}`);
    if (tourStep === 1 && view !== 'heatmap') setLocation(`/platform/console?view=heatmap&role=${roleParam}`);
    if (tourStep === 2 && (view !== 'heatmap' || selectedCompanyId !== 'adr')) setLocation(`/platform/console?view=heatmap&company=adr&role=${roleParam}`);
    if (tourStep === 3 && view !== 'ritual') setLocation(`/platform/console?view=ritual&role=${roleParam}`);
    if (tourStep === 4) setCmdOpen(true);
    if (tourStep === 5 && view !== 'flags') { setCmdOpen(false); setLocation(`/platform/console?view=flags&role=${roleParam}`); }
  }, [tourStep]);

  const [navBadges, setNavBadges] = useState({
    ritual: platformData.console.ritual.items.length,
    flags: platformData.console.flags.length,
    approvals: platformData.console.approvals.length,
  });

  const roleMapping: Record<string, { name: string, avatar: string, id: string, title: string }> = {
    staffer: { name: 'Milica K.', avatar: 'MK', id: 'staff-1', title: t('platform.console.role_staffer') },
    lead: { name: 'Stefan M.', avatar: 'SM', id: 'staff-4', title: t('platform.console.role_lead') },
    exec: { name: 'Ana S.', avatar: 'AS', id: 'staff-5', title: t('platform.console.role_exec') }
  };
  const roleConfig = roleMapping[roleParam] || roleMapping.staffer;
  const roleAllowed = roleParam !== 'exec'
    ? roleParam === 'lead' || !['my-team', 'board-summary'].includes(view)
    : ['board-summary', 'retention', 'heatmap'].includes(view);

  const navGroups = [];

  if (roleParam === 'exec') {
    navGroups.push(
      {
        title: t('platform.console.nav_daily'),
        items: [
          { id: 'board-summary', icon: FileText, label: t('platform.console.nav_board_summary'), badge: 0 }
        ]
      },
      {
        title: t('platform.console.nav_tools'),
        items: [
          { id: 'heatmap', icon: BarChart, label: t('platform.console.heatmap'), badge: 0 },
          { id: 'retention', icon: AlertTriangle, label: t('platform.console.retention'), badge: 0 }
        ]
      }
    );
  } else {
    navGroups.push(
      {
        title: t('platform.console.nav_daily'),
        items: [
          { id: 'ritual', icon: Target, label: t('platform.console.ritual'), badge: navBadges.ritual },
          { id: 'flags', icon: Flag, label: t('platform.console.flags'), badge: navBadges.flags },
          { id: 'approvals', icon: CheckSquare, label: t('platform.console.approvals'), badge: navBadges.approvals },
        ]
      }
    );
    const toolsItems = [
      { id: 'heatmap', icon: BarChart, label: t('platform.console.heatmap'), badge: 0 },
      { id: 'accounts', icon: Users, label: t('platform.console.accounts'), badge: 0 },
      { id: 'outreach', icon: MessageSquare, label: t('platform.console.outreach'), badge: 0 },
      { id: 'ask', icon: Search, label: t('platform.console.ask'), badge: 0 },
      { id: 'matchmaking', icon: Handshake, label: t('platform.console.matchmaking'), badge: 0 },
      { id: 'intelligence', icon: Search, label: t('platform.console.nav.intelligence'), badge: 0 },
      { id: 'retention', icon: AlertTriangle, label: t('platform.console.retention'), badge: 0 },
    ];
    if (roleParam === 'lead') {
      toolsItems.push({ id: 'my-team', icon: Users, label: t('platform.console.nav_my_team'), badge: 0 });
    }
    navGroups.push({ title: t('platform.console.nav_tools'), items: toolsItems });

    const reportsItems = [
      { id: 'digests', icon: FileText, label: t('platform.console.nav_digests'), badge: 0 },
      { id: 'cover', icon: Repeat, label: t('platform.console.cover'), badge: 0 },
    ];
    navGroups.push({ title: t('platform.console.nav_reports'), items: reportsItems });
  }

  const navigateTo = (newView: string, companyId?: string) => {
    let url = `/platform/console?view=${newView}&role=${roleParam}`;
    if (companyId) url += `&company=${companyId}`;
    setLocation(url);
    setMobileMenuOpen(false);
  };

  const navContent = (
    <>
      <div className="p-6 border-b border-border">
        <Link href="/platform" className="font-bold text-foreground tracking-widest uppercase mb-1 block hover:text-primary transition-colors">AmCham OS</Link>
        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Staff Console v4.2</div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <div className="px-6 mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.title}</div>
            <div className="space-y-1 px-3">
              {group.items.map(item => {
                const isActive = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-full transition-all duration-200",
                      isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <AnimatePresence>
                      {item.badge !== undefined && item.badge > 0 && (
                        <motion.span 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          exit={{ scale: 0 }}
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                            isActive ? "bg-white/20 text-white" : "bg-primary text-primary-foreground shadow-sm"
                          )}
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-border">
        <button onClick={() => setCmdOpen(true)} className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 transition-colors p-3 rounded-full font-medium">
          <span className="flex items-center gap-2"><Search className="w-4 h-4"/> {t('platform.console.search_console')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex font-sans selection:bg-primary/20">
      
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-72 border-r border-border flex-col shrink-0 sticky top-0 h-[100dvh] bg-background/60 backdrop-blur-3xl z-40 print:hidden">
        {navContent}
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-4">
        <div className="font-bold tracking-widest text-sm uppercase font-sans">AmCham OS</div>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-foreground/70">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-background z-50 flex flex-col md:hidden"
          >
            <div className="h-16 flex items-center justify-end px-4 border-b border-border">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-foreground/70">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {navContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-h-[100dvh] pt-16 md:pt-0 min-w-0 overflow-hidden">
        <header className="hidden md:flex h-20 border-b border-border items-center px-10 justify-between shrink-0 bg-transparent print:hidden">
          <h1 className="text-2xl font-serif font-light text-foreground">
            {navGroups.flatMap(g => g.items).find(i => i.id === view)?.label || view}
          </h1>
          <div
            className="flex items-center gap-4 text-sm font-medium text-muted-foreground relative"
            onMouseEnter={() => { if (roleMenuTimer.current) clearTimeout(roleMenuTimer.current); setRoleMenuOpen(true); }}
            onMouseLeave={() => { roleMenuTimer.current = setTimeout(() => setRoleMenuOpen(false), 300); }}
          >
            <button onClick={() => setGlossaryOpen(true)} className="w-10 h-10 rounded-full border border-border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title={t('platform.console.glossary')}>
              <Book className="w-4 h-4" />
            </button>
            <button onClick={() => setRoleMenuOpen(o => !o)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-colors">
              <div className="w-2 h-2 bg-primary rounded-full shadow-sm shadow-primary/50 animate-pulse"></div>
              <div className="flex flex-col items-start leading-none mr-2">
                <span className="text-foreground font-bold">{roleConfig.name}</span>
                <span className="text-[10px] uppercase tracking-widest">{roleConfig.title}</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold ml-1 shrink-0">{roleConfig.avatar}</div>
            </button>
            <div className={`absolute top-full right-0 pt-2 w-48 transition-all z-50 ${roleMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
              <div className="bg-background border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden">
               <button onClick={() => { setRoleMenuOpen(false); setLocation(`/platform/console?view=${view}&role=staffer`); }} className="px-4 py-3 text-left hover:bg-muted font-medium text-foreground border-b border-border">Switch to Staffer</button>
               <button onClick={() => { setRoleMenuOpen(false); setLocation(`/platform/console?view=${view}&role=lead`); }} className="px-4 py-3 text-left hover:bg-muted font-medium text-foreground border-b border-border">Switch to Team Lead</button>
               <button onClick={() => { setRoleMenuOpen(false); setLocation(`/platform/console?view=${view}&role=exec`); }} className="px-4 py-3 text-left hover:bg-muted font-medium text-foreground border-b border-border">Switch to Executive</button>
               <button onClick={() => { setRoleMenuOpen(false); setTourStep(0); setLocation(`/platform/console?view=ritual&role=${roleParam}`); }} className="px-4 py-3 text-left hover:bg-muted font-medium text-primary text-xs uppercase tracking-widest flex items-center justify-between">
                 {t('platform.console.tour_replay')} <ArrowRight className="w-3 h-3" />
               </button>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-10 relative">
          <div className="max-w-6xl mx-auto">
            <ConsoleStateProvider>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="h-full"
              >
                {!roleAllowed ? (
                  <div className="max-w-xl mx-auto py-24 text-center">
                    <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center"><Eye className="w-6 h-6 text-muted-foreground" /></div>
                    <h2 className="text-3xl font-serif font-light mb-3">Restricted workspace view</h2>
                    <p className="text-muted-foreground mb-8">This destination is not part of the current role's operating scope. Switch role or return to an available workspace.</p>
                    <button onClick={() => navigateTo(defaultView)} className="px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold">Return to workspace</button>
                  </div>
                ) : <>
                  {view === 'ritual' && <RitualView navigateTo={navigateTo} showToast={showToast} updateBadge={(v: any) => setNavBadges(p => ({...p, ritual: v}))} roleParam={roleParam} />}
                  {view === 'heatmap' && <HeatmapView navigateTo={navigateTo} roleParam={roleParam} />}
                  {view === 'accounts' && <AccountsView navigateTo={navigateTo} />}
                  {view === 'retention' && <RetentionView navigateTo={navigateTo} />}
                  {view === 'outreach' && <OutreachView />}
                  {view === 'ask' && <AskView showToast={showToast} />}
                  {view === 'matchmaking' && <MatchmakingView showToast={showToast} />}
                  {view === 'intelligence' && <IntelligenceView navigateTo={navigateTo} />}
                  {view === 'flags' && <FlagsView showToast={showToast} updateBadge={(v: any) => setNavBadges(p => ({...p, flags: v}))} />}
                  {view === 'approvals' && <ApprovalsView showToast={showToast} updateBadge={(v: any) => setNavBadges(p => ({...p, approvals: v}))} />}
                  {view === 'my-team' && <MyTeamView navigateTo={navigateTo} showToast={showToast} />}
                  {view === 'board-summary' && <BoardSummaryView />}
                  {view === 'cover' && <CoverView showToast={showToast} />}
                  {view === 'digests' && <DigestsView showToast={showToast} />}
                  {view === 'brief' && <BriefView companyId={selectedCompanyId} navigateTo={navigateTo} />}
                  {!['ritual','heatmap','accounts','retention','outreach','ask','matchmaking','intelligence','flags','approvals','my-team','board-summary','cover','digests','brief'].includes(view) && (
                    <div className="max-w-xl mx-auto py-24 text-center">
                      <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center"><Eye className="w-6 h-6 text-muted-foreground" /></div>
                      <h2 className="text-3xl font-serif font-light mb-3">Page Not Found</h2>
                      <p className="text-muted-foreground mb-8">This workspace destination doesn't exist or may have been moved.</p>
                      <button onClick={() => navigateTo(defaultView)} className="px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold">Return to workspace</button>
                    </div>
                  )}
                </>}
              </motion.div>
            </AnimatePresence>
            </ConsoleStateProvider>
          </div>
        </div>
      </main>

      {/* Dossier Side Panel */}
      <AnimatePresence>
        {selectedCompanyId && view !== 'brief' && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => navigateTo(view)}
              className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-40 hidden md:block"
            />
            <motion.div 
              initial={{ opacity: 0, x: '100%', filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: '100%', filter: 'blur(10px)' }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 right-0 w-full md:w-[600px] border-l border-border bg-background/95 backdrop-blur-3xl flex flex-col shadow-2xl z-50 shrink-0"
            >
              <DossierView companyId={selectedCompanyId} navigateTo={navigateTo} close={() => navigateTo(view)} showToast={showToast} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {glossaryOpen && <GlossaryDrawer close={() => setGlossaryOpen(false)} navigateTo={navigateTo} />}
      </AnimatePresence>

      {/* Command Palette */}
      <AnimatePresence>
        {cmdOpen && (
          <CommandPalette close={() => setCmdOpen(false)} navigateTo={navigateTo} />
        )}
      </AnimatePresence>

      {/* Tour renders last so its Next/Done button stays clickable over any
          overlay a step opens (e.g. the Command Palette at step 5) — both
          use the same z-index, so DOM order decides which one is on top. */}
      <AnimatePresence>
        {tourStep > -1 && (
          <TourOverlay
            step={tourStep}
            setStep={setTourStep}
            endTour={() => { setTourStep(-1); localStorage.setItem('amcham_tour_done', 'true'); }}
            steps={[
              { title: t('platform.console.tour_step1_title'), desc: t('platform.console.tour_step1_desc') },
              { title: t('platform.console.tour_step2_title'), desc: t('platform.console.tour_step2_desc') },
              { title: t('platform.console.tour_step3_title'), desc: t('platform.console.tour_step3_desc') },
              { title: t('platform.console.tour_step4_title'), desc: t('platform.console.tour_step4_desc') },
              { title: t('platform.console.tour_step5_title'), desc: t('platform.console.tour_step5_desc') },
              { title: t('platform.console.tour_step6_title'), desc: t('platform.console.tour_step6_desc') },
            ]}
            labels={{ skip: t('platform.console.tour_skip'), next: t('platform.console.tour_next'), done: t('platform.console.tour_done') }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 md:right-10 bg-foreground text-background px-6 py-4 text-sm font-medium rounded-2xl shadow-xl z-[60] flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-background/20 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-background" />
            </div>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

