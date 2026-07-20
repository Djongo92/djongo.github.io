import { useState, useCallback } from "react";

const STORAGE_KEY = "guidebook_annotations";

type Annotations = Record<string, string>;

export const useAnnotations = () => {
  const [annotations, setAnnotations] = useState<Annotations>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  const setAnnotation = useCallback((chapterId: string, text: string) => {
    setAnnotations((prev) => {
      const next = { ...prev, [chapterId]: text };
      if (!text) delete next[chapterId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getAnnotation = useCallback(
    (chapterId: string) => annotations[chapterId] || "",
    [annotations]
  );

  return { annotations, setAnnotation, getAnnotation };
};
