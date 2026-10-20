import { useState, useEffect, useCallback, useMemo, lazy, Suspense, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import SignInGate from "@/components/SignInGate";
import TableOfContents from "@/components/TableOfContents";
import ChapterView from "@/components/ChapterView";
import AppShell from "@/components/AppShell";
import GlobalAdvisor from "@/components/GlobalAdvisor";
import PersonalizeOnboarding from "@/components/PersonalizeOnboarding";
import CoachMarks from "@/components/CoachMarks";
import TourWelcome from "@/components/TourWelcome";
import CommandPalette, { type PaletteItem } from "@/components/CommandPalette";
import {
  LayoutDashboard, BarChart3, Hammer, Award, BookOpen, Settings as SettingsIcon,
  Gauge, FileText, Users, History, Eye, Compass,
} from "lucide-react";
import {
  SwipeIcon, CopywriterIcon, RewriteIcon, AutopsyIcon, AuditIcon,
  HeadlinesIcon, TeardownIcon, PitchDeckIcon, DeckRoastIcon, BioIcon, CalendarIcon, ArticleIcon, PressPitchIcon, LinkedInPlanIcon, CaseStudyIcon,
} from "@/components/workshop/icons";
import { WORKSHOP_TOOL_LABELS } from "@/lib/workshopToolCatalog";
import { chapters } from "@/data/chapters";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useChecklists } from "@/hooks/useChecklists";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useImplementation } from "@/hooks/useImplementation";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useFirmLogo } from "@/hooks/useFirmLogo";
import { useFirmProfile } from "@/hooks/useFirmProfile";
import type { AuditSnapshot } from "@/hooks/useAuditSnapshots";
import { useScrollVelocity } from "@/hooks/useAmbientMode";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshopHistory } from "@/hooks/useWorkshopHistory";
import { useNotifications } from "@/hooks/useNotifications";
import { useCoachMarks } from "@/hooks/useCoachMarks";
import type { CoachMarkStep } from "@/components/CoachMarks";
import { AnimatePresence, motion } from "framer-motion";
import BootVeil from "@/components/BootVeil";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";
import { computeMeasuredTotals, measuredScoreLabel, type CategoryTotals } from "@/lib/measuredScore";
import { isDemoMode, disableDemoMode, enableDemoMode, exitDemoToApp, isDemoWizardPending, consumeDemoWizardPending } from "@/lib/demoMode";
import { clearSession } from "@/lib/session";
import { DEMO_AUDIT, DEMO_HISTORY, DEMO_SNAPSHOTS, DEMO_DISPLAY_NAME } from "@/data/demoData";
import ClaimDataBanner from "@/components/ClaimDataBanner";
import { DashboardSkeleton, AnalyticsSkeleton, SettingsSkeleton, ProgressSkeleton, WorkshopSkeleton } from "@/components/SectionSkeletons";
import type { WorkshopToolId } from "@/lib/handoff";
import { launchProgressTool } from "@/lib/progressToolLaunch";
import type { StepKey as BattlePlanStepKey } from "@/components/battleplan/battlePlanModel";
import type { AuditRow, HistoryRow } from "@/components/dashboard/CommandCenter";
import { findWeakestCategoryTool } from "@/lib/categoryToolMap";
import { readArrival, type Arrival } from "@/lib/arrival";
import { waitForElement } from "@/lib/waitForElement";
import { computeScoreDelta } from "@/lib/scoreTrend";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useSectionNavigation } from "@/hooks/useSectionNavigation";
import { setAuditPrefill } from "@/lib/auditPrefill";

// Pulls in recharts — lazy-load so it's only fetched when the Dashboard
// or Analytics section is actually visited, not on every page load.
const CommandCenter = lazy(() => import("@/components/dashboard/CommandCenter"));
const Analytics = lazy(() => import("@/components/analytics/Analytics"));
const SettingsPage = lazy(() => import("@/components/settings/SettingsPage"));
// ProgressDashboard pulls in the whole original tools grid (RoadmapGenerator,
// ScoreWebsite, RoastHomepage, CompetitorAnalysis, MarketVisibilityScore,
// AskTheBook) plus BattlePlan/jsPDF — same reasoning as the above three.
const ProgressDashboard = lazy(() => import("@/components/ProgressDashboard"));
// The Battle Plan's own page — lazy for the same reason as the sections
// above (it pulls in the workflow board and, on export, jsPDF).
const BattlePlanPage = lazy(() => import("@/components/battleplan/BattlePlanPage"));
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

