import { useMemo, useState } from "react";
import { Download, Copy, Monitor, Tablet, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { extractHtml, sanitizeHtml, buildPageDocument, PAGE_THEMES, type PageTheme } from "@/lib/pagePreview";

const DEVICES = [
  { id: "desktop", label: "Desktop", width: "100%", icon: Monitor },
  { id: "tablet", label: "Tablet", width: "768px", icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", icon: Smartphone },
] as const;

const PagePreview = ({ output, title }: { output: string; title?: string }) => {
  const [theme, setTheme] = useState<PageTheme>("classic");
  const [accent, setAccent] = useState("#b8893b");
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");

  const html = useMemo(() => extractHtml(output), [output]);
  const doc = useMemo(() => (html ? buildPageDocument(html, { theme, accent, title }) : ""), [html, theme, accent, title]);
  const width = DEVICES.find((d) => d.id === device)!.width;

  if (!html) {
    return <p className="text-sm text-muted-foreground font-body py-12 text-center">The preview appears once the draft includes its HTML section.</p>;
  }

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([doc], { type: "text/html;charset=utf-8" }));
    a.download = "draft-page.html";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-sm border text-xs font-body ${active ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PAGE_THEMES.map((t) => (
          <button key={t.id} className={chip(theme === t.id)} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</button>
        ))}
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-body ml-1">
          Accent
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Accent colour" className="w-6 h-6 p-0 border border-border rounded-sm bg-transparent" />
        </label>
        <span className="flex-1" />
        {DEVICES.map((d) => (
          <button key={d.id} className={`${chip(device === d.id)} inline-flex items-center gap-1`} aria-pressed={device === d.id} onClick={() => setDevice(d.id)} title={d.label}>
            <d.icon className="w-3 h-3" /> <span className="hidden sm:inline">{d.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-secondary/40 border border-border/50 rounded-sm p-3 flex justify-center">
        <iframe
          title="Page preview"
          sandbox=""
          srcDoc={doc}
          style={{ width, maxWidth: "100%", height: 620, border: "1px solid hsl(var(--border))", background: "#fff", borderRadius: 2 }}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => { navigator.clipboard.writeText(sanitizeHtml(html)); toast.success("Clean HTML copied"); }} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
          <Copy className="w-3 h-3" /> Copy clean HTML
        </button>
        <button onClick={download} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> Download styled page (.html)
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground font-body italic">
        The preview uses a built-in theme. The copied HTML is unstyled on purpose, so your site's own design takes over.
      </p>
    </div>
  );
};

export default PagePreview;
