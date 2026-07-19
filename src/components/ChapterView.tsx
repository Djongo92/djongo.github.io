import { motion, AnimatePresence } from "framer-motion";
import { Chapter } from "@/data/chapters";
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Share2, Printer, Download, Clock, BookOpen, Headphones } from "lucide-react";
import { Layout, Type } from "lucide-react";
import { SegmentedControl } from "./ui/segmented-control";
import ReadingProgress from "./ReadingProgress";
import KeyTakeaways from "./KeyTakeaways";
import ChapterChecklist from "./ChapterChecklist";
import ChapterAnnotations from "./ChapterAnnotations";
import SectionNav from "./SectionNav";
import ChapterHero from "./ChapterHero";
import CalloutBox from "./CalloutBox";
import StatHighlight from "./StatHighlight";
import ComparisonPanel from "./ComparisonPanel";
import DeepDive from "./DeepDive";
import ActionPlan from "./ActionPlan";
import AskChapter from "./AskChapter";
import ChapterQuiz from "./ChapterQuiz";
import ShareToTeam from "./ShareToTeam";
import ReadingControls from "./ReadingControls";
import GlossaryText from "./GlossaryText";
import ChapterCover from "./ChapterCover";
import { toast } from "sonner";
import { getReadingTime, getKeyTakeaways } from "@/lib/readingTime";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useState } from "react";

interface ChapterViewProps {
  chapter: Chapter;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  checklistState: {
    isChecked: (chapterId: string, index: number) => boolean;
    toggleItem: (chapterId: string, index: number) => void;
    getProgress: (chapterId: string, totalItems: number) => number;
  };
  annotationState: {
    getAnnotation: (chapterId: string) => string;
    setAnnotation: (chapterId: string, text: string) => void;
  };
  implementationState: {
    isImplemented: (chapterId: string, index: number) => boolean;
    toggleItem: (chapterId: string, index: number) => void;
    getChapterScore: (chapterId: string, total: number) => number;
  };
}