// Onboarding waits for this to exist rather than for a fixed delay: it's the
// first thing the tour points at, so its presence is the real signal that the
// dashboard is ready to be talked about.
const TOUR_ANCHOR = '[data-coachmark="dashboard-score"]';
// Only a ceiling. On a real account with no audit yet the score card never
// renders at all, and the tour still needs to start — CoachMarks knows how to
// skip past a target it can't find.
const TOUR_READY_TIMEOUT_MS = 6000;
// Session-scoped: the firm-profile wizard gets one attempt per visit, so
// dismissing it doesn't bury it forever (it's also reachable from Settings).
const PERSONALIZE_SEEN_KEY = "guidebook_personalize_seen";

// A single sequenced tour, shared by demo and real accounts, that actually
// walks Dashboard → Workshop → Progress (via each step's `section`) instead
// of only annotating whichever screen happened to be open — previously a
// text-only DemoOnboardingWizard modal covered Workshop/Battle Plan in the
// abstract while CoachMarks separately pointed at dashboard-only elements,
// two disconnected onboarding moments for a demo visitor to sit through.
//
// The demo used to open on an extra "this firm is fictional" framing slide.
// That framing now lives in TourWelcome, which a demo visitor answers before
// the tour starts at all — keeping it as step one would have been the same
// point made twice in a row. Both variants now share every step except the
// closing hand-off.
function buildTourSteps(outro: CoachMarkStep): CoachMarkStep[] {
  const steps: CoachMarkStep[] = [];
  steps.push(
    {
      section: "dashboard",
      target: "dashboard-score",
      title: "Your Visibility Score",
      body: "A real, externally-verified score out of 500 — performance, reputation, thought leadership, and more — compared against firms in your market.",
    },
    {
      section: "dashboard",
      target: "category-methodology",
      title: "Every number shows its work",
      body: "Click the ⓘ on any category for the exact formula and this firm's actual measured inputs — not just an asserted score. The same evidence appears in the Battle Plan.",
    },
    {
      section: "dashboard",
      target: "what-if-simulator",
      title: "See a move before you make it",
      body: "Drag real inputs — PageSpeed scores, LinkedIn followers, posting cadence — and watch your actual score recompute live, using the same formula the audit uses.",
    },
    {
      section: "workshop",
      target: "workshop-tools-grid",
      title: "Eleven AI tools live here",
      body: "Headline testing, competitor teardowns, practice-page audits, and more — each one grounded in your own firm's context, and each one remembers your firm's voice the more you use it.",
    },
    {
      section: "progress",
      target: "battle-plan",
      title: "It all rolls into a living Battle Plan",
      body: "My Progress isn't just a PDF export — it's a plan you build over time, with real previews of every section, badges for real milestones, and campaigns to track what you're actually working on right now.",
    },
  );
  steps.push(outro);
  return steps;
}

// The tour used to end on the Battle Plan and simply close, which left the
// visitor holding a product walkthrough and no next move — the single weakest
// point in the whole journey. It now closes on a hand-off, and what that
// hand-off *is* depends on who's being handed off:
//
// - A demo visitor has been looking at a fictional firm for five steps. The
//   only thing they can usefully do next is see their own number, so the tour
//   ends on the free audit — the funnel's primary CTA — not a signup wall.
//   Where they came from on the marketing site shifts the framing: someone who
//   clicked through from pricing is weighing cost, someone from the benchmark
//   section is weighing standing.
// - A real account already has a firm and a score, so the useful ending is the
//   single highest-leverage thing available to them right now: the Workshop
//   tool for whichever category is leaving the most points on the table.
function buildTourOutro(opts: {
  demo: boolean;
  arrival: Arrival | null;
  weakest: { categoryLabel: string; pointsRecoverable: number; toolId: WorkshopToolId } | null;
  onRunOwnAudit: () => void;
  onOpenTool: (toolId: WorkshopToolId) => void;
}): CoachMarkStep {
  if (opts.demo) {
    // Only branch on surfaces a demo link actually sits on today — hero, nav,
    // and the closing CTA. Someone who reached the closing CTA has read the
    // whole pitch; someone who clicked from the hero or nav skipped it.
    const body =
      opts.arrival?.from === "closing"
        ? "You've read the pitch — this is the part that matters. Everything you just saw was computed from public data about a single domain. Put your own in and you'll see exactly where your firm lands against the 91 benchmarked firms."
        : "Everything you just saw was computed from public data about a single domain. Put your own in and the same audit runs against your firm — two of the five categories, free, no signup.";
    return {
      title: "Now run it on your own firm",
      body,
      action: { label: "Score my firm →", onSelect: opts.onRunOwnAudit },
    };
  }

  if (opts.weakest) {
    return {
      title: "Start where the points are",
      body: `${opts.weakest.categoryLabel} is your weakest category — ${opts.weakest.pointsRecoverable} points still on the table there, more than anywhere else. The Workshop tool built for it is the fastest way to move your score.`,
      action: {
        label: `Open ${opts.weakest.categoryLabel} →`,
        onSelect: () => opts.onOpenTool(opts.weakest!.toolId),
      },
    };
  }

  return {
    title: "That's the tour",
    body: "Everything stays where you left it. If you want to walk through it again, the tour is in the command palette (⌘K) and under Account in the sidebar.",
  };
}

