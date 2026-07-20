import { ReactNode } from "react";
import { LayoutDashboard, Hammer, BookOpen } from "lucide-react";

export type Section = "dashboard" | "workshop" | "guidebook";

interface AppShellProps {
  active: Section;
  onNavigate: (section: Section) => void;
  children: ReactNode;
}

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workshop", label: "Workshop", icon: Hammer },
  { id: "guidebook", label: "Guidebook", icon: BookOpen },
];

/**
 * Persistent app shell — the thing every section lives inside, so moving
 * between Dashboard/Workshop/Guidebook is in-app navigation, not a
 * full-screen takeover you have to "back" out of. Desktop gets a fixed
 * left sidebar; mobile gets a bottom tab bar (same nav model as the
 * guidebook's old MobileNav, just three sections instead of four).
 */
const AppShell = ({ active, onNavigate, children }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-border/50 md:bg-card/40">
        <div className="px-6 pt-8 pb-6">
          <span className="font-display text-xl font-semibold text-foreground tracking-tight">LegalOS</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-pb">
        <div className="flex items-center justify-around py-2 px-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-sm transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-body tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
