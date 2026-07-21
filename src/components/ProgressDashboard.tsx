import { motion } from "framer-motion";
import { chapters } from "@/data/chapters";
import { BookOpen, Bookmark, CheckCircle2, Target, FileText, ArrowLeft, Download, Sparkles, Gauge, Hammer } from "lucide-react";
import { toast } from "sonner";
import { getReadingTime } from "@/lib/readingTime";
import RoadmapGenerator from "./RoadmapGenerator";
import ScoreWebsite from "./ScoreWebsite";
import RoastHomepage from "./RoastHomepage";
import CompetitorAnalysis from "./CompetitorAnalysis";
import MarketVisibilityScore from "./MarketVisibilityScore";
import BattlePlan from "./BattlePlan";
import AskTheBook from "./AskTheBook";
import Achievements from "./Achievements";
import { useAchievements } from "@/hooks/useAchievements";

interface ProgressDashboardProps {
  readChapters: string[];
  bookmarks: string[];
  implementationScore: number;
  annotations: Record<string, string>;
  onBack: () => void;
  onSelectChapter: (id: string) => void;
  getChapterScore: (chapterId: string, total: number) => number;
  isImplemented?: (chapterId: string, index: number) => boolean;
  onOpenPersonalize?: () => void;
  onOpenMaturity?: () => void;
  onOpenWorkshop?: () => void;
}

const ProgressDashboard = ({
  readChapters, bookmarks, implementationScore, annotations,
  onBack, onSelectChapter, getChapterScore,
  isImplemented = () => false, onOpenPersonalize = () => {},
  onOpenMaturity = () => {}, onOpenWorkshop = () => {},
}: ProgressDashboardProps) => {
  const totalChapters = chapters.length;
  const totalRead = readChapters.length;
  const readingProgress = Math.round((totalRead / totalChapters) * 100);
  const totalTime = chapters.reduce((acc, c) => acc + getReadingTime(c), 0);
  const timeSpent = chapters
    .filter((c) => readChapters.includes(c.id))
    .reduce((acc, c) => acc + getReadingTime(c), 0);

  const totalActions = chapters.reduce((acc, c) => acc + (c.actionItems?.length || 0), 0);
  const implementedCount = Math.round((implementationScore / 100) * totalActions);
  const achievements = useAchievements({ readChaptersCount: totalRead, implementedCount });

  const annotatedChapters = Object.entries(annotations).filter(([, v]) => v.trim().length > 0);

  const handleExportDigest = () => {
    let digest = "# My Guidebook Notes\n\n";
    digest += `## Progress: ${totalRead}/${totalChapters} chapters read (${readingProgress}%)\n`;
    digest += `## Implementation Score: ${implementationScore}%\n\n`;

    if (bookmarks.length > 0) {
      digest += "## Bookmarked Chapters\n";
      bookmarks.forEach((id) => {
        const ch = chapters.find((c) => c.id === id);
        if (ch) digest += `- ${ch.title}\n`;
      });
      digest += "\n";
    }

    if (annotatedChapters.length > 0) {
      digest += "## My Notes\n";
      annotatedChapters.forEach(([id, note]) => {
        const ch = chapters.find((c) => c.id === id);
        if (ch) digest += `\n### ${ch.title}\n${note}\n`;
      });
    }

    const blob = new Blob([digest], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guidebook-notes.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-body">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={handleExportDigest} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-body">
            <Download className="w-4 h-4" /> Export Notes
          </button>
        </div>
      </nav>

      <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
        <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">My Progress</h1>
        <p className="text-sm text-muted-foreground font-body">Your reading journey at a glance</p>
      </header>

      {/* Stats Grid */}
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { icon: BookOpen, label: "Chapters Read", value: `${totalRead}/${totalChapters}`, sub: `${readingProgress}%` },
          { icon: Target, label: "Implementation", value: `${implementationScore}%`, sub: "Overall score" },
          { icon: Bookmark, label: "Bookmarks", value: String(bookmarks.length), sub: "Saved" },
          { icon: FileText, label: "Time Invested", value: `${timeSpent}m`, sub: `of ${totalTime}m` },
        ].map(({ icon: Icon, label, value, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border/50 rounded-sm p-5"
          >
            <Icon className="w-4 h-4 text-primary mb-3" />
            <div className="font-display text-3xl text-foreground font-semibold">{value}</div>
            <p className="text-[11px] text-muted-foreground font-body mt-1">{label} · {sub}</p>
          </motion.div>
        ))}
      </div>

      {/* AI tools */}
      <div className="max-w-4xl mx-auto px-6 mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onOpenMaturity}
          className="text-left p-5 bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all"
        >
          <Gauge className="w-5 h-5 text-primary mb-3" />
          <h3 className="font-display text-lg text-foreground mb-1">Firm Maturity Score</h3>
          <p className="text-xs text-muted-foreground font-body">12-question diagnostic + tailored 30-day plan, generated live.</p>
        </button>
        <button
          onClick={onOpenWorkshop}
          className="text-left p-5 bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all"
        >
          <Hammer className="w-5 h-5 text-primary mb-3" />
          <h3 className="font-display text-lg text-foreground mb-1">The Workshop</h3>
          <p className="text-xs text-muted-foreground font-body">Swipe file vault + AI copywriter. Practitioner password required.</p>
        </button>
        <RoadmapGenerator
          readChapters={readChapters}
          bookmarks={bookmarks}
          isImplemented={isImplemented}
          onRequestPersonalize={onOpenPersonalize}
        />
        <ScoreWebsite />
        <RoastHomepage />
        <CompetitorAnalysis />
        <MarketVisibilityScore />
        <AskTheBook onSelectChapter={onSelectChapter} />
      </div>

      {/* Flagship: Battle Plan PDF */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <BattlePlan
          readChaptersCount={totalRead}
          totalChapters={totalChapters}
          implementationScore={implementationScore}
        />
      </div>

      {/* Achievements */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <h2 className="font-display text-xl text-foreground mb-6">Achievements</h2>
        <Achievements
          streak={achievements.streak}
          totalMinutes={achievements.totalMinutes}
          thisWeekMinutes={achievements.thisWeekMinutes}
          badges={achievements.badges}
        />
      </div>

      {/* Chapter-by-chapter progress */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <h2 className="font-display text-xl text-foreground mb-6">Chapter Progress</h2>
        <div className="space-y-3">
          {chapters.map((ch) => {
            const isRead = readChapters.includes(ch.id);
            const actionItems = ch.actionItems || [];
            const score = getChapterScore(ch.id, actionItems.length);
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChapter(ch.id)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-border/30 rounded-sm hover:border-primary/30 transition-colors text-left"
              >
                <span className="font-display text-lg text-primary/40 min-w-[2rem] text-right">
                  {String(ch.number).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base text-foreground truncate">{ch.title}</span>
                    {isRead && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  {actionItems.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${score}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-body">{score}%</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* All annotations */}
      {annotatedChapters.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <h2 className="font-display text-xl text-foreground mb-6">My Notes</h2>
          <div className="space-y-4">
            {annotatedChapters.map(([id, note]) => {
              const ch = chapters.find((c) => c.id === id);
              return (
                <div key={id} className="bg-card border border-border/30 rounded-sm p-5">
                  <h3 className="font-display text-base text-primary mb-2">{ch?.title}</h3>
                  <p className="font-body text-sm text-secondary-foreground/70 whitespace-pre-wrap">{note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <button
          onClick={onOpenPersonalize}
          className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" /> Update firm personalization
        </button>
      </div>
    </div>
  );
};

export default ProgressDashboard;
