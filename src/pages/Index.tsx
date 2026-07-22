import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import SignInGate from "@/components/SignInGate";
import TableOfContents from "@/components/TableOfContents";
import ChapterView from "@/components/ChapterView";
import AppShell, { Section } from "@/components/AppShell";
import GlobalAdvisor from "@/components/GlobalAdvisor";
import PersonalizeOnboarding from "@/components/PersonalizeOnboarding";
import DemoOnboardingWizard from "@/components/DemoOnboardingWizard";
import CoachMarks from "@/components/CoachMarks";
import { chapters } from "@/data/chapters";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useChecklists } from "@/hooks/useChecklists";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useImplementation } from "@/hooks/useImplementation";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useFirmLogo } from "@/hooks/useFirmLogo";
import { useScrollVelocity } from "@/hooks/useAmbientMode";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useCoachMarks } from "@/hooks/useCoachMarks";
import type { CoachMarkStep } from "@/components/CoachMarks";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { isDemoMode, disableDemoMode, enableDemoMode, consumeDemoWizardPending } from "@/lib/demoMode";
import { clearSession } from "@/lib/session";
import { DEMO_AUDIT, DEMO_HISTORY } from "@/data/demoData";
import ClaimDataBanner from "@/components/ClaimDataBanner";
import { DashboardSkeleton, AnalyticsSkeleton, SettingsSkeleton, ProgressSkeleton, WorkshopSkeleton } from "@/components/SectionSkeletons";
import type { WorkshopToolId } from "@/lib/handoff";
import type { AuditRow, HistoryRow } from "@/components/dashboard/CommandCenter";

// Pulls in recharts — lazy-load so it's only fetched when the Dashboard
// or Analytics section is actually visited, not on every page load.
const CommandCenter = lazy(() => import("@/components/dashboard/CommandCenter"));
const Analytics = lazy(() => import("@/components/analytics/Analytics"));
const SettingsPage = lazy(() => import("@/components/settings/SettingsPage"));
// ProgressDashboard pulls in the whole original tools grid (RoadmapGenerator,
// ScoreWebsite, RoastHomepage, CompetitorAnalysis, MarketVisibilityScore,
// AskTheBook) plus BattlePlan/jsPDF — same reasoning as the above three.
const ProgressDashboard = lazy(() => import("@/components/ProgressDashboard"));
// The Workshop's eleven tools (each its own sub-component) and these three
// opt-in modals were previously eagerly imported here, meaning every
// visitor — including an anonymous SignInGate view that never
// authenticates — downloaded them as part of the main bundle. None of the
// four are needed until a signed-in user explicitly opens them.
const Workshop = lazy(() => import("@/components/Workshop"));
const FirmMaturityScore = lazy(() => import("@/components/FirmMaturityScore"));
const CompetitorTracker = lazy(() => import("@/components/CompetitorTracker"));
const WorkshopHistoryModal = lazy(() => import("@/components/WorkshopHistoryModal"));

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const COACH_MARK_STEPS: CoachMarkStep[] = [
  {
    target: "dashboard-score",
    title: "Your Visibility Score",
    body: "A real, externally-verified score out of 200 — performance, reputation, thought leadership, and more — compared against firms in your market.",
  },
  {
    target: "nav-workshop",
    title: "Eleven AI tools live here",
    body: "Headline testing, competitor teardowns, practice-page audits, and more — each one grounded in your own firm's context.",
  },
  {
    target: "nav-progress",
    title: "It all rolls into a Battle Plan",
    body: "My Progress assembles everything you've run into one exportable PDF you can hand to your partners.",
  },
  {
    target: "category-methodology",
    title: "Every number shows its work",
    body: "Click the ⓘ on any category for the exact formula and this firm's actual measured inputs — not just an asserted score. The same evidence appears in the Battle Plan PDF.",
  },
];

type GuidebookView = "toc" | "chapter" | "bookmarks";

