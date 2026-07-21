import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight } from "lucide-react";
import { chapters } from "@/data/chapters";

interface SearchPaletteProps {
  onSelectChapter: (id: string) => void;
}

interface SearchResult {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  matchText: string;
  type: "title" | "content";
}

const SearchPalette = ({ onSelectChapter }: SearchPaletteProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const results = useMemo<SearchResult[]>(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    chapters.forEach((ch) => {
      if (ch.title.toLowerCase().includes(q) || ch.subtitle.toLowerCase().includes(q)) {
        found.push({
          chapterId: ch.id,
          chapterNumber: ch.number,
          chapterTitle: ch.title,
          matchText: ch.subtitle,
          type: "title",
        });
      }

      ch.content.forEach((section) => {
        const texts = [
          ...(section.paragraphs || []),
          ...(section.bullets || []),
          ...(section.numbered || []),
          section.pullQuote || "",
        ];
        for (const text of texts) {
          if (text.toLowerCase().includes(q)) {
            const idx = text.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + query.length + 40);
            const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
            found.push({
              chapterId: ch.id,
              chapterNumber: ch.number,
              chapterTitle: ch.title,
              matchText: snippet,
              type: "content",
            });
            break;
          }
        }
      });
    });

    return found.slice(0, 10);
  }, [query]);

  const handleSelect = (id: string) => {
    setOpen(false);
    setQuery("");
    onSelectChapter(id);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-sm hover:border-primary/40 hover:text-primary transition-colors font-body"
      >
        <Search className="w-3 h-3" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-[10px] bg-secondary px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed z-50 top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg"
            >
              <div className="bg-card border border-border rounded-sm shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 border-b border-border">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search chapters and content…"
                    className="flex-1 bg-transparent py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none font-body"
                    autoFocus
                  />
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {query.length >= 2 && (
                  <div className="max-h-72 overflow-y-auto">
                    {results.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground text-center font-body">
                        No results found.
                      </p>
                    ) : (
                      results.map((r, i) => (
                        <button
                          key={`${r.chapterId}-${i}`}
                          onClick={() => handleSelect(r.chapterId)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left group"
                        >
                          <span className="text-xs text-primary font-display mt-0.5 min-w-[1.5rem] text-right">
                            {String(r.chapterNumber).padStart(2, "0")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-display truncate">
                              {r.chapterTitle}
                            </p>
                            <p className="text-xs text-muted-foreground font-body mt-0.5 line-clamp-2">
                              {r.matchText}
                            </p>
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 mt-1 transition-opacity" />
                        </button>
                      ))
                    )}
                  </div>
                )}

                {query.length < 2 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-muted-foreground font-body">
                      Type at least 2 characters to search across all chapters
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SearchPalette;
