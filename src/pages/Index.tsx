import { useState, useEffect, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";
import TableOfContents from "@/components/TableOfContents";
import ChapterView from "@/components/ChapterView";
import ProgressDashboard from "@/components/ProgressDashboard";
import MobileNav from "@/components/MobileNav";
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
import { hasValidAccess } from "@/lib/edgeAuth";

type AppView = "home" | "chapter" | "dashboard" | "bookmarks" | "workshop";

const Index = () => {
  const [authenticated, setAuthenticated] = useState(false);
  useAmbientMode();
  useScrollVelocity();
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("home");
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

  const handleAuthenticated = () => {
    setAuthenticated(true);
  };

  const handleSelectChapter = (id: string) => {
    setCurrentChapterId(id);
    setView("chapter");
    markAsRead(id);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setCurrentChapterId(null);
    setView("home");
    window.scrollTo(0, 0);
  };

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

  const handleOpenSearch = useCallback(() => {
    // Trigger Cmd+K
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }, []);

  const handleMobileNav = (navView: string) => {
    if (navView === "home") {
      handleBack();
    } else if (navView === "dashboard") {
      setView("dashboard");
      setCurrentChapterId(null);
      window.scrollTo(0, 0);
    } else if (navView === "bookmarks") {
      setView("bookmarks");
      setCurrentChapterId(null);
      window.scrollTo(0, 0);
    }
  };

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

  if (view === "workshop") {
    return <Workshop onBack={handleBack} />;
  }

  if (view === "dashboard") {
    return (
      <>
        <ProgressDashboard
          readChapters={readChapters}
          bookmarks={bookmarks}
          implementationScore={overallImplScore}
          annotations={allAnnotations}
          onBack={handleBack}
          onSelectChapter={handleSelectChapter}
          getChapterScore={implementationState.getChapterScore}
          isImplemented={implementationState.isImplemented}
          onOpenPersonalize={() => setPersonalizeOpen(true)}
          onOpenMaturity={() => setMaturityOpen(true)}
          onOpenWorkshop={() => { setView("workshop"); window.scrollTo(0, 0); }}
        />
        <MobileNav
          currentView="dashboard"
          onNavigate={handleMobileNav}
          onOpenSearch={handleOpenSearch}
          bookmarkCount={bookmarks.length}
        />
        {advisorAndOnboarding(true)}
      </>
    );
  }

  if (view === "chapter" && currentChapterId) {
    const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
    const chapter = chapters[currentIndex];

    return (
      <>
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
              onBack={handleBack}
              onPrev={
                currentIndex > 0
                  ? () => handleSelectChapter(chapters[currentIndex - 1].id)
                  : undefined
              }
              onNext={
                currentIndex < chapters.length - 1
                  ? () => handleSelectChapter(chapters[currentIndex + 1].id)
                  : undefined
              }
              isBookmarked={isBookmarked(chapter.id)}
              onToggleBookmark={() => toggleBookmark(chapter.id)}
              checklistState={checklistState}
              annotationState={annotationState}
              implementationState={implementationState}
            />
          </motion.div>
        </AnimatePresence>
        <MobileNav
          currentView="home"
          onNavigate={handleMobileNav}
          onOpenSearch={handleOpenSearch}
          bookmarkCount={bookmarks.length}
        />
        {/* No floating advisor while reading — keep the focus on the page */}
        {advisorAndOnboarding(false)}
      </>
    );
  }

  if (view === "bookmarks") {
    return (
      <>
        <TableOfContents
          onSelectChapter={handleSelectChapter}
          bookmarks={bookmarks}
          onToggleBookmark={toggleBookmark}
          readChapters={readChapters}
          lastReadChapterId={lastReadChapterId}
          implementationScore={overallImplScore}
          onOpenDashboard={() => {
            setView("dashboard");
            window.scrollTo(0, 0);
          }}
        onOpenWorkshop={() => { setView("workshop"); window.scrollTo(0, 0); }}
        onOpenMaturity={() => setMaturityOpen(true)}
          onlyBookmarks
          onSetMode={(m) => {
            setView(m === "saved" ? "bookmarks" : "home");
            window.scrollTo(0, 0);
          }}
        />
        <MobileNav
          currentView="bookmarks"
          onNavigate={handleMobileNav}
          onOpenSearch={handleOpenSearch}
          bookmarkCount={bookmarks.length}
        />
        {advisorAndOnboarding(true)}
      </>
    );
  }

  return (
    <>
      <TableOfContents
        onSelectChapter={handleSelectChapter}
        bookmarks={bookmarks}
        onToggleBookmark={toggleBookmark}
        readChapters={readChapters}
        lastReadChapterId={lastReadChapterId}
        implementationScore={overallImplScore}
        onOpenDashboard={() => {
          setView("dashboard");
          window.scrollTo(0, 0);
        }}
        onOpenWorkshop={() => { setView("workshop"); window.scrollTo(0, 0); }}
        onOpenMaturity={() => setMaturityOpen(true)}
          onSetMode={(m) => {
            setView(m === "saved" ? "bookmarks" : "home");
            window.scrollTo(0, 0);
          }}
      />
      <MobileNav
        currentView="home"
        onNavigate={handleMobileNav}
        onOpenSearch={handleOpenSearch}
        bookmarkCount={bookmarks.length}
      />
      {advisorAndOnboarding(true)}
    </>
  );
};

export default Index;
