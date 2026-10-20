// Free-form slide model — the "drag things around" mode. A free slide is a
// background plus an ordered list of positioned items (text, picture, shape)
// in the 1600×900 canvas space every renderer already uses, so the editor,
// the filmstrip preview, the PDF/PNG canvas and the PPTX export all draw the
// same thing. Colours are theme tokens (or a hex), so changing the brand
// re-colours a free slide too.
import type { ParsedSlide } from "@/components/pitchDeckParser";
import { splitLead, stripStepPrefix } from "@/components/pitchDeckParser";
import type { DeckPalette } from "./deckTheme";

export const FREE_W = 1600;
export const FREE_H = 900;

export const COLOR_TOKENS = ["primary", "accent", "accentLight", "paper", "ink", "muted", "white", "black"] as const;

export interface FreeItem {
  id: string;
  kind: "text" | "image" | "shape";
  x: number; y: number; w: number; h: number;
  // text
  text?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  font?: "serif" | "sans";
  color?: string;
  // image (data URL)
  src?: string;
  round?: boolean;
  // shape
  shape?: "rect" | "ellipse" | "round";
  fill?: string;
}

export interface FreeDesign {
  bg: string;
  items: FreeItem[];
}

export const uid = () => Math.random().toString(36).slice(2, 9);

/** Theme token or #hex → concrete #hex. Anything else falls back to ink. */
export function resolveColor(c: string | undefined, P: DeckPalette): string {
  switch (c) {
    case "primary": return P.navy;
    case "accent": return P.gold;
    case "accentLight": return P.goldLight;
    case "paper": return P.paper;
    case "ink": return P.ink;
    case "muted": return P.muted;
    case "white": return "#FFFFFF";
    case "black": return "#000000";
  }
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : P.ink;
}

export const LINE_HEIGHT = 1.25;
export const snap = (n: number, grid = 10) => Math.round(n / grid) * grid;
export const isSafeImage = (src: string | undefined) => !!src && src.startsWith("data:image/");

