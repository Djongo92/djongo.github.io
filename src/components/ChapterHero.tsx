import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Chapter } from "@/data/chapters";
import ChapterIcon from "./ChapterIcon";

// Each chapter gets a unique abstract SVG pattern
const heroPatterns: Record<string, { gradient: string; shapes: JSX.Element }> = {};

const getPattern = (chapterId: string, chapterNumber: number) => {
  const hue = (chapterNumber * 25 + 20) % 360;
  const patterns = [
    // Geometric circles
    <g key="p" opacity="0.15">
      <circle cx="80%" cy="30%" r="120" stroke="hsl(38, 45%, 60%)" strokeWidth="1" fill="none" />
      <circle cx="80%" cy="30%" r="80" stroke="hsl(38, 45%, 60%)" strokeWidth="0.5" fill="none" />
      <circle cx="80%" cy="30%" r="40" stroke="hsl(38, 45%, 60%)" strokeWidth="0.5" fill="none" />
      <line x1="60%" y1="10%" x2="95%" y2="50%" stroke="hsl(38, 45%, 60%)" strokeWidth="0.5" />
      <line x1="65%" y1="50%" x2="95%" y2="10%" stroke="hsl(38, 45%, 60%)" strokeWidth="0.5" />
    </g>,
    // Diamond grid
    <g key="p" opacity="0.12">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={`${70 + i * 5}%`} y={`${15 + i * 10}%`} width="40" height="40"
          transform={`rotate(45, ${70 + i * 5}, ${15 + i * 10})`}
          stroke="hsl(38, 45%, 60%)" strokeWidth="0.5" fill="none" />
      ))}
    </g>,
    // Radiating lines
    <g key="p" opacity="0.1">
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1="85%" y1="40%" x2={`${85 + Math.cos(i * 30 * Math.PI / 180) * 20}%`}
          y2={`${40 + Math.sin(i * 30 * Math.PI / 180) * 30}%`}
          stroke="hsl(38, 45%, 60%)" strokeWidth="0.5" />
      ))}
    </g>,
    // Ascending steps
    <g key="p" opacity="0.12">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={`${65 + i * 6}%`} y={`${60 - i * 10}%`} width="30" height={`${10 + i * 5}%`}
          stroke="hsl(38, 45%, 60%)" strokeWidth="0.5" fill="none" />
      ))}
    </g>,
  ];

  return patterns[chapterNumber % patterns.length];
};

interface ChapterHeroProps {
  chapter: Chapter;
}

const ChapterHero = ({ chapter }: ChapterHeroProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div ref={ref} className="relative overflow-hidden bg-card border-b border-border/30">
      <motion.div style={{ y }} className="relative h-[280px] md:h-[340px] flex items-end">
        {/* Abstract SVG background */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`hero-grad-${chapter.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--card))" />
              <stop offset="100%" stopColor="hsl(var(--background))" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hero-grad-${chapter.id})`} />
          {getPattern(chapter.id, chapter.number)}
        </svg>

        {/* Watermark chapter number */}
        <motion.div style={{ opacity }} className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 select-none pointer-events-none">
          <span className="font-display text-[160px] md:text-[220px] font-bold text-primary/[0.06] leading-none">
            {String(chapter.number).padStart(2, "0")}
          </span>
        </motion.div>

        {/* Content overlay */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-3xl mx-auto px-6 pb-10 w-full"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-sm bg-primary/10 text-primary backdrop-blur-sm">
              <ChapterIcon chapterId={chapter.id} className="w-7 h-7" />
            </div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">
              Chapter {String(chapter.number).padStart(2, "0")}
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight mb-3">
            {chapter.title}
          </h1>
          <p className="font-display text-lg md:text-xl text-primary italic">
            {chapter.subtitle}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ChapterHero;
