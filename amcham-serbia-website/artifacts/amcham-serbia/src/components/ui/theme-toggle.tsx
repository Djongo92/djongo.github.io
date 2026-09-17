import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

// next-themes only resolves the real (system-aware) theme after mount, so
// rendering the icon before that would briefly show the wrong one. A neutral
// placeholder avoids that flash without needing SSR-specific handling (this
// app has none — it's a pure client SPA — but the mismatch window is real).
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn("w-10 h-10 rounded-full border border-border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0", className)}
      title={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
      aria-label="Toggle dark mode"
    >
      {mounted && (isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
    </button>
  );
}
