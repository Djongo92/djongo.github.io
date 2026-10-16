// Shared slide-visual geometry. The three slide renderers MUST stay in sync:
//   - DOM preview (pitchDeckPreview.tsx) — 1280×720, scale × 0.8
//   - canvas export (pitchDeckExport.ts)  — 1600×900, native units below
//   - PPTX export (pitchDeckPptx.ts)      — 10in × 5.625in, × INCH_PER_PX
// All values are in the canvas (1600×900) coordinate space.

export const DOM_SCALE = 0.8;
export const INCH_PER_PX = 1 / 160;

/** Cover slide: full-height image panel on the right. */
export const COVER_IMAGE = { x: 1072, y: 0, w: 528, h: 900 };
/** Cover headline/subtext max width when the panel is present. */
export const COVER_TEXT_MAX = 920;
export const COVER_TEXT_MAX_PLAIN = 1250;

/** Section divider: full-height image on the right half. */
export const SECTION_IMAGE = { x: 928, y: 0, w: 672, h: 900 };
export const SECTION_TEXT_MAX = 780;
export const SECTION_TEXT_MAX_PLAIN = 1300;

/** Content slides (bullets + stats): right-column image box. */
export const CONTENT_IMAGE = { x: 1050, y: 210, w: 470, h: 560 };
export const CONTENT_TEXT_MAX = 920;
export const CONTENT_TEXT_MAX_PLAIN = 1400;
/** Bullets body wraps slightly narrower than the headline. */
export const CONTENT_BULLETS_MAX = 880;
export const CONTENT_BULLETS_MAX_PLAIN = 1330;

/** Quote slides: full-bleed image behind a paper scrim so the quote reads
 *  (the quote layout is light, unlike title/section). */
export const QUOTE_SCRIM = "rgba(248, 245, 238, 0.88)";
export const QUOTE_SCRIM_COLOR = "F8F5EE"; // pptx hex twin of PAPER
export const QUOTE_SCRIM_TRANSPARENCY_PCT = 12; // pptx: 100 - 88
