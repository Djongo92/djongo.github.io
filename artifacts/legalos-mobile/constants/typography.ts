/**
 * Shared typography tokens for the Uvid mobile app.
 *
 * These match the web app's `.eyebrow` utility so the brand voice is
 * consistent across all surfaces.
 *
 *   Web CSS:  letter-spacing: 0.16em; font-weight: 600;
 *   RN value: letterSpacing is absolute (dp).  At the common 10 dp label
 *             size, 0.16 em ≈ 1.6 dp.  Use EYEBROW_TRACKING on all
 *             uppercase micro-labels; use EYEBROW_TIGHT_TRACKING for the
 *             tighter (~0.10 em) variant.
 */

/** Standard eyebrow tracking — 0.16 em equivalent at 10 dp */
export const EYEBROW_TRACKING = 1.6;

/** Tight eyebrow tracking — 0.10 em equivalent at 10 dp */
export const EYEBROW_TIGHT_TRACKING = 1.0;

/** Eyebrow font family (weight 600) */
export const EYEBROW_FONT_FAMILY = 'Inter_600SemiBold';
