import { useEffect } from "react";

/** Tracks scroll velocity (px/ms) and dispatches a `velocity` event on window. */
export const useScrollVelocity = () => {
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const y = window.scrollY;
      const dy = Math.abs(y - lastY);
      const dt = Math.max(now - lastT, 1);
      const v = dy / dt; // px/ms
      (window as unknown as { __scrollV?: number }).__scrollV = v;
      lastY = y;
      lastT = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
};
