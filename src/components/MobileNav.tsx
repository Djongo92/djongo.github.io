import { Home, Search, Bookmark, FileText, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

type View = "home" | "search" | "bookmarks" | "dashboard";

interface MobileNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onOpenSearch: () => void;
  bookmarkCount: number;
}

const MobileNav = ({ currentView, onNavigate, onOpenSearch, bookmarkCount }: MobileNavProps) => {
  const items = [
    { id: "home" as View, icon: Home, label: "Home" },
    { id: "search" as View, icon: Search, label: "Search" },
    { id: "bookmarks" as View, icon: Bookmark, label: "Saved" },
    { id: "dashboard" as View, icon: BarChart3, label: "Progress" },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-pb"
    >
      <div className="flex items-center justify-around py-2 px-2">
        {items.map(({ id, icon: Icon, label }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (id === "search") {
                  onOpenSearch();
                } else {
                  onNavigate(id);
                }
              }}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-sm transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-body tracking-wide">{label}</span>
              {id === "bookmarks" && bookmarkCount > 0 && (
                <span className="absolute -top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-body">
                  {bookmarkCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default MobileNav;
