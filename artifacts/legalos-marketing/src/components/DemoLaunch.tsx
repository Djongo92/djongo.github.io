// The marketing site's half of the demo handoff.
//
// Clicking through to /app/demo crosses an artifact boundary: a full document
// load of a different app. Left alone the browser shows nothing at all during
// that wait — the page just sits there, apparently ignoring the click, which
// on a slow connection is long enough to read as broken.
//
// So this does three things:
//   1. Warms the app document on hover/focus, before the click happens.
//   2. Paints a full-screen veil the instant the link is clicked, which stays
//      up on this document until the new one paints.
//   3. Draws that veil identically to the app's own BootVeil, so the two
//      documents hand off with no visible seam.
//
// Colours are hard-coded on both sides on purpose — the two artifacts have
// separate token sets, and a half-shade jump mid-transition looks like a bug.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { recordDeparture } from '@/lib/arrival';

const DEMO_URL = '/app/demo';
const PREFETCH_ID = 'legalos-demo-prefetch';

/** Ask the browser to fetch the app document while the visitor is still deciding. */
function warmDemo() {
  if (typeof document === 'undefined' || document.getElementById(PREFETCH_ID)) return;
  const link = document.createElement('link');
  link.id = PREFETCH_ID;
  link.rel = 'prefetch';
  link.as = 'document';
  link.href = DEMO_URL;
  document.head.appendChild(link);
}

function DemoVeil() {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6"
      style={{ backgroundColor: 'hsl(222 47% 4%)' }}
      role="status"
      aria-live="polite"
    >
      <span
        className="text-3xl font-semibold tracking-tight"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'hsl(35 20% 97%)' }}
      >
        Uvid
      </span>

      <div className="w-40 h-px overflow-hidden" style={{ backgroundColor: 'hsl(43 57% 49% / 0.15)' }}>
        <div className="demo-veil-sweep h-full w-1/3" style={{ backgroundColor: 'hsl(43 57% 49%)' }} />
      </div>

      <p
        className="text-xs uppercase tracking-[0.2em] text-center"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'hsl(215 18% 55%)' }}
      >
        Preparing your demo workspace
      </p>

      <style>{`
        @keyframes demo-veil-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .demo-veil-sweep { animation: demo-veil-sweep 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .demo-veil-sweep { animation: none; width: 100%; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

interface DemoLinkProps {
  className?: string;
  children: React.ReactNode;
  /** Which surface on the site this link sits on — handed to the app so the
   * tour's closing pitch can speak to why the visitor came. */
  from: string;
  'data-testid'?: string;
}

/**
 * A link into the demo that feels instant. Renders a real anchor, so
 * middle-click, cmd-click and "copy link address" all still behave — the veil
 * only appears on a plain left-click, which is the one case we're taking over.
 */
export function DemoLink({ className, children, from, ...rest }: DemoLinkProps) {
  const [launching, setLaunching] = useState(false);

  // A visitor who hits Back lands on a page whose veil never got torn down
  // (bfcache restores the DOM as it was). Clear it on restore.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLaunching(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Recorded even for a new-tab click — that visitor still ends up in the
    // app, just in a tab this document won't be veiling.
    recordDeparture(from);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setLaunching(true);
    // One frame for the veil to paint before the browser starts tearing this
    // document down, otherwise the click still looks like it did nothing.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.location.href = DEMO_URL;
      });
    });
  }, []);

  return (
    <>
      <a
        href={DEMO_URL}
        className={className}
        onClick={onClick}
        onMouseEnter={warmDemo}
        onFocus={warmDemo}
        onTouchStart={warmDemo}
        {...rest}
      >
        {children}
      </a>
      {launching && <DemoVeil />}
    </>
  );
}
