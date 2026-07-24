import { ReactNode, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Hammer, BookOpen, BarChart3, FlaskConical, Settings, Circle, LogOut,
  Gauge, FileText, Eye, Users, History, Bell, Landmark, MoreHorizontal, X, Award,
  ArrowRight, ExternalLink, TrendingUp, TrendingDown, ChevronsLeft, ChevronsRight, Search,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FirmCrest from "@/components/FirmCrest";

export type Section = "dashboard" | "analytics" | "workshop" | "progress" | "guidebook" | "settings";

export interface SidebarNotification {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  read: boolean;
}

/** "3h ago" / "2d ago" — coarse on purpose, this is a short notification list, not a log viewer. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

interface AppShellProps {
  active: Section;
  onNavigate: (section: Section) => void;
  children: ReactNode;
  demoMode?: boolean;
  onExitDemo?: () => void;
  onSignOut?: () => void;
  firmName?: string;
  firmLogo?: string | null;
  scoreLabel?: string;
  /** Change in total score since the first recorded audit — shown next to scoreLabel so the
   * sidebar itself reflects trajectory, not just a static snapshot, on every page, not just Dashboard. */
  scoreDelta?: number;
  notifications?: SidebarNotification[];
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenPalette?: () => void;
  onOpenMaturity?: () => void;
  onOpenBattlePlan?: () => void;
  onOpenCompetitors?: () => void;
  onOpenWorkshopHistory?: () => void;
  onOpenWorkshop?: () => void;
  /** A concrete next step in the Workshop — "Continue: {last tool}" if there's run history,
   * else "Work on: {weakest category}" if one qualifies — computed by Index.tsx. Replaces a
   * generic "More in Workshop" shortcut that duplicated the plain "Workshop" nav item above it
   * with an identical destination. Label is rendered as-is (already includes its own prefix). */
  workshopRecommendation?: { label: string; onClick: () => void };
  visibilityIndexHref?: string;
  recognitionIndexHref?: string;
}

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "workshop", label: "Workshop", icon: Hammer },
  { id: "progress", label: "My Progress", icon: Award },
  { id: "guidebook", label: "Guidebook", icon: BookOpen },
];

const NavGroupLabel = ({ children }: { children: ReactNode }) => (
  <p className="px-3 pt-5 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">
    {children}
  </p>
);

const SIDEBAR_COLLAPSED_KEY = "legalos_sidebar_collapsed";

/**
 * Persistent app shell — the thing every section lives inside, so moving
 * between Dashboard/Analytics/Workshop/My Progress/Guidebook is in-app
 * navigation, not a full-screen takeover you have to "back" out of. Desktop
 * gets a fixed, sticky left sidebar grouped into Workspace / Tools /
 * Account; mobile gets a bottom tab bar with the five primary sections plus
 * a "More" sheet for everything the desktop sidebar's Tools/Account groups
 * hold — those were previously desktop-only and unreachable from a phone.
 */