const ChapterView = ({
  chapter, onBack, onPrev, onNext, isBookmarked, onToggleBookmark,
  checklistState, annotationState, implementationState,
}: ChapterViewProps) => {
  useKeyboardNav({ onPrev, onNext, onBack });
  useSwipeGesture({ onSwipeLeft: onNext, onSwipeRight: onPrev });
  const [readerMode, setReaderMode] = useState(false);

  const readingTime = getReadingTime(chapter);
  const takeaways = getKeyTakeaways(chapter);
  const checklistItems = chapter.content.flatMap((s) => s.bullets || []);
  const actionItems = chapter.actionItems || [];
  const implScore = implementationState.getChapterScore(chapter.id, actionItems.length);

  const handleShareQuote = (text: string) => {
    navigator.clipboard.writeText(`"${text}" — Law Firm Marketing Insights, Chapter ${chapter.number}: ${chapter.title}`);
    toast.success("Quote copied to clipboard");
  };

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    toast.info("Preparing PDF…");
    setTimeout(() => {
      window.print();
      toast.success("Use your browser's Save as PDF option");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <ReadingProgress />
      {!readerMode && <SectionNav chapter={chapter} />}
      <AnimatePresence>
        <ChapterCover key={chapter.id} chapter={chapter} />
      </AnimatePresence>

      {/* Top nav */}
      <nav className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/50 print:hidden">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-body"
          >
            <ArrowLeft className="w-4 h-4" />
            All Chapters
          </button>
          <div className="flex items-center gap-1">
            <SegmentedControl
              size="sm"
              ariaLabel="Reading layout"
              value={readerMode ? "reader" : "cover"}
              onChange={(v) => setReaderMode(v === "reader")}
              options={[
                { value: "cover", label: "Cover", icon: <Layout className="w-3 h-3" /> },
                { value: "reader", label: "Reader", icon: <Type className="w-3 h-3" /> },
              ]}
              className="mr-1"
            />
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-primary text-primary" : ""}`} />
              </button>
            )}
            <button onClick={handleExportPDF} className="p-2 text-muted-foreground hover:text-primary transition-colors" aria-label="Export as PDF">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={handlePrint} className="p-2 text-muted-foreground hover:text-primary transition-colors" aria-label="Print">
              <Printer className="w-4 h-4" />
            </button>
            <ShareToTeam chapter={chapter} />
            <ReadingControls />
            <button
              onClick={() => toast.info("Voice narration is launching soon. This chapter will read itself in a warm, broadcast-quality voice.")}
              className="p-2 text-muted-foreground hover:text-primary transition-colors relative"
              aria-label="Listen (coming soon)"
              title="Listen — coming soon"
            >
              <Headphones className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
            </button>
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body ml-2 hidden sm:inline">
              Chapter {String(chapter.number).padStart(2, "0")}
            </span>
          </div>
        </div>
      </nav>

      {/* Chapter Hero Cover */}
      {!readerMode && <ChapterHero chapter={chapter} />}

      {/* Reading time bar */}
      <div className="max-w-3xl mx-auto px-6 pt-6 flex items-center gap-2 text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-xs font-body">{readingTime} min read</span>
        {actionItems.length > 0 && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs font-body">{actionItems.length} action items</span>
          </>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.article
          key={chapter.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`max-w-3xl mx-auto px-6 py-10 ${readerMode ? "max-w-2xl" : ""}`}
        >
          {/* Key Takeaways */}
          {!readerMode && <KeyTakeaways takeaways={takeaways} />}

          {chapter.content.map((section, sIndex) => (
            <motion.div
              key={sIndex}
              id={`section-${sIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + sIndex * 0.05 }}
              className="mb-10 scroll-mt-24"
            >
              {section.heading && (
                <h2 className="font-display text-2xl md:text-3xl text-foreground font-medium mb-5 mt-4">
                  {section.heading}
                </h2>
              )}

              {section.paragraphs?.map((p, pIndex) => (
                <p key={pIndex} className="text-secondary-foreground/80 font-body text-[15px] leading-[1.85] mb-5">
                  <GlossaryText text={p} />
                </p>
              ))}

              {/* Rich: Callout */}
              {section.callout && <CalloutBox {...section.callout} />}

              {/* Rich: Stat */}
              {section.stat && <StatHighlight {...section.stat} />}

              {/* Rich: Comparison */}
              {section.comparison && <ComparisonPanel {...section.comparison} />}

              {section.bullets && (
                <ul className="space-y-2.5 mb-5 ml-1">
                  {section.bullets.map((bullet, bIndex) => (
                    <li key={bIndex} className="flex items-start gap-3 text-secondary-foreground/80 font-body text-[15px] leading-[1.75]">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                      <span><GlossaryText text={bullet} /></span>
                    </li>
                  ))}
                </ul>
              )}

              {section.numbered && (
                <ol className="space-y-4 mb-5">
                  {section.numbered.map((item, nIndex) => (
                    <li key={nIndex} className="flex items-start gap-4 text-secondary-foreground/80 font-body text-[15px] leading-[1.75]">
                      <span className="font-display text-lg text-primary/60 min-w-[1.5rem] text-right mt-0.5">
                        {nIndex + 1}.
                      </span>
                      <span><GlossaryText text={item} /></span>
                    </li>
                  ))}
                </ol>
              )}

              {section.pullQuote && (
                <motion.blockquote
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="border-l-2 border-primary/40 pl-6 py-2 my-8 group relative"
                >
                  <p className="font-display text-lg md:text-xl text-primary/90 italic leading-relaxed">
                    {section.pullQuote}
                  </p>
                  <button
                    onClick={() => handleShareQuote(section.pullQuote!)}
                    className="absolute top-2 right-0 p-1.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                    aria-label="Copy quote"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </motion.blockquote>
              )}

              {/* Rich: Deep Dive */}
              {section.deepDive && <DeepDive {...section.deepDive} />}
            </motion.div>
          ))}

          {/* Action Plan (Implementation Playbook) */}
          {!readerMode && actionItems.length > 0 && (
            <ActionPlan
              chapterId={chapter.id}
              items={actionItems}
              isImplemented={implementationState.isImplemented}
              onToggle={implementationState.toggleItem}
              score={implScore}
            />
          )}

          {/* Ask This Chapter — AI box */}
          {!readerMode && <AskChapter chapter={chapter} />}

          {/* Self-assessment Quiz */}
          {!readerMode && <ChapterQuiz chapter={chapter} />}

          {/* Checklist */}
          {!readerMode && (
            <ChapterChecklist
              chapterId={chapter.id}
              items={checklistItems}
              isChecked={checklistState.isChecked}
              onToggle={checklistState.toggleItem}
              progress={checklistState.getProgress(chapter.id, checklistItems.length)}
            />
          )}

          {/* Annotations */}
          {!readerMode && (
            <ChapterAnnotations
              chapterId={chapter.id}
              value={annotationState.getAnnotation(chapter.id)}
              onChange={annotationState.setAnnotation}
            />
          )}
        </motion.article>
      </AnimatePresence>

      {/* Chapter navigation */}
      <div className="max-w-3xl mx-auto px-6 py-8 border-t border-border/30 flex items-center justify-between print:hidden">
        {onPrev ? (
          <button onClick={onPrev} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-body group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Previous Chapter
          </button>
        ) : <div />}
        {onNext ? (
          <button onClick={onNext} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-body group">
            Next Chapter
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-primary hover:text-gold-light transition-colors font-body">
            Back to Table of Contents
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="max-w-3xl mx-auto px-6 pb-4 text-center print:hidden">
        <p className="text-[10px] text-muted-foreground/50 font-body">
          ← → to navigate chapters · Esc to go back · Swipe on mobile
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 text-center print:hidden">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body">
          For Authorized Use Only
        </p>
      </footer>
    </div>
  );
};

export default ChapterView;
