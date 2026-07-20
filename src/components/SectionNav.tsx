import { useState, useEffect } from "react";
import { Chapter } from "@/data/chapters";

interface SectionNavProps {
  chapter: Chapter;
}

const SectionNav = ({ chapter }: SectionNavProps) => {
  const headings = chapter.content
    .map((s, i) => (s.heading ? { heading: s.heading, index: i } : null))
    .filter(Boolean) as { heading: string; index: number }[];

  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handleScroll = () => {
      const elements = headings.map((h) =>
        document.getElementById(`section-${h.index}`)
      );
      let current = -1;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el && el.getBoundingClientRect().top <= 120) {
          current = i;
          break;
        }
      }
      setActiveIndex(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings.length]);

  if (headings.length < 2) return null;

  return (
    <nav className="hidden xl:block fixed left-8 top-1/2 -translate-y-1/2 z-20 print:hidden">
      <ul className="space-y-2 max-w-[180px]">
        {headings.map((h, i) => (
          <li key={h.index}>
            <button
              onClick={() => {
                document
                  .getElementById(`section-${h.index}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`text-left text-[11px] font-body leading-tight transition-colors block py-1 border-l-2 pl-3 ${
                activeIndex === i
                  ? "border-primary text-primary"
                  : "border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {h.heading.replace(/^\d+\.\s*/, "")}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SectionNav;
