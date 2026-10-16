/**
 * The Uvid mark: a "U" enclosed by a ring.
 *
 * The ring is the product's own score dial — the same arc that draws the
 * Market Visibility Score — so the mark depicts what the product does rather
 * than decorating the wordmark. It also lets the "U" sit inside an "O".
 *
 * Deliberately duplicated from the marketing artifact rather than shared: the
 * two artifacts are on different Tailwind majors with different token names,
 * and this is fifteen lines of geometry. If it ever gains behaviour, promote
 * it to a workspace package instead of letting the copies drift.
 *
 * Drawn with `currentColor` so one component serves gold-on-dark chrome and
 * muted contexts alike. Strokes are heavy and the element count tiny so it
 * still resolves at favicon size.
 */
export function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
      <path
        d="M22 17 V38 A10 10 0 0 1 42 38 V17"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
