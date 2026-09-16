import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Implies continuous syncing by ticking up from the moment this view mounted,
// rather than presenting a static "as of" timestamp. No real sync happens —
// this is purely the ambient "live system" cue.
function formatElapsed(seconds: number): string {
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

export function DataFreshness({ className }: { className?: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={className || "inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"}>
      <RefreshCw className="w-3 h-3" />
      Synced {formatElapsed(seconds)}
    </span>
  );
}
