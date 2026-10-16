// The screen a visitor stares at while the app boots — most importantly on
// the jump from the marketing site into the demo, which crosses an artifact
// boundary and so costs a real document load.
//
// The marketing site renders a pixel-identical veil the moment the demo link
// is clicked (see legalos-marketing's DemoLaunch.tsx). Because both sides draw
// the same thing, the navigation has no visible seam: the veil appears on the
// old document, survives the network wait, and is still there when this one
// paints. Colours are hard-coded rather than themed for exactly that reason —
// the two artifacts have separate token sets and slightly different
// backgrounds, and a half-shade jump mid-transition is precisely the kind of
// thing that reads as "the site broke" rather than "the app is loading".
interface Props {
  /** Overrides the default status line, e.g. while checking a session. */
  label?: string;
}

const BootVeil = ({ label = "Preparing your demo workspace" }: Props) => (
  <div
    className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6"
    style={{ backgroundColor: "hsl(222 47% 4%)" }}
    role="status"
    aria-live="polite"
  >
    <span
      className="text-3xl font-semibold tracking-tight"
      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "hsl(35 20% 97%)" }}
    >
      Uvid
    </span>

    {/* Indeterminate sweep rather than a spinner: a bar that keeps moving
        reads as progress on a wait whose length we genuinely can't predict. */}
    <div className="w-40 h-px overflow-hidden" style={{ backgroundColor: "hsl(43 57% 49% / 0.15)" }}>
      <div className="boot-veil-sweep h-full w-1/3" style={{ backgroundColor: "hsl(43 57% 49%)" }} />
    </div>

    <p
      className="text-xs uppercase tracking-[0.2em] text-center"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "hsl(215 18% 55%)" }}
    >
      {label}
    </p>

    <style>{`
      @keyframes boot-veil-sweep {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
      .boot-veil-sweep { animation: boot-veil-sweep 1.1s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .boot-veil-sweep { animation: none; width: 100%; }
      }
    `}</style>
  </div>
);

export default BootVeil;
