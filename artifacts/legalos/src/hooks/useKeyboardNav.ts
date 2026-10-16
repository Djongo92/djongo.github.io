import { useEffect } from "react";

interface UseKeyboardNavProps {
  onPrev?: () => void;
  onNext?: () => void;
  onBack?: () => void;
}

export const useKeyboardNav = ({ onPrev, onNext, onBack }: UseKeyboardNavProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "ArrowLeft":
          onPrev?.();
          break;
        case "ArrowRight":
          onNext?.();
          break;
        case "Escape":
          onBack?.();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPrev, onNext, onBack]);
};
