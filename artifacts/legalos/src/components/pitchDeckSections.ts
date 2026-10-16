// The pick-and-choose section catalog for the Pitch Deck wizard. Title and
// Ask are structural bookends (every deck needs an opener and a close) so
// they're not offered as togglable options; everything else the user picks,
// which is what makes slide count a real choice instead of a fixed 10.
export interface PitchDeckSection {
  key: string;
  label: string;
  hint: string;
  defaultOn: boolean;
}

export const PITCH_DECK_SECTIONS: PitchDeckSection[] = [
  { key: "shift", label: "The Shift", hint: "Why the world they operate in has changed", defaultOn: true },
  { key: "opportunity", label: "The Opportunity", hint: "What's now possible because of that shift", defaultOn: true },
  { key: "problem", label: "The Problem", hint: "What's standing in their way today", defaultOn: true },
  { key: "pov", label: "Our Point of View", hint: "The contrarian or sharper take we bring", defaultOn: true },
  { key: "approach", label: "Our Approach", hint: "How we deliver — phases or pillars", defaultOn: true },
  { key: "proof", label: "Proof", hint: "Case studies, results, named credentials", defaultOn: true },
  { key: "team", label: "Team", hint: "The people who'd run it", defaultOn: true },
  { key: "timeline", label: "Process & Timeline", hint: "What the engagement actually looks like week to week", defaultOn: false },
  { key: "differentiators", label: "Why Us vs. Alternatives", hint: "Direct comparison to how they'd solve this otherwise", defaultOn: false },
  { key: "investment", label: "Investment", hint: "Engagement model + pricing framing", defaultOn: true },
  { key: "faq", label: "Anticipated Questions", hint: "Objections addressed before they're raised", defaultOn: false },
];

export const PITCH_DECK_TITLE_SECTION = { key: "title", label: "Title / First Impression" };
export const PITCH_DECK_ASK_SECTION = { key: "ask", label: "The Ask / Next Step" };