const AppShell = ({
  active, onNavigate, children, demoMode, onExitDemo, onSignOut, firmName, firmLogo, scoreLabel, scoreDelta, notifications, unreadCount, onOpenNotifications,
  onOpenSettings, onOpenPalette, onOpenMaturity, onOpenBattlePlan, onOpenCompetitors, onOpenWorkshopHistory, onOpenWorkshop, workshopRecommendation,
  visibilityIndexHref, recognitionIndexHref,
}: AppShellProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  const hasTools = Boolean(onOpenMaturity || onOpenBattlePlan || onOpenCompetitors || onOpenWorkshopHistory);
  const notificationList = notifications ?? [];
  const hasUnread = (unreadCount ?? 0) > 0;

  const closeMore = () => setMoreOpen(false);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, c ? "0" : "1");
      return !c;
    });
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar — sticky so it stays put while content scrolls */}
      <aside
        className={`hidden md:flex md:flex-col md:shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-r hairline material-thin transition-[width] duration-200 ${
          collapsed ? "md:w-16" : "md:w-56"
        }`}
      >
        <div className={collapsed ? "px-3 pt-8 pb-2" : "px-6 pt-8 pb-2"}>
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && <span className="font-display text-xl font-semibold text-foreground tracking-tight">LegalOS</span>}
            {(firmName || scoreLabel) && (
              <Popover onOpenChange={(open) => open && onOpenNotifications?.()}>
                <PopoverTrigger className="relative p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Notifications">
                  <Bell className="w-4 h-4" />
                  {hasUnread && <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 absolute top-0.5 right-0.5" />}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">Notifications</p>
                  </div>
                  {notificationList.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-body">
                      Nothing yet — you'll see updates here when your score changes automatically.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {notificationList.map((n) => (
                        <div key={n.id} className="border-b border-border/40 last:border-0 pb-2 last:pb-0 flex items-start gap-2">
                          {!n.read && <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 shrink-0 mt-1.5" />}
                          <div className={n.read ? "pl-3.5" : undefined}>
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-body text-foreground">{n.title}</p>
                              <span className="text-[10px] text-muted-foreground font-body shrink-0">{relativeTime(n.createdAt)}</span>
                            </div>
                            {n.body && <p className="text-xs text-muted-foreground font-body">{n.body}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => onNavigate("dashboard")}
                    className="mt-3 text-xs text-primary hover:text-gold-light font-body"
                  >
                    Go to Dashboard →
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {firmName && (
            <div className={`flex items-center gap-1.5 mt-1 min-w-0 ${collapsed ? "justify-center" : ""}`} title={collapsed ? firmName : undefined}>
              {firmLogo ? (
                <img src={firmLogo} alt="" className="w-4 h-4 rounded-sm object-cover shrink-0" />
              ) : (
                <FirmCrest name={firmName} size={16} />
              )}
              {!collapsed && (
                <p className="text-xs text-muted-foreground font-body truncate" title={firmName}>
                  {firmName}
                </p>
              )}
            </div>
          )}
          {scoreLabel && !collapsed && (
            <p className="text-[11px] font-body mt-1.5 inline-flex items-center gap-1.5 text-emerald-500">
              {scoreLabel}
              {!!scoreDelta && (
                <span className={`inline-flex items-center gap-0.5 ${scoreDelta > 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {scoreDelta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex-1">
          {onOpenPalette && (
            <div className={collapsed ? "px-3 pt-4" : "px-3 pt-3"}>
              <button
                onClick={onOpenPalette}
                title="Search (⌘K)"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-body text-muted-foreground border border-border/50 hover:border-primary/40 hover:text-foreground transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                {!collapsed && (
                  <>
                    <span>Search</span>
                    <span className="ml-auto text-[10px] tracking-wide opacity-60">⌘K</span>
                  </>
                )}
              </button>
            </div>
          )}
          {!collapsed && <NavGroupLabel>Workspace</NavGroupLabel>}
          <nav className={`px-3 space-y-1 ${collapsed ? "mt-4" : ""}`}>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;
              const showAlertDot = id === "dashboard" && hasUnread;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  data-coachmark={`nav-${id}`}
                  title={collapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body transition-colors relative tap-scale ${collapsed ? "justify-center" : ""} ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-nav-pill"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10 shrink-0" />
                  {!collapsed && <span className="relative z-10">{label}</span>}
                  {showAlertDot && (
                    <Circle className="w-2 h-2 fill-amber-500 text-amber-500 absolute right-3 z-10" />
                  )}
                </button>
              );
            })}
          </nav>

          {hasTools && (
            <>
              {!collapsed && <NavGroupLabel>Tools</NavGroupLabel>}
              <nav className={`px-3 space-y-1 ${collapsed ? "mt-4" : ""}`}>
                {onOpenMaturity && (
                  <button
                    onClick={onOpenMaturity}
                    title={collapsed ? "Firm Maturity Score" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
                  >
                    <Gauge className="w-4 h-4 shrink-0" />
                    {!collapsed && "Firm Maturity Score"}
                  </button>
                )}
                {onOpenBattlePlan && (
                  <button
                    onClick={onOpenBattlePlan}
                    title={collapsed ? "Battle Plan" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    {!collapsed && "Battle Plan"}
                  </button>
                )}
                {onOpenCompetitors && (
                  <button
                    onClick={onOpenCompetitors}
                    title={collapsed ? "Competitors" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    {!collapsed && "Competitors"}
                  </button>
                )}
                {(onOpenMaturity || onOpenBattlePlan || onOpenCompetitors) && (
                  <button
                    onClick={workshopRecommendation ? workshopRecommendation.onClick : onOpenWorkshop ?? (() => onNavigate("workshop"))}
                    title={collapsed ? (workshopRecommendation ? workshopRecommendation.label : "More in Workshop") : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
                  >
                    <Hammer className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <>
                        {workshopRecommendation ? workshopRecommendation.label : "More in Workshop"}
                        <ArrowRight className="w-3 h-3 ml-auto opacity-60" />
                      </>
                    )}
                  </button>
                )}
                {onOpenWorkshopHistory && (
                  <button
                    onClick={onOpenWorkshopHistory}
                    title={collapsed ? "Workshop History" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
                  >
                    <History className="w-4 h-4 shrink-0" />
                    {!collapsed && "Workshop History"}
                  </button>
                )}
              </nav>
            </>
          )}

          {(visibilityIndexHref || recognitionIndexHref) && (
            <>
              {!collapsed && <NavGroupLabel>Public pages</NavGroupLabel>}
              <nav className={`px-3 space-y-1 ${collapsed ? "mt-4" : ""}`}>
                {visibilityIndexHref && (
                  <a
                    href={visibilityIndexHref}
                    target="_blank"
                    rel="noreferrer"
                    title={collapsed ? "Visibility Index" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <>
                        Visibility Index
                        <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
                      </>
                    )}
                  </a>
                )}
                {recognitionIndexHref && (
                  <a
                    href={recognitionIndexHref}
                    target="_blank"
                    rel="noreferrer"
                    title={collapsed ? "Recognition Index" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
                  >
                    <Landmark className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <>
                        Recognition Index
                        <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
                      </>
                    )}
                  </a>
                )}
              </nav>
            </>
          )}
        </div>

        <div className="mt-auto">
          {onOpenSettings && !collapsed && (
            <NavGroupLabel>Account</NavGroupLabel>
          )}
          {onOpenSettings && (
            <div className={`px-3 ${collapsed ? "pt-4 pb-3" : "pb-3"}`}>
              <button
                onClick={onOpenSettings}
                title={collapsed ? "Settings" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body transition-colors relative tap-scale ${collapsed ? "justify-center" : ""} ${
                  active === "settings" ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {active === "settings" && (
                  <motion.div
                    layoutId="desktop-nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Settings className="w-4 h-4 relative z-10 shrink-0" />
                {!collapsed && <span className="relative z-10">Settings</span>}
              </button>
            </div>
          )}
          {demoMode ? (
            <div className="px-3 pb-3">
              {collapsed ? (
                <button
                  onClick={onExitDemo}
                  title="Demo mode — click to exit"
                  className="w-full flex items-center justify-center px-3 py-2.5 rounded-sm bg-amber-500/10 border border-amber-500/30"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm bg-amber-500/10 border border-amber-500/30">
                  <FlaskConical className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body text-amber-500">Demo mode</p>
                  </div>
                  {onExitDemo && (
                    <button onClick={onExitDemo} className="text-[10px] font-body text-amber-500/70 hover:text-amber-500 underline shrink-0">
                      Exit
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : onSignOut ? (
            <div className="px-3 pb-3">
              <button
                onClick={onSignOut}
                title={collapsed ? "Sign out" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && "Sign out"}
              </button>
            </div>
          ) : null}

          <div className="px-3 pb-6">
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors tap-scale ${collapsed ? "justify-center" : ""}`}
            >
              {collapsed ? <ChevronsRight className="w-4 h-4 shrink-0" /> : <ChevronsLeft className="w-4 h-4 shrink-0" />}
              {!collapsed && "Collapse"}
            </button>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>

      {/* Mobile demo-mode pill */}
      {demoMode && (
        <div className="fixed top-3 right-3 z-50 md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 backdrop-blur-sm">
          <FlaskConical className="w-3 h-3 text-amber-500" />
          {onExitDemo && (
            <button onClick={onExitDemo} className="text-[10px] font-body text-amber-500 underline">
              Exit demo
            </button>
          )}
        </div>
      )}

      {/* Mobile bottom nav — four primary sections + a "More" sheet holding
          everything the desktop Tools/Account groups have. */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden material-thick border-t hairline safe-area-pb">
        <div className="flex items-center justify-around py-2 px-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            const showAlertDot = id === "dashboard" && hasUnread;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                data-coachmark={`nav-${id}`}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative tap-scale ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
                <span className="text-[9px] font-body tracking-wide relative z-10">{label}</span>
                {showAlertDot && (
                  <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 absolute top-1 right-2 z-10" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors relative tap-scale ${
              moreOpen || active === "settings" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {(moreOpen || active === "settings") && (
              <motion.div
                layoutId="mobile-nav-pill"
                className="absolute inset-0 bg-primary/10 rounded-xl"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <MoreHorizontal className="w-5 h-5 relative z-10" />
            <span className="text-[9px] font-body tracking-wide relative z-10">More</span>
            {hasUnread && <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 absolute top-1 right-2 z-10" />}
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet — Tools + Account, unreachable from the bottom
          nav's four primary slots. */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm"
            onClick={closeMore}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-card hairline border-t rounded-t-2xl shadow-apple-lg max-h-[80vh] overflow-y-auto safe-area-pb"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <span className="font-display text-lg text-foreground">More</span>
                <button onClick={closeMore} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {notificationList.length > 0 && (
                <div className="px-5 pb-3">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-amber-500 font-body mb-2">Notifications</p>
                  <div className="space-y-2">
                    {notificationList.map((n) => (
                      <div key={n.id} className="text-sm font-body">
                        <p className="text-foreground">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasTools && (
                <>
                  <p className="px-5 pt-2 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">Tools</p>
                  <div className="px-3 pb-2">
                    {onOpenMaturity && (
                      <button onClick={() => { onOpenMaturity(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                        <Gauge className="w-4 h-4 text-primary" /> Firm Maturity Score
                      </button>
                    )}
                    {onOpenBattlePlan && (
                      <button onClick={() => { onOpenBattlePlan(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                        <FileText className="w-4 h-4 text-primary" /> Battle Plan
                      </button>
                    )}
                    {onOpenCompetitors && (
                      <button onClick={() => { onOpenCompetitors(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                        <Users className="w-4 h-4 text-primary" /> Competitors
                      </button>
                    )}
                    {(onOpenMaturity || onOpenBattlePlan || onOpenCompetitors) && (
                      <button
                        onClick={() => { (workshopRecommendation ? workshopRecommendation.onClick : onOpenWorkshop ?? (() => onNavigate("workshop")))(); closeMore(); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale"
                      >
                        <Hammer className="w-4 h-4 text-primary" />
                        {workshopRecommendation ? workshopRecommendation.label : "More in Workshop"}
                        <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                      </button>
                    )}
                    {onOpenWorkshopHistory && (
                      <button onClick={() => { onOpenWorkshopHistory(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                        <History className="w-4 h-4 text-primary" /> Workshop History
                      </button>
                    )}
                  </div>
                </>
              )}

              {(visibilityIndexHref || recognitionIndexHref) && (
                <>
                  <p className="px-5 pt-2 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">Public pages</p>
                  <div className="px-3 pb-2">
                    {visibilityIndexHref && (
                      <a href={visibilityIndexHref} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                        <Eye className="w-4 h-4 text-primary" /> Visibility Index <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-40" />
                      </a>
                    )}
                    {recognitionIndexHref && (
                      <a href={recognitionIndexHref} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                        <Landmark className="w-4 h-4 text-primary" /> Recognition Index <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-40" />
                      </a>
                    )}
                  </div>
                </>
              )}

              <p className="px-5 pt-2 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">Account</p>
              <div className="px-3 pb-6">
                {onOpenSettings && (
                  <button onClick={() => { onOpenSettings(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                    <Settings className="w-4 h-4 text-primary" /> Settings
                  </button>
                )}
                {demoMode ? (
                  onExitDemo && (
                    <button onClick={() => { onExitDemo(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-amber-500 hover:bg-secondary/50 transition-colors">
                      <FlaskConical className="w-4 h-4" /> Exit demo mode
                    </button>
                  )
                ) : (
                  onSignOut && (
                    <button onClick={() => { onSignOut(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body text-foreground hover:bg-secondary/50 transition-colors tap-scale">
                      <LogOut className="w-4 h-4 text-primary" /> Sign out
                    </button>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppShell;
