// Turns the Page Drafter's output into something a visitor can actually see.
// The model returns markdown containing one fenced ```html block of plain
// semantic HTML. We pull that out, strip anything that could execute, and
// wrap it in a built-in theme so the firm sees a designed page — while the
// "clean HTML" they copy stays unstyled for their own developer or CMS.

export type PageTheme = "classic" | "modern" | "dark";
export const PAGE_THEMES: { id: PageTheme; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "dark", label: "Dark" },
];

/** The last ```html fence; tolerates a block that is still streaming (no closing fence yet). */
export function extractHtml(markdown: string): string {
  const open = markdown.lastIndexOf("```html");
  if (open === -1) return "";
  const start = markdown.indexOf("\n", open);
  if (start === -1) return "";
  const close = markdown.indexOf("```", start);
  return markdown.slice(start + 1, close === -1 ? undefined : close).trim();
}

const BLOCKED_TAGS = ["script", "iframe", "object", "embed", "link", "meta", "base", "form", "style", "noscript"];

/** Removes anything executable or external-loading. Output is safe to inject and to hand to a CMS. */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.querySelectorAll(BLOCKED_TAGS.join(",")).forEach((el) => el.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase().replace(/[\s\u0000-\u001f]/g, "");
      if (name.startsWith("on") || name === "style" || name === "srcdoc") el.removeAttribute(attr.name);
      else if ((name === "href" || name === "src" || name === "xlink:href") && /^(javascript|data|vbscript):/.test(value)) el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeColor = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#b8893b");

const THEMES: Record<PageTheme, { bg: string; ink: string; muted: string; card: string; head: string; body: string }> = {
  classic: { bg: "#f8f5ee", ink: "#222226", muted: "#6e6e78", card: "#ffffff", head: "Georgia, 'Times New Roman', serif", body: "Calibri, 'Segoe UI', Arial, sans-serif" },
  modern: { bg: "#ffffff", ink: "#16181d", muted: "#5b6270", card: "#f4f5f7", head: "'Segoe UI', Arial, sans-serif", body: "'Segoe UI', Arial, sans-serif" },
  dark: { bg: "#101521", ink: "#ecebe6", muted: "#a2a7b5", card: "#1a2133", head: "Georgia, 'Times New Roman', serif", body: "Calibri, 'Segoe UI', Arial, sans-serif" },
};

/** A complete, self-contained HTML document: sanitized body inside the chosen theme. */
export function buildPageDocument(bodyHtml: string, opts: { theme: PageTheme; accent: string; title?: string }): string {
  const t = THEMES[opts.theme];
  const accent = safeColor(opts.accent);
  const body = sanitizeHtml(bodyHtml);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title || "Draft page")}</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:${t.bg};color:${t.ink};font-family:${t.body};font-size:17px;line-height:1.65}
main{max-width:860px;margin:0 auto;padding:56px 28px 96px}
h1{font-family:${t.head};font-size:2.5rem;line-height:1.15;margin:0 0 .6em;letter-spacing:-.01em}
h2{font-family:${t.head};font-size:1.6rem;line-height:1.25;margin:2.2em 0 .5em;padding-top:.9em;border-top:3px solid ${accent}}
h3{font-family:${t.head};font-size:1.2rem;margin:1.6em 0 .4em}
p,li{color:${t.ink}}
p.lead,h1+p{font-size:1.2rem;color:${t.muted}}
ul,ol{padding-left:1.3em}li{margin:.35em 0}
a{color:${accent}}
a[href="#contact"],a.cta{display:inline-block;margin:1em 0;padding:.8em 1.6em;background:${accent};color:#fff;text-decoration:none;font-weight:600;border-radius:3px}
section,article,dl{margin:0}
dt{font-weight:700;margin-top:1.2em;font-family:${t.head}}
dd{margin:.3em 0 0;color:${t.muted}}
blockquote{margin:1.5em 0;padding:.4em 1.2em;border-left:4px solid ${accent};background:${t.card}}
table{border-collapse:collapse;width:100%}td,th{padding:.6em;border-bottom:1px solid ${t.muted}55;text-align:left}
</style></head><body><main>
${body}
</main></body></html>`;
}