const Index = () => {
  // Demo mode (sample data, no real account) and a real Supabase Auth
  // session are the two independent ways in: either unlocks the app.
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const { session: authSession, loading: authLoading, signOut: authSignOut, sessionExpired, clearSessionExpired } = useAuth();
  const workshopHistory = useWorkshopHistory();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const authenticated = demoActive || !!authSession;
  useScrollVelocity();

  // Dashboard is the app's home — every section lives inside the same
  // persistent shell (AppShell) instead of replacing the whole screen.
  // The active section is derived from the ?section= URL param (see the
  // hook), so reloads, bookmarks, and back/forward keep your place.
  // Guidebook sub-state (chapter being read, bookmarks view) is URL-derived
  // too, so a reload mid-chapter reopens that chapter instead of dropping
  // back to the table of contents.
  const { section, goToSection, guidebookView, currentChapterId, goToChapter, goToGuidebookView } =
    useSectionNavigation();
  const [visibilityData, setVisibilityData] = useState<{ audits: AuditRow[]; history: HistoryRow[]; snapshots?: AuditSnapshot[] } | null>(null);
  const [pendingWorkshopTool, setPendingWorkshopTool] = useState<WorkshopToolId | null>(null);

  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const { readChapters, lastReadChapterId, markAsRead } = useReadingProgress();
  const checklistState = useChecklists();
  const annotationState = useAnnotations();
  const implementationState = useImplementation();
  const { hasContext } = useFirmContext();
  const { logo: personalLogo } = useFirmLogo();
  // §11 — white-label: a workspace's own uploaded logo (firm_profiles)
  // takes priority over the personal-browser one, so switching into a
  // client's workspace shows that client's branding, not the consultant's.
  const { profile: firmProfile } = useFirmProfile();
  const firmLogo = firmProfile?.logo_data_url ?? personalLogo;
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [maturityOpen, setMaturityOpen] = useState(false);
  const [competitorsOpen, setCompetitorsOpen] = useState(false);
  const [workshopHistoryOpen, setWorkshopHistoryOpen] = useState(false);
  // Demo runs a longer tour (it carries an extra framing slide), so saved
  // progress is scoped to the variant — a step index from one is meaningless
  // to the other.
  const coachMarks = useCoachMarks(demoActive ? "demo" : "account");
  // True from the moment the tour is queued until it closes, so nothing else
  // schedules itself into the same slice of the visitor's attention.
  const [tourPending, setTourPending] = useState(false);
  // The welcome counts as busy too: it's asking a question, and the
  // firm-profile wizard stacking a second modal on top of it would answer
  // for them.
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const tourBusy = tourPending || welcomeOpen || coachMarks.active;
  // Read once per mount: the marketing site's record of how this visitor got
  // here, used to frame the tour's closing hand-off.
  const arrival: Arrival | null = useMemo(() => readArrival(), []);
  const navigate = useNavigate();

  const startOwnFirmAudit = useCallback(() => {
    // A showcase visitor must leave its fictional, network-disabled state
    // before opening the live audit. Keeping the domain prefill makes the
    // handoff feel continuous while ensuring the real endpoint can run.
    disableDemoMode();
    setDemoActive(false);
    setAuditPrefill({ market: "serbia" });
    navigate("/teaser");
  }, [navigate]);

  // A real account's identity key is the same client_id column an
  // anonymous browser has always used (see visibility-audit-claim) — once
  // signed in, that's auth.uid() instead of the local random id.
  const realUserId = authSession?.user?.id;
  const { activeFirmId } = useActiveWorkspace();

  const fetchVisibility = useCallback(async () => {
    if (isDemoMode()) {
      setVisibilityData({ audits: [DEMO_AUDIT], history: DEMO_HISTORY, snapshots: DEMO_SNAPSHOTS });
      return;
    }
    try {
      const clientId = realUserId ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-audit-get`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ clientId, accessToken: authSession?.access_token, activeFirmId }),
      });
      const data = await resp.json();
      if (!resp.ok) return;
      setVisibilityData(data);
    } catch {
      // No audit yet (or the fetch failed) — Dashboard's empty state covers this.
    }
  }, [realUserId, authSession?.access_token, activeFirmId]);

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

  // Onboarding is sequenced, not raced.
  //
  // There used to be two interruptions on two independent fixed timers — the
  // tour at 600ms, the firm-profile wizard at 1500ms — with nothing preventing
  // both from wanting the screen, and nothing checking that the UI they point
  // at had rendered yet. Both problems are the same problem: a delay is a
  // guess about someone else's machine. Now the tour claims the screen first,
  // the wizard waits for it to settle, and both wait on a real DOM target.
  useEffect(() => {
    if (!authenticated || coachMarks.active || welcomeOpen) return;

    // A tour interrupted partway through resumes where it stopped. It used to
    // vanish permanently: the trigger that started it was one-shot, and the
    // "seen" flag was only written at the very end, so a refresh mid-tour left
    // the visitor with no tour and no way to ask for it back.
    const resumable = coachMarks.isResumable();
    // The welcome was raised on an earlier visit and never answered — put the
    // question back rather than dropping it, since the session flag that
    // originally raised it is long gone.
    const offered = coachMarks.isOffered();
    // Peek, don't spend. This decision is made well before it can be acted
    // on — the welcome doesn't go up until the dashboard has actually
    // rendered — so consuming the one-shot here meant an abort in between (a
    // section change, a demo/auth flip) threw the flag away without ever
    // using it, leaving that visitor with neither welcome nor tour.
    const demoPending =
      !resumable && !offered && demoActive && !coachMarks.hasSeen() && isDemoWizardPending();
    const firstRealOpen = !demoActive && !coachMarks.hasSeen() && section === "dashboard";
    if (!resumable && !offered && !demoPending && !firstRealOpen) return;

    setTourPending(true);
    const controller = new AbortController();
    waitForElement(TOUR_ANCHOR, TOUR_READY_TIMEOUT_MS, controller.signal).then(() => {
      if (controller.signal.aborted) return;
      setTourPending(false);
      // Someone already partway through has answered this question once;
      // asking again would be the nag the welcome exists to remove. Everyone
      // else gets the choice before anything takes over the screen.
      if (resumable) {
        // Pass the live step count so a stale saved index is clamped into range
        // rather than starting the overlay on a step that doesn't exist.
        coachMarks.start(tourSteps.length);
      } else {
        // Spend the one-shot only now, at the moment the welcome actually
        // goes up and the persisted "offered" status takes over from it.
        if (demoPending) consumeDemoWizardPending();
        coachMarks.offer();
        setWelcomeOpen(true);
      }
    });
    return () => {
      controller.abort();
      setTourPending(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, demoActive, section]);

  // The firm-profile wizard is a modal; stacking it over the tour's spotlight
  // overlay makes both unusable. It waits for the tour to finish or be
  // declined, then takes its turn.
  useEffect(() => {
    if (!authenticated || hasContext || tourBusy) return;
    if (sessionStorage.getItem(PERSONALIZE_SEEN_KEY)) return;
    const controller = new AbortController();
    waitForElement(TOUR_ANCHOR, TOUR_READY_TIMEOUT_MS, controller.signal).then(() => {
      if (controller.signal.aborted) return;
      setPersonalizeOpen(true);
      sessionStorage.setItem(PERSONALIZE_SEEN_KEY, "1");
    });
    return () => controller.abort();
  }, [authenticated, hasContext, tourBusy]);

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
    goToChapter(id);
  };

  const handleBackToToc = () => {
    goToGuidebookView("toc");
  };

  // Reading progress tracks the URL, not the click: back/forward, reloads,
  // and shared chapter links all count as reading the chapter, exactly like
  // selecting it from the TOC did.
  useEffect(() => {
    if (currentChapterId) markAsRead(currentChapterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterId]);

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

  // The Battle Plan is its own section now — no more scroll-hunting for a
  // card embedded in the Progress page; the teaser card there deep-links
  // here too (ProgressDashboard's onOpenBattlePlan).
  const openBattlePlan = () => goToSection("battleplan");

  // Battle Plan CTAs open the actual tool, never just a section: progress
  // tools open via the launch bus (pending id survives the lazy mount),
  // workshop tools via the existing pending-tool handoff, maturity is a
  // top-level modal.
  const runBattlePlanTool = (key: BattlePlanStepKey) => {
    switch (key) {
      case "maturity":
        setMaturityOpen(true);
        return;
      case "headline":
        openWorkshopTool("headlines");
        return;
      case "bio":
        openWorkshopTool("bio");
        return;
      default:
        goToSection("progress");
        launchProgressTool(key);
    }
  };

  // Sidebar identity + alert dot — a lightweight version of the same
  // "is anything worth reviewing" check CommandCenter's insights feed
  // does, so the nav itself can flag it without duplicating that hook.
  const primaryAudit = visibilityData?.audits[0];
  const firmName = primaryAudit?.display_name || primaryAudit?.audited_domain;
  const scoreLabel = primaryAudit
    ? measuredScoreLabel(primaryAudit.total_score, computeMeasuredTotals({
        performance: { score: primaryAudit.performance_score, provenance: primaryAudit.provenance?.performance ?? "missing" },
        social: { score: primaryAudit.social_score, provenance: primaryAudit.provenance?.social ?? "missing" },
        seoAuthority: { score: primaryAudit.seo_authority_score, provenance: primaryAudit.provenance?.seoAuthority ?? "missing" },
        thoughtLeadership: { score: primaryAudit.thought_leadership_score, provenance: primaryAudit.provenance?.thoughtLeadership ?? "missing" },
        reputation: { score: primaryAudit.reputation_score, provenance: primaryAudit.provenance?.reputation ?? "missing" },
      } satisfies CategoryTotals))
    : undefined;
  const scoreDelta = computeScoreDelta(
    visibilityData?.history ?? [],
    primaryAudit ? { audited_domain: primaryAudit.audited_domain, market: primaryAudit.market } : null,
  );
  // Full-score and directory-only leaderboards are one merged page with a
  // toggle now (MarketIndex.tsx) — this opens on the Full Score tab by
  // default since visibility-index is the more complete of its two URLs.
  const rankingsHref = primaryAudit ? `${import.meta.env.BASE_URL}visibility-index/${primaryAudit.market}` : undefined;

  // The sidebar's "Workshop" shortcut deep-links to a concrete next step
  // instead of just duplicating the plain "Workshop" nav item above it
  // with an identical destination: prefer "Continue: {your last tool}"
  // (recency is the strongest signal once there's any activity), falling
  // back to "Work on: {weakest category}" for a cold start (same
  // weakest-category-below-50% logic the Key Insights feed uses).
  const weakestCategoryTool = primaryAudit
    ? findWeakestCategoryTool({
        performance: { score: primaryAudit.performance_score, provenance: primaryAudit.provenance?.performance ?? "missing" },
        social: { score: primaryAudit.social_score, provenance: primaryAudit.provenance?.social ?? "missing" },
        thoughtLeadership: { score: primaryAudit.thought_leadership_score, provenance: primaryAudit.provenance?.thoughtLeadership ?? "missing" },
        reputation: { score: primaryAudit.reputation_score, provenance: primaryAudit.provenance?.reputation ?? "missing" },
      })
    : null;
  const lastWorkshopRun = workshopHistory.runs[0];
  const workshopRecommendation = lastWorkshopRun
    ? { label: `Continue: ${lastWorkshopRun.toolLabel}`, onClick: () => openWorkshopTool(lastWorkshopRun.toolId) }
    : weakestCategoryTool
      ? { label: `Work on: ${weakestCategoryTool.categoryLabel}`, onClick: () => openWorkshopTool(weakestCategoryTool.toolId) }
      : undefined;

  // Memoized so the overlay's per-step effects don't see a fresh array
  // identity every time the page underneath them re-renders. weakestCategoryTool
  // is rebuilt each render, so depend on its fields rather than the object.
  const tourSteps = useMemo(
    () =>
      buildTourSteps(
        buildTourOutro({
          demo: demoActive,
          arrival,
          weakest: weakestCategoryTool,
          onRunOwnAudit: startOwnFirmAudit,
          onOpenTool: openWorkshopTool,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      demoActive,
      arrival,
      startOwnFirmAudit,
      weakestCategoryTool?.toolId,
      weakestCategoryTool?.categoryLabel,
      weakestCategoryTool?.pointsRecoverable,
    ],
  );

  // Cmd/Ctrl+K palette — every section, sidebar tool, and Workshop tool in
  // one searchable list, grouped the same way the sidebar is so it reads
  // as a search box over the same structure rather than a separate map.
  const WORKSHOP_TOOL_ICONS: Record<WorkshopToolId, JSX.Element> = {
    swipe: <SwipeIcon size={16} />,
    copywriter: <CopywriterIcon size={16} />,
    rewrite: <RewriteIcon size={16} />,
    autopsy: <AutopsyIcon size={16} />,
    audit: <AuditIcon size={16} />,
    headlines: <HeadlinesIcon size={16} />,
    teardown: <TeardownIcon size={16} />,
    deck: <PitchDeckIcon size={16} />,
    deckroast: <DeckRoastIcon size={16} />,
    bio: <BioIcon size={16} />,
    calendar: <CalendarIcon size={16} />,
    article: <ArticleIcon size={16} />,
    pitch: <PressPitchIcon size={16} />,
    linkedin: <LinkedInPlanIcon size={16} />,
    casestudy: <CaseStudyIcon size={16} />,
  };
  const paletteItems: PaletteItem[] = [
    { id: "nav-dashboard", label: "Dashboard", group: "Navigate", icon: <LayoutDashboard className="w-4 h-4" />, onSelect: () => goToSection("dashboard") },
    { id: "nav-analytics", label: "Analytics", group: "Navigate", icon: <BarChart3 className="w-4 h-4" />, onSelect: () => goToSection("analytics") },
    { id: "nav-workshop", label: "Workshop", group: "Navigate", icon: <Hammer className="w-4 h-4" />, onSelect: () => goToSection("workshop") },
    { id: "nav-progress", label: "My Progress", group: "Navigate", icon: <Award className="w-4 h-4" />, onSelect: () => goToSection("progress") },
    { id: "nav-guidebook", label: "Guidebook", group: "Navigate", icon: <BookOpen className="w-4 h-4" />, onSelect: () => goToSection("guidebook") },
    { id: "nav-settings", label: "Settings", group: "Navigate", icon: <SettingsIcon className="w-4 h-4" />, onSelect: () => goToSection("settings") },
    { id: "tool-maturity", label: "Firm Maturity Score", group: "Tools", icon: <Gauge className="w-4 h-4" />, onSelect: () => setMaturityOpen(true) },
    { id: "tool-battleplan", label: "Battle Plan", group: "Tools", icon: <FileText className="w-4 h-4" />, onSelect: openBattlePlan },
    { id: "tool-competitors", label: "Competitors", group: "Tools", icon: <Users className="w-4 h-4" />, onSelect: () => setCompetitorsOpen(true) },
    { id: "tool-workshophistory", label: "Workshop History", group: "Tools", icon: <History className="w-4 h-4" />, onSelect: () => setWorkshopHistoryOpen(true) },
    { id: "tour-replay", label: "Replay guided tour", group: "Tools", icon: <Compass className="w-4 h-4" />, onSelect: coachMarks.restart },
    ...(Object.keys(WORKSHOP_TOOL_LABELS) as WorkshopToolId[]).map((toolId) => ({
      id: `workshop-${toolId}`,
      label: WORKSHOP_TOOL_LABELS[toolId],
      group: "Workshop tools",
      icon: WORKSHOP_TOOL_ICONS[toolId],
      onSelect: () => openWorkshopTool(toolId),
    })),
    ...(rankingsHref
      ? [{ id: "public-rankings", label: "Rankings", group: "Public pages", icon: <Eye className="w-4 h-4" />, onSelect: () => window.open(rankingsHref, "_blank") }]
      : []),
  ];

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
    return <BootVeil label="Checking your session" />;
  }

  if (!authenticated) {
    return <SignInGate onDemo={handleDemo} sessionExpired={sessionExpired} onDismissSessionExpired={clearSessionExpired} />;
  }

  const acceptTour = () => {
    setWelcomeOpen(false);
    coachMarks.start(tourSteps.length);
  };
  // Closing the welcome any way at all — the button, Escape, the backdrop —
  // is a decision, and gets recorded as one. Leaving it unrecorded would put
  // the same question back on the next page load.
  //
  // "Just explore" also stands down the firm-profile wizard for this visit.
  // It normally takes its turn the moment the tour stops being busy, which
  // meant answering "don't guide me, let me look around" was immediately
  // followed by a three-step form — the exact interruption the visitor just
  // declined. It's session-scoped, so a later visit still offers it, and
  // Settings has it either way.
  const declineTour = () => {
    setWelcomeOpen(false);
    coachMarks.decline();
    try {
      sessionStorage.setItem(PERSONALIZE_SEEN_KEY, "1");
    } catch {
      // Private-mode storage failures shouldn't break dismissing a dialog.
    }
  };

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
      <TourWelcome
        open={welcomeOpen}
        variant={demoActive ? "demo" : "account"}
        firmName={DEMO_DISPLAY_NAME}
        onAccept={acceptTour}
        onDecline={declineTour}
      />
      <CoachMarks
        steps={tourSteps}
        active={coachMarks.active}
        startStep={coachMarks.startStep}
        onStepChange={coachMarks.recordStep}
        onDone={coachMarks.finish}
        onNavigate={goToSection}
      />
      <CommandPalette items={paletteItems} open={paletteOpen} onOpenChange={setPaletteOpen} />
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
        onSetMode={(m) => goToGuidebookView(m === "saved" ? "bookmarks" : "toc")}
      />
    );
  };

  return (
    <>
      {/* In-flow above the shell so the claim banner pushes content down
          instead of overlaying it (it used to be a fixed bottom overlay that
          covered Workshop tool output). */}
      {authSession && <ClaimDataBanner session={authSession} onClaimed={fetchVisibility} />}
      <AppShell
        active={section}
        onNavigate={goToSection}
        demoMode={isDemoMode()}
        onExitDemo={disableDemoMode}
        onLogInFromDemo={exitDemoToApp}
        showcaseSignedIn={!!authSession}
        onSignOut={handleSignOut}
        firmName={firmName}
        firmLogo={firmLogo}
        scoreLabel={scoreLabel}
        scoreDelta={scoreDelta}
        notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.created_at, read: !!n.read_at }))}
        unreadCount={unreadCount}
        onOpenNotifications={markAllRead}
        onOpenSettings={() => goToSection("settings")}
        onOpenPalette={() => setPaletteOpen(true)}
        onReplayTour={coachMarks.restart}
        onOpenMaturity={() => setMaturityOpen(true)}
        onOpenBattlePlan={openBattlePlan}
        onOpenCompetitors={() => setCompetitorsOpen(true)}
        onOpenWorkshopHistory={() => setWorkshopHistoryOpen(true)}
        onOpenWorkshop={() => goToSection("workshop")}
        workshopRecommendation={workshopRecommendation}
        rankingsHref={rankingsHref}
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
                  snapshots={visibilityData?.snapshots ?? []}
                  onOpenDashboard={() => goToSection("dashboard")}
                  onCorrected={fetchVisibility}
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
                  onSelectChapter={handleSelectChapter}
                  getChapterScore={implementationState.getChapterScore}
                  isImplemented={implementationState.isImplemented}
                  onOpenPersonalize={() => setPersonalizeOpen(true)}
                  onOpenMaturity={() => setMaturityOpen(true)}
                  onOpenWorkshop={() => goToSection("workshop")}
                  onOpenBattlePlan={openBattlePlan}
                />
              </Suspense>
            )}
            {section === "battleplan" && (
              <Suspense fallback={<ProgressSkeleton />}>
                <BattlePlanPage
                  readChaptersCount={readChapters.length}
                  totalChapters={chapters.length}
                  implementationScore={overallImplScore}
                  onRunTool={runBattlePlanTool}
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
      {advisorAndOnboarding(section !== "guidebook" || guidebookView !== "chapter")}
    </>
  );
};

export default Index;
