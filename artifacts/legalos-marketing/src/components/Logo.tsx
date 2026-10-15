/**
 * Uvid brand marks.
 *
 * LogoMark         — static U-in-ring, used anywhere motion is inappropriate
 *                    (exports, screenshots, email, small favicon fallback).
 *
 * AnimatedLogoMark — gauge needle sweeps lazily across the ring bottom,
 *                    used in the nav bar and wherever a subtle living mark adds
 *                    brand energy. Pure CSS — no JS, no library. Respects
 *                    prefers-reduced-motion automatically via the animation
 *                    shorthand (browsers pause CSS animations when the user has
 *                    requested reduced motion and the animation uses
 *                    `animation-play-state: paused` via the media query below).
 *
 * The ring is the product's own score dial — the same arc that draws the
 * Market Visibility Score — so the mark is the thing the product actually
 * does, not decoration. It also lets the "U" sit inside an "O", which is the
 * brand name.
 *
 * Needle pivot: the geometric centre of the ring (32,32).
 * Needle sweep: −68 deg (lower-left, low score) → +68 deg (lower-right, high
 * score), passing through straight-up (0 deg = top of ring = peak score).
 * At nav-bar size (~28 px) the tip travels ~12 px — clearly legible.
 */

const NEEDLE_CSS = `
@keyframes uvid-mark-needle {
  0%        { transform: rotate(-68deg); }
  55%, 72%  { transform: rotate(68deg);  }
  88%, 100% { transform: rotate(-68deg); }
}
@keyframes uvid-mark-arc {
  0%        { stroke-dashoffset: 100; opacity: 0.2; }
  55%, 72%  { stroke-dashoffset: 0;   opacity: 0.7; }
  88%, 100% { stroke-dashoffset: 100; opacity: 0.2; }
}
@keyframes uvid-mark-pivot {
  0%, 100%  { opacity: 0.7; }
  55%, 72%  { opacity: 1;   }
}
.uvid-mark-needle { transform-origin: 32px 32px; animation: uvid-mark-needle 4s cubic-bezier(0.4,0,0.2,1) infinite; }
.uvid-mark-arc    { stroke-dasharray: 100; animation: uvid-mark-arc 4s cubic-bezier(0.4,0,0.2,1) infinite; }
.uvid-mark-pivot  { animation: uvid-mark-pivot 4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .uvid-mark-needle, .uvid-mark-arc, .uvid-mark-pivot { animation: none; }
  .uvid-mark-arc    { stroke-dashoffset: 0; opacity: 0.55; }
}
`;

let _styleInjected = false;
function injectStyle() {
  if (_styleInjected || typeof document === 'undefined') return;
  _styleInjected = true;
  const el = document.createElement('style');
  el.textContent = NEEDLE_CSS;
  document.head.appendChild(el);
}

/** Static mark — no animation, safe for any context. */
export function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
      <path
        d="M22 17 V38 A10 10 0 0 1 42 38 V17"
        stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Animated mark — a gauge needle sweeps lazily inside the ring, expressing
 * the 0–500 score concept in motion. Use in the nav bar and as a feature mark
 * in hero sections.
 */
export function AnimatedLogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  // Inject keyframes once into the document head (avoids duplicating a <style>
  // tag on every render while keeping the component self-contained).
  injectStyle();

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true" focusable="false">
      {/* Outer ring — static */}
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />

      {/* Sweeping arc inside the ring — fills as needle climbs */}
      <path
        d="M10.3 47 A25 25 0 1 1 53.7 47"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.9"
        className="uvid-mark-arc"
        pathLength="100"
      />

      {/* U body — pivot housing */}
      <path
        d="M22 17 V38 A10 10 0 0 1 42 38 V17"
        stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Gauge needle — rotates around ring centre (32, 32) */}
      <g className="uvid-mark-needle">
        {/* Main needle toward ring top */}
        <line x1="32" y1="32" x2="32" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Counter-weight tail */}
        <line x1="32" y1="32" x2="32" y2="39" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
      </g>

      {/* Pivot dot */}
      <circle cx="32" cy="32" r="3.5" fill="currentColor" fillOpacity="0.15"
        stroke="currentColor" strokeWidth="2" className="uvid-mark-pivot" />
    </svg>
  );
}
