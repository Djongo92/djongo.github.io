import { ReactNode, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Hammer, BookOpen, BarChart3, FlaskConical, Settings, Circle, LogOut,
  Gauge, FileText, Eye, Users, History, Bell, Landmark, MoreHorizontal, X, Award,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type Section = "dashboard" | "analytics" | "workshop" | "progress" | "guidebook" | "settings";

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
  firmLogo?: string | null;
  scoreLabel?: string;
  alerts?: SidebarAlert[];
  onOpenSettings?: () => void;
  onOpenMaturity?: () => void;
  onOpenBattlePlan?: () => void;
  onOpenCompetitors?: () => void;
  onOpenWorkshopHistory?: () => void;
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
  active, onNavigate, children, demoMode, onExitDemo, onSignOut, firmName, firmLogo, scoreLabel, alerts,
  onOpenSettings, onOpenMaturity, onOpenBattlePlan, onOpenCompetitors, onOpenWorkshopHistory, visibilityIndexHref, recognitionIndexHref,
}: AppShellProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasTools = Boolean(onOpenMaturity || onOpenBattlePlan || onOpenCompetitors || onOpenWorkshopHistory || visibilityIndexHref || recognitionIndexHref);
  const alertList = alerts ?? [];
  const hasAlerts = alertList.length > 0;

  const closeMore = () => setMoreOpen(false);

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
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
              {firmLogo && (
                <img src={firmLogo} alt="" className="w-4 h-4 rounded-sm object-cover shrink-0" />
              )}
              <p className="text-xs text-muted-foreground font-body truncate" title={firmName}>
                {firmName}
              </p>
            </div>
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
                {visibilityIndexHref && (
                  <a
                    href={visibilityIndexHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Visibility Index
                  </a>
                )}
                {recognitionIndexHref && (
                  <a
                    href={recognitionIndexHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Landmark className="w-4 h-4" />
                    Recognition Index
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

      {/* Mobile bottom nav — four primary sections + a "More" sheet holding
          everything the desktop Tools/Account groups have. */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-pb">
        <div className="flex items-center justify-around py-2 px-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            const showAlertDot = id === "dashboard" && hasAlerts;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-sm transition-colors relative ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-body tracking-wide">{label}</span>
                {showAlertDot && (
                  <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 absolute top-1 right-2" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-sm transition-colors relative ${
              moreOpen || active === "settings" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[9px] font-body tracking-wide">More</span>
            {hasAlerts && <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500 absolute top-1 right-2" />}
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
              className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-lg max-h-[80vh] overflow-y-auto safe-area-pb"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <span className="font-display text-lg text-foreground">More</span>
                <button onClick={closeMore} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {alertList.length > 0 && (
                <div className="px-5 pb-3">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-amber-500 font-body mb-2">Alerts</p>
                  <div className="space-y-2">
                    {alertList.map((a) => (
                      <div key={a.id} className="text-sm font-body">
                        <p className="text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.body}</p>
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
                      <button onClick={() => { onOpenMaturity(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
                        <Gauge className="w-4 h-4 text-primary" /> Firm Maturity Score
                      </button>
                    )}
                    {onOpenBattlePlan && (
                      <button onClick={() => { onOpenBattlePlan(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
                        <FileText className="w-4 h-4 text-primary" /> Battle Plan
                      </button>
                    )}
                    {onOpenCompetitors && (
                      <button onClick={() => { onOpenCompetitors(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
                        <Users className="w-4 h-4 text-primary" /> Competitors
                      </button>
                    )}
                    {onOpenWorkshopHistory && (
                      <button onClick={() => { onOpenWorkshopHistory(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
                        <History className="w-4 h-4 text-primary" /> Workshop History
                      </button>
                    )}
                    {visibilityIndexHref && (
                      <a href={visibilityIndexHref} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
                        <Eye className="w-4 h-4 text-primary" /> Visibility Index
                      </a>
                    )}
                    {recognitionIndexHref && (
                      <a href={recognitionIndexHref} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
                        <Landmark className="w-4 h-4 text-primary" /> Recognition Index
                      </a>
                    )}
                  </div>
                </>
              )}

              <p className="px-5 pt-2 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">Account</p>
              <div className="px-3 pb-6">
                {onOpenSettings && (
                  <button onClick={() => { onOpenSettings(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
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
                    <button onClick={() => { onSignOut(); closeMore(); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body text-foreground hover:bg-secondary/50 transition-colors">
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
