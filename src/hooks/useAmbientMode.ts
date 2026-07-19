import { useEffect, useState } from "react";

const KEY = "ambient_mode_override";

/**
 * Ambient reading mode. Automatically warms the UI after 21:00
 * local time. User can force-toggle. Tracks scroll velocity exposed
 * via a window event for downstream animation throttling.
 */
export const useAmbientMode = () => {
  const [override, setOverride] = useState<"on" | "off" | null>(() => {
    const v = localStorage.getItem(KEY);
    return v === "on" || v === "off" ? v : null;
  });
  const [autoOn, setAutoOn] = useState(false);

  useEffect(() => {
    const compute = () => {
      const h = new Date().getHours();
      setAutoOn(h >= 21 || h < 6);
    };
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);

  const isOn = override ? override === "on" : autoOn;

  useEffect(() => {
    const root = document.documentElement;
    if (isOn) root.classList.add("ambient");
    else root.classList.remove("ambient");
  }, [isOn]);

  const toggle = () => {
    const next = isOn ? "off" : "on";
    setOverride(next);
    localStorage.setItem(KEY, next);
  };

  const reset = () => {
    setOverride(null);
    localStorage.removeItem(KEY);
  };

  return { isOn, toggle, reset, isAuto: override === null };
};

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