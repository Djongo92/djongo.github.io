import { motion } from "framer-motion";
import { Chapter } from "@/data/chapters";
import { useEffect, useState } from "react";

interface Props {
  chapter: Chapter;
}

const SESSION_KEY = "chapter_cover_seen";

/**
 * Cinematic chapter cover reveal:
 *  1. thin gold rule draws across (SVG path)
 *  2. chapter number fades + slides in
 *  3. title rises with blur clearing
 *  4. fades out and unmounts
 */
const ChapterCover = ({ chapter }: Props) => {
  const [show, setShow] = useState(() => {
    try {
      const seen = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]") as string[];
      return !seen.includes(chapter.id);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!show) return;
    const total = 2800;
    const t = setTimeout(() => {
      try {
        const seen = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]") as string[];
        if (!seen.includes(chapter.id)) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen, chapter.id]));
        }
      } catch { /* ignore */ }
      setShow(false);
    }, total);
    return () => clearTimeout(t);
  }, [chapter.id, show]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: [1, 1, 0], transition: { times: [0, 0.85, 1], duration: 2.8 } }}
      onClick={() => setShow(false)}
      className="fixed inset-0 z-[60] bg-background flex flex-col items-center justify-center cursor-pointer overflow-hidden"
      role="presentation"
      aria-hidden="true"
    >
      {/* Gold rule */}
      <svg width="320" height="2" viewBox="0 0 320 2" className="mb-10">
        <motion.line
          x1="0" y1="1" x2="320" y2="1"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
        />
      </svg>

      {/* Chapter number */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
        className="text-[10px] tracking-[0.5em] uppercase text-primary font-body mb-6"
      >
        Chapter {String(chapter.number).padStart(2, "0")}
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 1.0, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-4xl md:text-6xl text-foreground font-medium text-center max-w-3xl px-8 leading-tight"
      >
        {chapter.title}
      </motion.h1>

      {/* Subtitle */}
      {chapter.subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.7 }}
          className="font-display italic text-primary text-lg md:text-xl text-center mt-5 max-w-2xl px-8"
        >
          {chapter.subtitle}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.5 }}
        className="absolute bottom-10 text-[9px] tracking-[0.4em] uppercase text-muted-foreground font-body"
      >
        Tap to skip
      </motion.div>
    </motion.div>
  );
};

export default ChapterCover;