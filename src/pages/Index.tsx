import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import SignInGate from "@/components/SignInGate";
import TableOfContents from "@/components/TableOfContents";
import ChapterView from "@/components/ChapterView";
import ProgressDashboard from "@/components/ProgressDashboard";
import AppShell, { Section, SidebarAlert } from "@/components/AppShell";
import GlobalAdvisor from "@/components/GlobalAdvisor";
import PersonalizeOnboarding from "@/components/PersonalizeOnboarding";
import Workshop from "@/components/Workshop";
import FirmMaturityScore from "@/components/FirmMaturityScore";
import CompetitorTracker from "@/components/CompetitorTracker";
import WorkshopHistoryModal from "@/components/WorkshopHistoryModal";
import { chapters } from "@/data/chapters";
import { CATEGORY_META, type CategoryKey } from "@/lib/visibilityCategories";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useChecklists } from "@/hooks/useChecklists";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useImplementation } from "@/hooks/useImplementation";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useAmbientMode, useScrollVelocity } from "@/hooks/useAmbientMode";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { isDemoMode, disableDemoMode, enableDemoMode } from "@/lib/demoMode";
import { clearSession } from "@/lib/session";
import { DEMO_AUDIT, DEMO_HISTORY } from "@/data/demoData";
import ClaimDataBanner from "@/components/ClaimDataBanner";
import type { WorkshopToolId } from "@/lib/handoff";
import type { AuditRow, HistoryRow } from "@/components/dashboard/CommandCenter";

// Pulls in recharts — lazy-load so it's only fetched when the Dashboard
// or Analytics section is actually visited, not on every page load.
const CommandCenter = lazy(() => import("@/components/dashboard/CommandCenter"));
const Analytics = lazy(() => import("@/components/analytics/Analytics"));
const SettingsPage = lazy(() => import("@/components/settings/SettingsPage"));

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type GuidebookView = "toc" | "chapter" | "progress" | "bookmarks";

