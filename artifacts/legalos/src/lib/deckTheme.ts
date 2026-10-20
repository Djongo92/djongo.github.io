// Brand theme for decks (and the Page Drafter preview). One small object a
// firm sets once — colours, a font pairing and an optional logo — that every
// renderer (builder preview, PDF/PNG canvas, PPTX) reads through paletteFor,
// so a themed deck looks the same everywhere. The default reproduces the
// original navy + gold look exactly.
export type FontPairId = "classic" | "modern" | "editorial";

export interface DeckTheme {
  primary: string;   // dark brand colour: covers, headlines
  accent: string;    // highlight colour: rules, stats, numbers
  paper: string;     // content-slide background
  fonts: FontPairId;
  logoUrl?: string;  // data URL, shown on the cover
  /** Top accent rules on content slides (default on). */
  rules?: boolean;
  /** Corner style for cards and pictures (default sharp). */
  corners?: "sharp" | "round";
}

export const DEFAULT_DECK_THEME: DeckTheme = { primary: "#121826", accent: "#B8893B", paper: "#F8F5EE", fonts: "classic" };

export const FONT_PAIRS: Record<FontPairId, { label: string; serif: string; sans: string; serifFace: string; sansFace: string }> = {
  classic: { label: "Classic — Georgia + Calibri", serif: 'Georgia, "Times New Roman", serif', sans: 'Calibri, "Segoe UI", Arial, sans-serif', serifFace: "Georgia", sansFace: "Calibri" },
  modern: { label: "Modern — Arial throughout", serif: 'Arial, Helvetica, sans-serif', sans: 'Arial, Helvetica, sans-serif', serifFace: "Arial", sansFace: "Arial" },
  editorial: { label: "Editorial — Palatino + Calibri", serif: '"Palatino Linotype", Palatino, "Book Antiqua", serif', sans: 'Calibri, "Segoe UI", Arial, sans-serif', serifFace: "Palatino Linotype", sansFace: "Calibri" },
};

export const PAPER_CHOICES: { label: string; value: string }[] = [
  { label: "Warm paper", value: "#F8F5EE" },
  { label: "White", value: "#FFFFFF" },
  { label: "Cool grey", value: "#F3F5F8" },
];

const HEX = /^#[0-9a-f]{6}$/i;
const clampHex = (v: string, fallback: string) => (HEX.test(v) ? v.toUpperCase() : fallback);

const toRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (rgb: number[]) => "#" + rgb.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a: string, b: string, t: number) => {
  const x = toRgb(a), y = toRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
/** WCAG relative luminance, 0 (black) – 1 (white). */
export const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export interface DeckPalette {
  navy: string; gold: string; goldLight: string; paper: string; ink: string; muted: string;
  serif: string; sans: string;
  /** Same colours without "#", for pptxgenjs. */
  hex: { navy: string; gold: string; goldLight: string; paper: string; ink: string; muted: string };
  /** PPTX font face names. */
  face: { serif: string; sans: string };
  /** "r, g, b" of the primary, for rgba() fades. */
  primaryRgb: string;
  /** "r, g, b" of the paper colour. */
  paperRgb: string;
  logoUrl?: string;
  /** Show the top accent rules. */
  rules: boolean;
  /** Corner radius in 1600×900 canvas px (0 = sharp). */
  radius: number;
}

/** Resolves a theme to concrete colours. Primary is auto-darkened if too light for white text. */
export function paletteFor(theme?: Partial<DeckTheme> | null): DeckPalette {
  const t = { ...DEFAULT_DECK_THEME, ...(theme ?? {}) };
  let navy = clampHex(t.primary, DEFAULT_DECK_THEME.primary);
  while (luminance(navy) > 0.18 && navy !== "#000000") navy = mix(navy, "#000000", 0.2);
  const gold = clampHex(t.accent, DEFAULT_DECK_THEME.accent);
  const paper = clampHex(t.paper, DEFAULT_DECK_THEME.paper);
  const goldLight = mix(gold, "#FFFFFF", 0.35);
  const ink = "#222226";
  const muted = "#6E6E78";
  const fp = FONT_PAIRS[t.fonts] ?? FONT_PAIRS.classic;
  const strip = (c: string) => c.slice(1);
  return {
    navy, gold, goldLight, paper, ink, muted,
    serif: fp.serif, sans: fp.sans,
    hex: { navy: strip(navy), gold: strip(gold), goldLight: strip(goldLight), paper: strip(paper), ink: strip(ink), muted: strip(muted) },
    face: { serif: fp.serifFace, sans: fp.sansFace },
    primaryRgb: toRgb(navy).join(", "),
    paperRgb: toRgb(paper).join(", "),
    logoUrl: t.logoUrl,
    rules: t.rules !== false,
    radius: t.corners === "round" ? 18 : 0,
  };
}

const KEY = "uvid_deck_theme";

export function loadDeckTheme(): DeckTheme {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      return {
        primary: clampHex(raw.primary, DEFAULT_DECK_THEME.primary),
        accent: clampHex(raw.accent, DEFAULT_DECK_THEME.accent),
        paper: clampHex(raw.paper, DEFAULT_DECK_THEME.paper),
        fonts: raw.fonts in FONT_PAIRS ? raw.fonts : "classic",
        rules: raw.rules !== false,
        corners: raw.corners === "round" ? "round" : "sharp",
        logoUrl: typeof raw.logoUrl === "string" && raw.logoUrl.startsWith("data:image/") ? raw.logoUrl : undefined,
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_DECK_THEME;
}

export function saveDeckTheme(theme: DeckTheme): void {
  try { localStorage.setItem(KEY, JSON.stringify(theme)); } catch { /* storage full or blocked — theme just won't persist */ }
}

export interface BrandKit { id: string; name: string; theme: DeckTheme }
const KITS_KEY = "uvid_brand_kits";
const MAX_KITS = 8;

export function loadBrandKits(): BrandKit[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KITS_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((k) => k && typeof k.name === "string" && k.theme && typeof k.theme === "object")
      .slice(0, MAX_KITS)
      .map((k) => ({
        id: String(k.id),
        name: k.name.slice(0, 40),
        theme: {
          primary: clampHex(k.theme.primary, DEFAULT_DECK_THEME.primary),
          accent: clampHex(k.theme.accent, DEFAULT_DECK_THEME.accent),
          paper: clampHex(k.theme.paper, DEFAULT_DECK_THEME.paper),
          fonts: k.theme.fonts in FONT_PAIRS ? k.theme.fonts : "classic",
          rules: k.theme.rules !== false,
          corners: k.theme.corners === "round" ? "round" : "sharp",
          logoUrl: typeof k.theme.logoUrl === "string" && k.theme.logoUrl.startsWith("data:image/") ? k.theme.logoUrl : undefined,
        } as DeckTheme,
      }));
  } catch { return []; }
}

export function saveBrandKits(kits: BrandKit[]): boolean {
  try { localStorage.setItem(KITS_KEY, JSON.stringify(kits.slice(0, MAX_KITS))); return true; } catch { return false; }
}
