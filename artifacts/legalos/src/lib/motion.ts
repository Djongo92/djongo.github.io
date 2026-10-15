// Design-system motion tokens — three named presets that cover every
// animation in the product. Always reach for these instead of inlining
// raw stiffness/duration values so all motion speaks the same physical
// grammar and a single change here ripples everywhere consistently.

/** UI feedback: button taps, toggles, badge flips. Instant and crisp. */
export const motionSnap = {
  duration: 0.12,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

/** Content revealing: panels sliding in, cards mounting, section entrances.
 *  Use `{ ...motionReveal, delay: n }` to stagger multiple items. */
export const motionReveal = {
  type: "spring" as const,
  stiffness: 260,
  damping: 22,
  mass: 0.8,
};

/** Celebrations: achievements, milestones, personal bests. Bouncy and emotional. */
export const motionCelebration = {
  type: "spring" as const,
  stiffness: 200,
  damping: 14,
  mass: 1.1,
};