const num = (i: number, total: number) => `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

type Draft = Omit<FreeItem, "id">;

/** Turns a templated slide into editable items that look like the template. */
export function slideToFree(slide: ParsedSlide, index: number, total: number, firmName?: string | null, rounded = false): FreeDesign {
  const items: FreeItem[] = [];
  const add = (d: Draft) => items.push({ id: uid(), ...d });
  const text = (x: number, y: number, w: number, h: number, t: string, o: Partial<Draft> = {}) =>
    add({ kind: "text", x, y, w, h, text: t, fontSize: 32, font: "sans", color: "ink", align: "left", ...o });
  const shape = (x: number, y: number, w: number, h: number, fill: string, s: FreeItem["shape"] = "rect") =>
    add({ kind: "shape", x, y, w, h, fill, shape: s });
  const bullets = slide.bullets;
  const img = slide.imageUrl;
  const itemImg = (i: number) => slide.itemImages?.[i];

  const chrome = () => {
    shape(0, 0, FREE_W, 10, "primary");
    shape(0, 10, FREE_W, 4, "accent");
    text(80, 80, 300, 34, num(index, total), { fontSize: 24, bold: true, color: "accent" });
    text(80, 135, 1100, 34, slide.title.toUpperCase(), { fontSize: 24, color: "muted" });
  };
  const heading = (w = 1440, h = 150) =>
    text(80, 225, w, h, slide.headline, { fontSize: 52, bold: true, font: "serif", color: "primary" });

  switch (slide.layout) {
    case "title":
      shape(0, 0, FREE_W, 12, "accent");
      text(80, 90, 900, 40, (firmName || "UVID").toUpperCase(), { fontSize: 26, color: "accentLight" });
      text(80, 230, img ? 920 : 1250, 380, slide.headline || slide.title, { fontSize: 76, bold: true, font: "serif", color: "white" });
      if (bullets.length) text(80, 650, img ? 920 : 1250, 180, bullets.slice(0, 4).map((b) => `—  ${b}`).join("\n"), { fontSize: 30, color: "accentLight" });
      if (img) add({ kind: "image", x: 1072, y: 0, w: 528, h: 900, src: img });
      return { bg: "primary", items };
    case "section":
      text(80, 90, 300, 36, num(index, total), { fontSize: 28, bold: true, color: "accent" });
      text(80, 160, 1000, 36, slide.title.toUpperCase(), { fontSize: 28, color: "accentLight" });
      text(80, 320, img ? 780 : 1300, 420, slide.headline, { fontSize: 88, bold: true, font: "serif", color: "white" });
      if (img) add({ kind: "image", x: 928, y: 0, w: 672, h: 900, src: img });
      return { bg: "primary", items };
    case "quote":
      text(100, 30, 300, 300, "“", { fontSize: 240, font: "serif", color: "accent" });
      text(200, 320, 1200, 320, slide.headline, { fontSize: 56, italic: true, bold: true, font: "serif", color: "primary", align: "center" });
      if (bullets.length) text(200, 690, 1200, 150, bullets.slice(0, 3).join("\n"), { fontSize: 30, color: "muted", align: "center" });
      return { bg: "paper", items };
    case "split":
      shape(0, 0, 800, 900, "primary");
      shape(0, 0, 800, 10, "accent");
      text(80, 90, 640, 36, slide.title.toUpperCase(), { fontSize: 22, color: "accentLight" });
      text(80, 230, 640, 520, slide.headline, { fontSize: 58, bold: true, font: "serif", color: "white" });
      text(80, 820, 300, 34, num(index, total), { fontSize: 20, bold: true, color: "accent" });
      if (img) add({ kind: "image", x: 800, y: 0, w: 800, h: 900, src: img });
      else text(880, 230, 620, 560, bullets.slice(0, 5).map((b) => `•  ${b}`).join("\n\n"), { fontSize: 34 });
      return { bg: "paper", items };
    case "stats": {
      chrome();
      heading(img ? 920 : 1400, 130);
      bullets.slice(0, 4).forEach((b, i) => {
        const m = b.trim().match(/^([\d$€£%×x+~][\d.,$€£%+×x~kKmMbB]*)\s+([\s\S]*)$/);
        const y = 430 + i * 120;
        if (m) {
          text(80, y, 320, 90, m[1], { fontSize: 64, bold: true, font: "serif", color: "accent" });
          text(420, y + 14, img ? 580 : 1000, 90, m[2], { fontSize: 30 });
        } else text(80, y, 1000, 90, `•  ${b}`, { fontSize: 30 });
      });
      if (img) add({ kind: "image", x: 1050, y: 210, w: 470, h: 560, src: img });
      return { bg: "paper", items };
    }
    case "process": {
      chrome();
      heading(1440, 130);
      const steps = bullets.slice(0, 5);
      const colW = FREE_W - 160;
      const cw = colW / Math.max(steps.length, 1);
      const cy = 560;
      shape(80, cy - 2, colW, 4, "accentLight");
      steps.forEach((b, i) => {
        const cx = 80 + cw * (i + 0.5);
        shape(cx - 52, cy - 52, 104, 104, "primary", "ellipse");
        if (itemImg(i)) add({ kind: "image", x: cx - 52, y: cy - 52, w: 104, h: 104, src: itemImg(i), round: true });
        else text(cx - 52, cy - 34, 104, 70, String(i + 1), { fontSize: 48, bold: true, font: "serif", color: "accentLight", align: "center" });
        const [lead, rest] = splitLead(stripStepPrefix(b));
        text(cx - cw / 2 + 25, cy + 90, cw - 50, 90, lead || rest, { fontSize: 32, bold: true, font: "serif", color: "primary", align: "center" });
        if (lead) text(cx - cw / 2 + 25, cy + 180, cw - 50, 150, rest, { fontSize: 26, align: "center" });
      });
      return { bg: "paper", items };
    }
    case "cards": {
      chrome();
      heading(1440, 130);
      const cards = bullets.slice(0, 4);
      const gap = 30;
      const cw = (1440 - gap * (cards.length - 1)) / Math.max(cards.length, 1);
      cards.forEach((b, i) => {
        const x = 80 + i * (cw + gap);
        shape(x, 410, cw, 420, "white", rounded ? "round" : "rect");
        shape(x, 410, cw, 6, "accent");
        const hasImg = !!itemImg(i);
        if (hasImg) add({ kind: "image", x, y: 416, w: cw, h: 170, src: itemImg(i) });
        const [lead, rest] = splitLead(b);
        const top = hasImg ? 606 : 450;
        text(x + 28, top, cw - 56, 90, lead, { fontSize: 34, bold: true, font: "serif", color: "primary" });
        text(x + 28, top + 90, cw - 56, hasImg ? 130 : 270, rest, { fontSize: 26 });
      });
      return { bg: "paper", items };
    }
    default:
      chrome();
      heading(img ? 920 : 1400, 160);
      text(80, 430, img ? 880 : 1330, 420, bullets.slice(0, 5).map((b) => `•  ${b}`).join("\n\n"), { fontSize: 34 });
      if (img) add({ kind: "image", x: 1050, y: 210, w: 470, h: 560, src: img });
      return { bg: "paper", items };
  }
}
