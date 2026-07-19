import { motion } from "framer-motion";
import { chapters } from "@/data/chapters";
import { BookOpen, Bookmark, Clock, CheckCircle2, ArrowRight, BarChart3 } from "lucide-react";
import SearchPalette from "./SearchPalette";
import ReadingControls from "./ReadingControls";
import ChapterIcon from "./ChapterIcon";
import { SegmentedControl } from "./ui/segmented-control";
import { getReadingTime } from "@/lib/readingTime";

interface TableOfContentsProps {
  onSelectChapter: (id: string) => void;
  bookmarks?: string[];
  onToggleBookmark?: (id: string) => void;
  readChapters?: string[];
  lastReadChapterId?: string | null;
  implementationScore?: number;
  onOpenDashboard?: () => void;
  onlyBookmarks?: boolean;
  onSetMode?: (mode: "all" | "saved") => void;
  onOpenWorkshop?: () => void;
  onOpenMaturity?: () => void;
}

const TableOfContents = ({
  onSelectChapter, bookmarks = [], onToggleBookmark,
  readChapters = [], lastReadChapterId,
  implementationScore = 0, onOpenDashboard,
  onlyBookmarks = false,
  onSetMode,
  onOpenWorkshop,
  onOpenMaturity,
}: TableOfContentsProps) => {
  const totalRead = readChapters.length;
  const totalChapters = chapters.length;
  const overallProgress = Math.round((totalRead / totalChapters) * 100);
  const totalTime = chapters.reduce((acc, c) => acc + getReadingTime(c), 0);
  const timeSpent = chapters
    .filter((c) => readChapters.includes(c.id))
    .reduce((acc, c) => acc + getReadingTime(c), 0);

  const continueChapter = lastReadChapterId
    ? chapters.find((c) => c.id === lastReadChapterId)
    : chapters.find((c) => !readChapters.includes(c.id));

  // Recommended: first 3 unread chapters the user hasn't started
  const recommended = chapters
    .filter((c) => !readChapters.includes(c.id))
    .slice(0, 3);

  // Filter chapters when in "bookmarks only" mode
  const visibleChapters = onlyBookmarks
    ? chapters.filter((c) => bookmarks.includes(c.id))
    : chapters;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/50 print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body">
            Guidebook
          </span>
          <div className="flex items-center gap-2">
            {onOpenDashboard && (
              <button onClick={onOpenDashboard} className="p-2 text-muted-foreground hover:text-primary transition-colors" aria-label="My Progress">
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
            <SearchPalette onSelectChapter={onSelectChapter} />
            <ReadingControls />
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06)_0%,_transparent_60%)]" />
        <div className="relative pt-20 pb-16 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px w-20 bg-primary/40" />
              <BookOpen className="w-5 h-5 text-primary" />
              <div className="h-px w-20 bg-primary/40" />
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-semibold text-foreground tracking-tight mb-4">
              The Guidebook
            </h1>
            <p className="font-display text-xl md:text-2xl text-primary italic mb-6">
              Law Firm Marketing Insights
            </p>
            <p className="text-sm text-muted-foreground font-body max-w-lg mx-auto leading-relaxed">
              A curated collection of actionable strategies, best practices, and real-world insights
              to help law firms elevate their marketing — from website fundamentals to thought leadership.
            </p>
          </motion.div>
        </div>
      </header>

      {/* Progress Dashboard Strip */}
      {totalRead > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-b border-border/50 bg-card/50"
        >
          <div className="max-w-5xl mx-auto px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {[
                { label: "Chapters Read", value: `${totalRead}/${totalChapters}`, bar: overallProgress },
                { label: "Implementation", value: `${implementationScore}%`, bar: implementationScore },
                { label: "Time Invested", value: `${timeSpent} min`, bar: Math.round((timeSpent / totalTime) * 100) },
                { label: "Bookmarks", value: String(bookmarks.length), bar: null },
              ].map(({ label, value, bar }) => (
                <div key={label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] tracking-wider uppercase text-muted-foreground font-body">{label}</span>
                    <span className="font-display text-lg text-foreground font-semibold">{value}</span>
                  </div>
                  {bar !== null && (
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${bar}%` }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-12">
        {onSetMode && (
          <div className="mb-8 flex justify-center">
            <SegmentedControl
              ariaLabel="Chapter filter"
              value={onlyBookmarks ? "saved" : "all"}
              onChange={(v) => onSetMode(v)}
              options={[
                { label: "All Chapters", value: "all" },
                { label: `Saved${bookmarks.length ? ` · ${bookmarks.length}` : ""}`, value: "saved" },
              ]}
            />
          </div>
        )}
        {onlyBookmarks && (
          <div className="mb-8">
            <h2 className="font-display text-3xl text-foreground mb-2">Saved Chapters</h2>
            <p className="text-sm text-muted-foreground font-body">
              {bookmarks.length === 0
                ? "You haven't bookmarked any chapters yet. Tap the bookmark icon on any chapter to save it here."
                : `${bookmarks.length} chapter${bookmarks.length > 1 ? "s" : ""} saved`}
            </p>
          </div>
        )}

        {/* Continue reading */}
        {!onlyBookmarks && continueChapter && totalRead > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">
                Continue Reading
              </span>
            </div>
            <button
              onClick={() => onSelectChapter(continueChapter.id)}
              className="w-full group flex items-center gap-6 p-6 bg-card border border-border/50 rounded-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all text-left"
            >
              <div className="p-3 rounded-sm bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <ChapterIcon chapterId={continueChapter.id} className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                  {continueChapter.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body mt-0.5">
                  Chapter {String(continueChapter.number).padStart(2, "0")} · {getReadingTime(continueChapter)} min read
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Recommended for you */}
        {!onlyBookmarks && recommended.length > 0 && totalRead > 0 && totalRead < totalChapters && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body">
                Recommended for You
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommended.map((ch, i) => (
                <motion.button
                  key={ch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => onSelectChapter(ch.id)}
                  className="group p-5 bg-card border border-border/50 rounded-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-sm bg-primary/5 text-primary/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <ChapterIcon chapterId={ch.id} className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-body">Ch. {String(ch.number).padStart(2, "0")}</span>
                  </div>
                  <h4 className="font-display text-base text-foreground group-hover:text-primary transition-colors mb-1.5">
                    {ch.title}
                  </h4>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2">
                    {ch.hook || ch.subtitle}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-muted-foreground/50">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-body">{getReadingTime(ch)} min</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* All chapters — card grid */}
        {!onlyBookmarks && (
          <div className="mb-6 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body">
              All Chapters
            </span>
            <span className="text-[10px] text-muted-foreground font-body">
              {totalChapters} chapters · {totalTime} min total
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleChapters.map((chapter, index) => {
            const isRead = readChapters.includes(chapter.id);
            const isBookmarked = bookmarks.includes(chapter.id);
            return (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.03 }}
                className="group relative"
              >
                <button
                  onClick={() => onSelectChapter(chapter.id)}
                  className="w-full p-5 bg-card border border-border/50 rounded-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-sm bg-primary/5 text-primary/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                      <ChapterIcon chapterId={chapter.id} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-primary/50 font-body">{String(chapter.number).padStart(2, "0")}</span>
                        {isRead && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        {isBookmarked && <Bookmark className="w-3 h-3 fill-primary text-primary" />}
                      </div>
                      <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                        {chapter.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-body line-clamp-1">
                        {chapter.hook || chapter.subtitle}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-muted-foreground/50">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-body">{getReadingTime(chapter)} min</span>
                        {chapter.actionItems && chapter.actionItems.length > 0 && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-[10px] font-body">{chapter.actionItems.length} actions</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Bookmark toggle */}
                {onToggleBookmark && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(chapter.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Toggle bookmark"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-primary text-primary opacity-100" : ""}`} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-5">
          {onOpenMaturity && (
            <button
              onClick={onOpenMaturity}
              className="text-[11px] tracking-wider uppercase text-muted-foreground hover:text-primary border border-border hover:border-primary/40 px-4 py-2 rounded-sm font-body transition-colors"
            >
              Firm Maturity Score
            </button>
          )}
          {onOpenWorkshop && (
            <button
              onClick={onOpenWorkshop}
              className="text-[11px] tracking-wider uppercase text-primary border border-primary/40 hover:bg-primary/10 px-4 py-2 rounded-sm font-body transition-colors"
            >
              Workshop
            </button>
          )}
        </div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body">
          For Authorized Use Only
        </p>
      </footer>
    </div>
  );
};

export default TableOfContents;
