import { useCallback, useEffect, useState } from "react";

export type ReadingTheme = "dark" | "light" | "sepia";
export type FontScale = "sm" | "md" | "lg" | "xl";

const THEME_KEY = "guidebook_reading_theme";
const FONT_KEY = "guidebook_font_scale";
const TRANSITIONS_KEY = "guidebook_page_transitions";

export const useReadingTheme = () => {
  const [theme, setTheme] = useState<ReadingTheme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(THEME_KEY) as ReadingTheme | null;
    if (stored) return stored;
    // Migrate from old "theme" key
    return localStorage.getItem("theme") === "light" ? "light" : "dark";
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    return (localStorage.getItem(FONT_KEY) as FontScale) || "md";
  });

  const [pageTransitions, setPageTransitions] = useState<boolean>(() => {
    return localStorage.getItem(TRANSITIONS_KEY) !== "false";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "sepia");
    if (theme === "light") root.classList.add("light");
    if (theme === "sepia") root.classList.add("sepia");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontScale = fontScale;
    localStorage.setItem(FONT_KEY, fontScale);
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem(TRANSITIONS_KEY, String(pageTransitions));
  }, [pageTransitions]);

  const cycleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : t === "light" ? "sepia" : "dark"));
  }, []);

  return {
    theme, setTheme, cycleTheme,
    fontScale, setFontScale,
    pageTransitions, setPageTransitions,
  };
};