const Index = () => {
  // Demo mode (sample data, no real account) and a real Supabase Auth
  // session are the two independent ways in: either unlocks the app.
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const { session: authSession, loading: authLoading, signOut: authSignOut } = useAuth();
  const authenticated = demoActive || !!authSession;
  useAmbientMode();
  useScrollVelocity();

  // Dashboard is the app's home — every section lives inside the same
  // persistent shell (AppShell) instead of replacing the whole screen.
  const [section, setSection] = useState<Section>("dashboard");
  const [guidebookView, setGuidebookView] = useState<GuidebookView>("toc");
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [visibilityData, setVisibilityData] = useState<{ audits: AuditRow[]; history: HistoryRow[] } | null>(null);

  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const { readChapters, lastReadChapterId, markAsRead } = useReadingProgress();
  const checklistState = useChecklists();
  const annotationState = useAnnotations();
  const implementationState = useImplementation();
  const { hasContext } = useFirmContext();
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [maturityOpen, setMaturityOpen] = useState(false);
  const [competitorsOpen, setCompetitorsOpen] = useState(false);
  const [workshopHistoryOpen, setWorkshopHistoryOpen] = useState(false);

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

  const handleDemo = () => {
    enableDemoMode();
    setDemoActive(true);
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
  // quick action or insight. Workshop only starts listening for the
  // "switch tool" event once it's mounted, so the dispatch is deferred a
  // tick behind the section switch.
  const openWorkshopTool = (toolId: WorkshopToolId) => {
    goToSection("workshop");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("workshop:switch-tool", { detail: { toolId } }));
    }, 50);
  };

  // Battle Plan lives inside the Guidebook's progress view (ProgressDashboard)
  // rather than as its own section — this just jumps straight there instead
  // of making it a three-click detour through the guidebook's table of contents.
  const openBattlePlan = () => {
    goToSection("guidebook");
    setGuidebookView("progress");
  };

  // Sidebar identity + alert dot — a lightweight version of the same
  // "is anything worth reviewing" check CommandCenter's insights feed
  // does, so the nav itself can flag it without duplicating that hook.
  const primaryAudit = visibilityData?.audits[0];
  const firmName = primaryAudit?.display_name || primaryAudit?.audited_domain;
  const scoreLabel = primaryAudit ? `${Math.round(primaryAudit.total_score)} / 200` : undefined;
  const rankingsHref = primaryAudit ? `${import.meta.env.BASE_URL}rankings/${primaryAudit.market}` : undefined;
  const directoryIndexHref = primaryAudit ? `${import.meta.env.BASE_URL}directory/${primaryAudit.market}` : undefined;

  // Sidebar's alert bell — the same "is anything worth reviewing" signal
  // CommandCenter's own insights feed surfaces, but as real entries here
  // instead of a boolean, so the nav can show what's actually wrong.
  const sidebarAlerts: SidebarAlert[] = useMemo(() => {
    if (!primaryAudit) return [];
    const list: SidebarAlert[] = [];
    const catFields: { key: CategoryKey; score: number; provenance?: string }[] = [
      { key: "performance", score: primaryAudit.performance_score, provenance: primaryAudit.provenance?.performance },
      { key: "social", score: primaryAudit.social_score, provenance: primaryAudit.provenance?.social },
      { key: "thoughtLeadership", score: primaryAudit.thought_leadership_score, provenance: primaryAudit.provenance?.thoughtLeadership },
      { key: "reputation", score: primaryAudit.reputation_score, provenance: primaryAudit.provenance?.reputation },
    ];
    catFields.forEach(({ key, score, provenance }) => {
      if (provenance === "missing") return;
      const max = CATEGORY_META[key].max;
      if (score / max < 0.5) {
        list.push({
          id: `weak-${key}`,
          title: `${CATEGORY_META[key].label} is your weakest area`,
          body: `Scoring ${Math.round(score * 10) / 10} of ${max} points.`,
        });
      }
    });
    const health = primaryAudit.raw_metrics?.siteHealth;
    if (health) {
      if (!health.hasContactForm) {
        list.push({ id: "health-contact", title: "No contact form detected", body: "Your homepage doesn't appear to have one." });
      }
      if (health.copyrightStale && health.copyrightYear) {
        list.push({ id: "health-copyright", title: "Stale copyright year", body: `Your footer shows ${health.copyrightYear}.` });
      }
      if (health.brokenLinks.length > 0) {
        list.push({ id: "health-links", title: "Broken links found", body: `${health.brokenLinks.length} broken link(s) on your homepage.` });
      }
    }
    return list;
  }, [primaryAudit]);

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
    return <SignInGate onDemo={handleDemo} />;
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
      <FirmMaturityScore open={maturityOpen} onClose={() => setMaturityOpen(false)} />
      <CompetitorTracker open={competitorsOpen} onClose={() => setCompetitorsOpen(false)} primaryAudit={primaryAudit} />
      <WorkshopHistoryModal open={workshopHistoryOpen} onClose={() => setWorkshopHistoryOpen(false)} onOpenWorkshopTool={openWorkshopTool} />
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

    if (guidebookView === "progress") {
      return (
        <ProgressDashboard
          readChapters={readChapters}
          bookmarks={bookmarks}
          implementationScore={overallImplScore}
          annotations={allAnnotations}
          onBack={() => setGuidebookView("toc")}
          onSelectChapter={handleSelectChapter}
          getChapterScore={implementationState.getChapterScore}
          isImplemented={implementationState.isImplemented}
          onOpenPersonalize={() => setPersonalizeOpen(true)}
          onOpenMaturity={() => setMaturityOpen(true)}
          onOpenWorkshop={() => goToSection("workshop")}
        />
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
        onOpenDashboard={() => setGuidebookView("progress")}
        onOpenWorkshop={() => goToSection("workshop")}
        onOpenMaturity={() => setMaturityOpen(true)}
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
        scoreLabel={scoreLabel}
        alerts={sidebarAlerts}
        onOpenSettings={() => goToSection("settings")}
        onOpenMaturity={() => setMaturityOpen(true)}
        onOpenBattlePlan={openBattlePlan}
        onOpenCompetitors={() => setCompetitorsOpen(true)}
        onOpenWorkshopHistory={() => setWorkshopHistoryOpen(true)}
        rankingsHref={rankingsHref}
        directoryIndexHref={directoryIndexHref}
      >
        {section === "dashboard" && (
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Analytics audits={visibilityData?.audits ?? []} history={visibilityData?.history ?? []} />
          </Suspense>
        )}
        {section === "workshop" && <Workshop onBack={() => goToSection("dashboard")} />}
        {section === "guidebook" && renderGuidebook()}
        {section === "settings" && (
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <SettingsPage primaryAudit={primaryAudit} />
          </Suspense>
        )}
      </AppShell>
      {authSession && <ClaimDataBanner session={authSession} onClaimed={fetchVisibility} />}
      {advisorAndOnboarding(section !== "guidebook" || guidebookView !== "chapter")}
    </>
  );
};

export default Index;
