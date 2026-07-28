import { useState, useEffect } from "react";

const ReadingProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    // Offset past the desktop app sidebar (--legalos-sidebar-w, set by
    // AppShell) instead of spanning the raw viewport width — otherwise this
    // bar is drawn straight across the top of the sidebar on every chapter.
    <div className="fixed top-0 right-0 z-50 h-[2px]" style={{ left: "var(--legalos-sidebar-w, 0px)" }}>
      <div
        className="h-full bg-primary transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ReadingProgress;