const Index = () => {
  // Demo mode (sample data, no real account) and a real Supabase Auth
  // session are the two independent ways in: either unlocks the app.
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const { session: authSession, loading: authLoading, signOut: authSignOut, sessionExpired, clearSessionExpired } = useAuth();
  const authenticated = demoActive || !!authSession;
  useScrollVelocity();

  // Dashboard is the app's home — every section lives inside the same
  // persistent shell (AppShell) instead of replacing the whole screen.
  const [section, setSection] = useState<Section>("dashboard");
  const [guidebookView, setGuidebookView] = useState<GuidebookView>("toc");
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [visibilityData, setVisibilityData] = useState<{ audits: AuditRow[]; history: HistoryRow[] } | null>(null);
  const [pendingWorkshopTool, setPendingWorkshopTool] = useState<WorkshopToolId | null>(null);

  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const { readChapters, lastReadChapterId, markAsRead } = useReadingProgress();
  const checklistState = useChecklists();
  const annotationState = useAnnotations();
  const implementationState = useImplementation();
  const { hasContext } = useFirmContext();
  const { logo: firmLogo } = useFirmLogo();
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [maturityOpen, setMaturityOpen] = useState(false);
  const [competitorsOpen, setCompetitorsOpen] = useState(false);
  const [workshopHistoryOpen, setWorkshopHistoryOpen] = useState(false);
  const [demoWizardOpen, setDemoWizardOpen] = useState(false);
  const coachMarks = useCoachMarks();

  // A real account's identity key is the same client_id column an
  // anonymous browser has always used (see visibility-audit-claim) — once
  // signed in, that's auth.uid() instead of the local random id.
  const realUserId = authSession?.user?.id;

  const fetchVisibility = useCallback(async () => {
    if (isDemoMode()) {
      setVisibilityData({ audits: [DEMO_AUDIT], history: DEMO_HISTORY });
      return;
    }
    try {
      const clientId = realUserId ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-get`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ clientId, accessToken: authSession?.access_token }),
      });
      const data = await resp.json();
      if (!resp.ok) return;
      setVisibilityData(data);
    } catch {
      // No audit yet (or the fetch failed) — Dashboard's empty state covers this.
    }
  }, [realUserId, authSession?.access_token]);

  // Fetch the firm's own visibility data once authenticated — the
  // Dashboard section renders its own empty state if there isn't any yet,
  // so nothing here decides what the home view is; Dashboard always is.
  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchVisibility();
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, fetchVisibility]);

  // Prompt for personalization once per session, after auth
  useEffect(() => {
    if (authenticated && !hasContext && !sessionStorage.getItem("guidebook_personalize_seen")) {
      const t = setTimeout(() => {
        setPersonalizeOpen(true);
        sessionStorage.setItem("guidebook_personalize_seen", "1");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [authenticated, hasContext]);

  // Greet a freshly-entered demo session with a short orientation tour —
  // consumeDemoWizardPending is a one-shot flag set only by enableDemoMode,
  // so this never re-fires on an ordinary reload of an already-open demo tab.
  useEffect(() => {
    if (demoActive && consumeDemoWizardPending()) {
      const t = setTimeout(() => setDemoWizardOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [demoActive]);

  // First-open coach marks point at real, live UI (score ring, Workshop
  // nav, My Progress nav) rather than a mockup, so they only make sense on
  // the Dashboard. Demo visitors get them right after the wizard closes;
  // real accounts get them on their first Dashboard view, once, ever.
  useEffect(() => {
    if (!authenticated || demoActive || coachMarks.hasSeen() || section !== "dashboard") return;
    const t = setTimeout(() => coachMarks.start(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, demoActive, section]);

  const closeDemoWizard = () => {
    setDemoWizardOpen(false);
    if (!coachMarks.hasSeen()) {
      setTimeout(() => coachMarks.start(), 300);
    }
  };

  const handleDemo = () => {
    // enableDemoMode always ends in a full page reload, which remounts
    // Index fresh with demoActive read straight from localStorage — a
    // setDemoActive(true) here would only force a transient pre-reload
    // render, and that render's effects (e.g. the demo wizard's one-shot
    // flag) would fire and be discarded before the real mount ever sees them.
    enableDemoMode();
  };

  const handleSignOut = async () => {
    if (authSession) await authSignOut();
    clearSession();
    window.location.reload();
  };

  const handleSelectChapter = (id: string) => {
    setCurrentChapterId(id);
    setGuidebookView("chapter");
    markAsRead(id);
    window.scrollTo(0, 0);
  };

  const handleBackToToc = () => {
    setCurrentChapterId(null);
    setGuidebookView("toc");
    window.scrollTo(0, 0);
  };

  const goToSection = (s: Section) => {
    setSection(s);
    window.scrollTo(0, 0);
  };

  // Deep-links straight into a specific Workshop tool from a Dashboard
  // quick action or insight. pendingWorkshopTool covers a fresh mount
  // (Workshop is lazy-loaded, so it can't be assumed to already be
  // mounted and listening); the CustomEvent below covers the case
  // Workshop is already open and just needs to switch tools in place.
  const openWorkshopTool = (toolId: WorkshopToolId) => {
    setPendingWorkshopTool(toolId);
    goToSection("workshop");
    window.dispatchEvent(new CustomEvent("workshop:switch-tool", { detail: { toolId } }));
  };

  const openBattlePlan = () => goToSection("progress");

  // Sidebar identity + alert dot — a lightweight version of the same
  // "is anything worth reviewing" check CommandCenter's insights feed
  // does, so the nav itself can flag it without duplicating that hook.
  const primaryAudit = visibilityData?.audits[0];
  const firmName = primaryAudit?.display_name || primaryAudit?.audited_domain;
  const scoreLabel = primaryAudit ? `${Math.round(primaryAudit.total_score)} / 200` : undefined;
  const visibilityIndexHref = primaryAudit ? `${import.meta.env.BASE_URL}visibility-index/${primaryAudit.market}` : undefined;
  const recognitionIndexHref = primaryAudit ? `${import.meta.env.BASE_URL}recognition-index/${primaryAudit.market}` : undefined;

  // Sidebar's Bell is a real, persisted notification inbox now (see
  // useNotifications) — CommandCenter's own "Key Insights" cards already
  // cover the "what's currently wrong with your score" advisory role, so
  // the Bell doesn't need to duplicate that as a derived list anymore.
  const { notifications, unreadCount, markAllRead } = useNotifications();

  // Calculate overall implementation score
  const chapterActions = chapters
    .filter((c) => c.actionItems && c.actionItems.length > 0)
    .map((c) => ({ chapterId: c.id, total: c.actionItems!.length }));
  const overallImplScore = implementationState.getOverallScore(chapterActions);
  const totalActions = chapterActions.reduce((acc, c) => acc + c.total, 0);
  const implementedCount = Math.round((overallImplScore / 100) * totalActions);

  // Get all annotations as record
  const allAnnotations: Record<string, string> = {};
  chapters.forEach((c) => {
    const note = annotationState.getAnnotation(c.id);
    if (note) allAnnotations[c.id] = note;
  });

  // Demo mode never needs the real session check; only wait on authLoading
  // when demo isn't already active, so a demo walkthrough never flashes a
  // loading screen behind the scenes.
  if (!demoActive && authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return <SignInGate onDemo={handleDemo} sessionExpired={sessionExpired} onDismissSessionExpired={clearSessionExpired} />;
  }

  // Hide the floating advisor while actively reading a chapter to reduce clutter.
  const advisorAndOnboarding = (showAdvisor: boolean) => (
    <>
      {showAdvisor && (
        <GlobalAdvisor
          readChapters={readChapters}
          bookmarks={bookmarks}
          implementedCount={implementedCount}
          totalActions={totalActions}
        />
      )}
      <PersonalizeOnboarding open={personalizeOpen} onClose={() => setPersonalizeOpen(false)} />
      <Suspense fallback={null}>
        <FirmMaturityScore open={maturityOpen} onClose={() => setMaturityOpen(false)} />
        <CompetitorTracker open={competitorsOpen} onClose={() => setCompetitorsOpen(false)} primaryAudit={primaryAudit} />
        <WorkshopHistoryModal open={workshopHistoryOpen} onClose={() => setWorkshopHistoryOpen(false)} onOpenWorkshopTool={openWorkshopTool} />
      </Suspense>
      <DemoOnboardingWizard open={demoWizardOpen} onClose={closeDemoWizard} />
      <CoachMarks steps={COACH_MARK_STEPS} active={coachMarks.active} onDone={coachMarks.finish} />
    </>
  );

  const renderGuidebook = () => {
    if (guidebookView === "chapter" && currentChapterId) {
      const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
      const chapter = chapters[currentIndex];
      return (
        <AnimatePresence mode="wait">
          <motion.div
            key={chapter.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChapterView
              chapter={chapter}
              onBack={handleBackToToc}
              onPrev={currentIndex > 0 ? () => handleSelectChapter(chapters[currentIndex - 1].id) : undefined}
              onNext={
                currentIndex < chapters.length - 1 ? () => handleSelectChapter(chapters[currentIndex + 1].id) : undefined
              }
              isBookmarked={isBookmarked(chapter.id)}
              onToggleBookmark={() => toggleBookmark(chapter.id)}
              checklistState={checklistState}
              annotationState={annotationState}
              implementationState={implementationState}
            />
          </motion.div>
        </AnimatePresence>
      );
    }

    return (
      <TableOfContents
        onSelectChapter={handleSelectChapter}
        bookmarks={bookmarks}
        onToggleBookmark={toggleBookmark}
        readChapters={readChapters}
        lastReadChapterId={lastReadChapterId}
        implementationScore={overallImplScore}
        onlyBookmarks={guidebookView === "bookmarks"}
        onSetMode={(m) => setGuidebookView(m === "saved" ? "bookmarks" : "toc")}
      />
    );
  };

  return (
    <>
      <AppShell
        active={section}
        onNavigate={goToSection}
        demoMode={isDemoMode()}
        onExitDemo={disableDemoMode}
        onSignOut={handleSignOut}
        firmName={firmName}
        firmLogo={firmLogo}
        scoreLabel={scoreLabel}
        notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.created_at, read: !!n.read_at }))}
        unreadCount={unreadCount}
        onOpenNotifications={markAllRead}
        onOpenSettings={() => goToSection("settings")}
        onOpenMaturity={() => setMaturityOpen(true)}
        onOpenBattlePlan={openBattlePlan}
        onOpenCompetitors={() => setCompetitorsOpen(true)}
        onOpenWorkshopHistory={() => setWorkshopHistoryOpen(true)}
        visibilityIndexHref={visibilityIndexHref}
        recognitionIndexHref={recognitionIndexHref}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          >
            {section === "dashboard" && (
              <Suspense fallback={<DashboardSkeleton />}>
                <CommandCenter
                  audits={visibilityData?.audits ?? []}
                  history={visibilityData?.history ?? []}
                  readChaptersCount={readChapters.length}
                  totalChapters={chapters.length}
                  implementationScore={overallImplScore}
                  onOpenWorkshop={() => goToSection("workshop")}
                  onOpenWorkshopTool={openWorkshopTool}
                  onOpenGuidebook={() => goToSection("guidebook")}
                  onOpenMaturity={() => setMaturityOpen(true)}
                  onOpenAnalytics={() => goToSection("analytics")}
                />
              </Suspense>
            )}
            {section === "analytics" && (
              <Suspense fallback={<AnalyticsSkeleton />}>
                <Analytics
                  audits={visibilityData?.audits ?? []}
                  history={visibilityData?.history ?? []}
                  onOpenDashboard={() => goToSection("dashboard")}
                />
              </Suspense>
            )}
            {section === "workshop" && (
              <Suspense fallback={<WorkshopSkeleton />}>
                <Workshop onBack={() => goToSection("dashboard")} initialToolId={pendingWorkshopTool} />
              </Suspense>
            )}
            {section === "progress" && (
              <Suspense fallback={<ProgressSkeleton />}>
                <ProgressDashboard
                  readChapters={readChapters}
                  bookmarks={bookmarks}
                  implementationScore={overallImplScore}
                  annotations={allAnnotations}
                  onBack={() => goToSection("dashboard")}
                  onSelectChapter={(id) => {
                    goToSection("guidebook");
                    handleSelectChapter(id);
                  }}
                  getChapterScore={implementationState.getChapterScore}
                  isImplemented={implementationState.isImplemented}
                  onOpenPersonalize={() => setPersonalizeOpen(true)}
                  onOpenMaturity={() => setMaturityOpen(true)}
                  onOpenWorkshop={() => goToSection("workshop")}
                />
              </Suspense>
            )}
            {section === "guidebook" && renderGuidebook()}
            {section === "settings" && (
              <Suspense fallback={<SettingsSkeleton />}>
                <SettingsPage primaryAudit={primaryAudit} />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </AppShell>
      {authSession && <ClaimDataBanner session={authSession} onClaimed={fetchVisibility} />}
      {advisorAndOnboarding(section !== "guidebook" || guidebookView !== "chapter")}
    </>
  );
};

export default Index;
