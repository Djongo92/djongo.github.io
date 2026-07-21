import { ReactNode } from "react";
import {
  LayoutDashboard, Hammer, BookOpen, BarChart3, FlaskConical, Settings, Circle, LogOut,
  Gauge, FileText, Trophy, Users, History, Bell, Landmark,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type Section = "dashboard" | "analytics" | "workshop" | "guidebook" | "settings";

export interface SidebarAlert {
  id: string;
  title: string;
  body: string;
}

interface AppShellProps {
  active: Section;
  onNavigate: (section: Section) => void;
  children: ReactNode;
  demoMode?: boolean;
  onExitDemo?: () => void;
  onSignOut?: () => void;
  firmName?: string;
  scoreLabel?: string;
  alerts?: SidebarAlert[];
  onOpenSettings?: () => void;
  onOpenMaturity?: () => void;
  onOpenBattlePlan?: () => void;
  onOpenCompetitors?: () => void;
  onOpenWorkshopHistory?: () => void;
  rankingsHref?: string;
  directoryIndexHref?: string;
}

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "workshop", label: "Workshop", icon: Hammer },
  { id: "guidebook", label: "Guidebook", icon: BookOpen },
];

const NavGroupLabel = ({ children }: { children: ReactNode }) => (
  <p className="px-3 pt-5 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-body">
    {children}
  </p>
);

/**
 * Persistent app shell — the thing every section lives inside, so moving
 * between Dashboard/Analytics/Workshop/Guidebook is in-app navigation, not
 * a full-screen takeover you have to "back" out of. Desktop gets a fixed,
 * sticky left sidebar grouped into Workspace / Tools / Account; mobile gets
 * a bottom tab bar with the four primary sections.
 */
const AppShell = ({
  active, onNavigate, children, demoMode, onExitDemo, onSignOut, firmName, scoreLabel, alerts,
  onOpenSettings, onOpenMaturity, onOpenBattlePlan, onOpenCompetitors, onOpenWorkshopHistory, rankingsHref, directoryIndexHref,
}: AppShellProps) => {
  const hasTools = Boolean(onOpenMaturity || onOpenBattlePlan || onOpenCompetitors || onOpenWorkshopHistory || rankingsHref || directoryIndexHref);
  const alertList = alerts ?? [];
  const hasAlerts = alertList.length > 0;

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar — sticky so it stays put while content scrolls */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-r md:border-border/50 md:bg-card/40">
        <div className="px-6 pt-8 pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xl font-semibold text-foreground tracking-tight">LegalOS</span>
            {(firmName || scoreLabel) && (
              <Popover>
                <PopoverTrigger className="relative p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Alerts">
                  <Bell className="w-4 h-4" />
                  {hasAlerts && <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 absolute top-0.5 right-0.5" />}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body mb-2">Alerts</p>
                  {alertList.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-body">Nothing needs attention right now.</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {alertList.map((a) => (
                        <div key={a.id} className="border-b border-border/40 last:border-0 pb-2 last:pb-0">
                          <p className="text-sm font-body text-foreground">{a.title}</p>
                          <p className="text-xs text-muted-foreground font-body">{a.body}</p>
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
            <p className="text-xs text-muted-foreground font-body mt-1 truncate" title={firmName}>
              {firmName}
            </p>
          )}
          {scoreLabel && (
            <p className="text-[11px] font-body mt-1.5 inline-flex items-center gap-1 text-emerald-500">
              {scoreLabel}
            </p>
          )}
        </div>

        <div className="flex-1">
          <NavGroupLabel>Workspace</NavGroupLabel>
          <nav className="px-3 space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;
              const showAlertDot = id === "dashboard" && hasAlerts;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body transition-colors relative ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {showAlertDot && (
                    <Circle className="w-2 h-2 fill-amber-500 text-amber-500 absolute right-3" />
                  )}
                </button>
              );
            })}
          </nav>

          {hasTools && (
            <>
              <NavGroupLabel>Tools</NavGroupLabel>
              <nav className="px-3 space-y-1">
                {onOpenMaturity && (
                  <button
                    onClick={onOpenMaturity}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Gauge className="w-4 h-4" />
                    Firm Maturity Score
                  </button>
                )}
                {onOpenBattlePlan && (
                  <button
                    onClick={onOpenBattlePlan}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Battle Plan
                  </button>
                )}
                {onOpenCompetitors && (
                  <button
                    onClick={onOpenCompetitors}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Competitors
                  </button>
                )}
                {onOpenWorkshopHistory && (
                  <button
                    onClick={onOpenWorkshopHistory}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <History className="w-4 h-4" />
                    Workshop History
                  </button>
                )}
                {rankingsHref && (
                  <a
                    href={rankingsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Trophy className="w-4 h-4" />
                    Public Rankings
                  </a>
                )}
                {directoryIndexHref && (
                  <a
                    href={directoryIndexHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Landmark className="w-4 h-4" />
                    Directory Standing
                  </a>
                )}
              </nav>
            </>
          )}
        </div>

        <div className="mt-auto">
          {onOpenSettings && (
            <NavGroupLabel>Account</NavGroupLabel>
          )}
          {onOpenSettings && (
            <div className="px-3 pb-3">
              <button
                onClick={onOpenSettings}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body transition-colors ${
                  active === "settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          )}
          {demoMode ? (
            <div className="px-3 pb-6">
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
            </div>
          ) : onSignOut ? (
            <div className="px-3 pb-6">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          ) : null}
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

      {/* Mobile bottom nav — primary sections only; Tools/Account live in the desktop sidebar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-pb">
        <div className="flex items-center justify-around py-2 px-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            const showAlertDot = id === "dashboard" && hasAlerts;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-sm transition-colors relative ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-body tracking-wide">{label}</span>
                {showAlertDot && (
                  <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 absolute top-1 right-3" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
