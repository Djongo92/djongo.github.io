import { useState, useEffect, lazy, Suspense } from "react";
import PasswordGate from "@/components/PasswordGate";
import TableOfContents from "@/components/TableOfContents";
import ChapterView from "@/components/ChapterView";
import ProgressDashboard from "@/components/ProgressDashboard";
import AppShell, { Section } from "@/components/AppShell";
import GlobalAdvisor from "@/components/GlobalAdvisor";
import PersonalizeOnboarding from "@/components/PersonalizeOnboarding";
import Workshop from "@/components/Workshop";
import FirmMaturityScore from "@/components/FirmMaturityScore";
import { chapters } from "@/data/chapters";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useChecklists } from "@/hooks/useChecklists";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useImplementation } from "@/hooks/useImplementation";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useAmbientMode, useScrollVelocity } from "@/hooks/useAmbientMode";
import { AnimatePresence, motion } from "framer-motion";
import { hasValidAccess, edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { isDemoMode, disableDemoMode } from "@/lib/demoMode";
import { DEMO_AUDIT, DEMO_HISTORY } from "@/data/demoData";
import type { WorkshopToolId } from "@/lib/handoff";
import type { AuditRow, HistoryRow } from "@/components/dashboard/CommandCenter";

// Pulls in recharts — lazy-load so it's only fetched when the Dashboard
// section is actually visited, not on every page load.
const CommandCenter = lazy(() => import("@/components/dashboard/CommandCenter"));

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type GuidebookView = "toc" | "chapter" | "progress" | "bookmarks";

const Index = () => {
  const [authenticated, setAuthenticated] = useState(false);
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

  useEffect(() => {
    if (hasValidAccess("guidebook")) setAuthenticated(true);
  }, []);

  // Fetch the firm's own visibility data once authenticated — the
  // Dashboard section renders its own empty state if there isn't any yet,
  // so nothing here decides what the home view is; Dashboard always is.
  // Demo mode substitutes a rich sample dataset instead of hitting the
  // real backend at all — see src/data/demoData.ts.
  useEffect(() => {
    if (!authenticated) return;
    if (isDemoMode()) {
      setVisibilityData({ audits: [DEMO_AUDIT], history: DEMO_HISTORY });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const clientId = getOrCreateClientId();
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-get`, {
          method: "POST",
          headers: edgeHeaders("benchmark"),
          body: JSON.stringify({ clientId }),
        });
        const data = await resp.json();
        if (cancelled || !resp.ok) return;
        setVisibilityData(data);
      } catch {
        // No audit yet (or the fetch failed) — Dashboard's empty state covers this.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

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

  const handleAuthenticated = () => setAuthenticated(true);

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

  // Sidebar identity + alert dot — a lightweight version of the same
  // "is anything worth reviewing" check CommandCenter's insights feed
  // does, so the nav itself can flag it without duplicating that hook.
  const primaryAudit = visibilityData?.audits[0];
  const firmName = primaryAudit?.display_name || primaryAudit?.audited_domain;
  const scoreLabel = primaryAudit ? `${Math.round(primaryAudit.total_score)} / 200` : undefined;
  const weakCategoryChecks: { score: number; max: number; provenance?: string }[] = primaryAudit
    ? [
        { score: primaryAudit.performance_score, max: 20, provenance: primaryAudit.provenance?.performance },
        { score: primaryAudit.social_score, max: 20, provenance: primaryAudit.provenance?.social },
        { score: primaryAudit.thought_leadership_score, max: 45, provenance: primaryAudit.provenance?.thoughtLeadership },
        { score: primaryAudit.reputation_score, max: 55, provenance: primaryAudit.provenance?.reputation },
      ]
    : [];
  const hasWeakCategory = weakCategoryChecks.some(
    ({ score, max, provenance }) => provenance !== "missing" && score / max < 0.5,
  );
  const siteHealth = primaryAudit?.raw_metrics?.siteHealth;
  const hasSiteHealthIssue = Boolean(
    siteHealth && (!siteHealth.hasContactForm || siteHealth.copyrightStale || siteHealth.brokenLinks.length > 0),
  );
  const hasAlerts = hasWeakCategory || hasSiteHealthIssue;

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

  if (!authenticated) {
    return <PasswordGate onAuthenticated={handleAuthenticated} />;
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
        firmName={firmName}
        scoreLabel={scoreLabel}
        hasAlerts={hasAlerts}
        onOpenSettings={() => setPersonalizeOpen(true)}
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
            />
          </Suspense>
        )}
        {section === "workshop" && <Workshop onBack={() => goToSection("dashboard")} />}
        {section === "guidebook" && renderGuidebook()}
      </AppShell>
      {advisorAndOnboarding(section !== "guidebook" || guidebookView !== "chapter")}
    </>
  );
};

export default Index;
