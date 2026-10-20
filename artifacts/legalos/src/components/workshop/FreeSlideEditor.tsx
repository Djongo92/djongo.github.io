// Drag-and-drop slide editor. The stage is the same 1600×900 canvas space the
// PDF/PNG/PPTX renderers use, scaled to fit, so what you arrange here is what
// exports. Pointer events move and resize; the inspector below edits text,
// colour, size and stacking order.
import { useEffect, useRef, useState } from "react";
import { Type, Image as ImageIcon, Square, Circle, Trash2, Copy, ArrowUpToLine, ArrowDownToLine, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { FreeItemView } from "@/components/pitchDeckPreview";
import { paletteFor, type DeckTheme } from "@/lib/deckTheme";
import { COLOR_TOKENS, FREE_W, FREE_H, resolveColor, snap, uid, type FreeDesign, type FreeItem } from "@/lib/freeSlide";
import { fileToSlideImage } from "@/lib/slideImage";

interface Props {
  free: FreeDesign;
  theme: DeckTheme;
  onChange: (next: FreeDesign) => void;
}

const MIN = 40;
const TOKEN_LABEL: Record<string, string> = {
  primary: "Main", accent: "Accent", accentLight: "Light accent", paper: "Background", ink: "Text", muted: "Muted", white: "White", black: "Black",
};

const FreeSlideEditor = ({ free, theme, onChange }: Props) => {
  const C = paletteFor(theme);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState(0.5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<FreeDesign[]>([]);
  const drag = useRef<{ id: string; mode: "move" | "resize"; sx: number; sy: number; orig: FreeItem; pushed: boolean } | null>(null);
  const freeRef = useRef(free);
  freeRef.current = free;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / FREE_W));
    ro.observe(el);
    setScale(el.clientWidth / FREE_W);
    return () => ro.disconnect();
  }, []);

  const selected = free.items.find((i) => i.id === selectedId) ?? null;

  const commit = (next: FreeDesign, recordHistory = true) => {
    if (recordHistory) setHistory((h) => [...h.slice(-29), freeRef.current]);
    onChange(next);
  };
  const patchItem = (id: string, patch: Partial<FreeItem>, recordHistory = true) =>
    commit({ ...free, items: free.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }, recordHistory);

  // Drag / resize via window listeners so the pointer can leave the item.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const k = scaleRef.current || 1;
      const dx = (e.clientX - d.sx) / k;
      const dy = (e.clientY - d.sy) / k;
      if (!d.pushed && Math.abs(dx) + Math.abs(dy) > 2) {
        d.pushed = true;
        setHistory((h) => [...h.slice(-29), freeRef.current]);
      }
      const cur = freeRef.current;
      const items = cur.items.map((i) => {
        if (i.id !== d.id) return i;
        if (d.mode === "move") {
          return { ...i, x: Math.max(-i.w + MIN, Math.min(FREE_W - MIN, snap(d.orig.x + dx))), y: Math.max(-i.h + MIN, Math.min(FREE_H - MIN, snap(d.orig.y + dy))) };
        }
        return { ...i, w: Math.max(MIN, snap(d.orig.w + dx)), h: Math.max(MIN, snap(d.orig.h + dy)) };
      });
      onChange({ ...cur, items });
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [onChange]);

  const startDrag = (e: React.PointerEvent, item: FreeItem, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(item.id);
    stageRef.current?.focus();
    drag.current = { id: item.id, mode, sx: e.clientX, sy: e.clientY, orig: item, pushed: false };
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!selected) return;
    const step = e.shiftKey ? 1 : 10;
    const move = (dx: number, dy: number) => { e.preventDefault(); patchItem(selected.id, { x: selected.x + dx, y: selected.y + dy }); };
    if (e.key === "ArrowLeft") move(-step, 0);
    else if (e.key === "ArrowRight") move(step, 0);
    else if (e.key === "ArrowUp") move(0, -step);
    else if (e.key === "ArrowDown") move(0, step);
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(); }
  };

  const add = (item: Omit<FreeItem, "id">) => {
    const id = uid();
    commit({ ...free, items: [...free.items, { id, ...item }] });
    setSelectedId(id);
  };
  const remove = () => { if (selected) { commit({ ...free, items: free.items.filter((i) => i.id !== selected.id) }); setSelectedId(null); } };
  const duplicate = () => {
    if (!selected) return;
    const id = uid();
    commit({ ...free, items: [...free.items, { ...selected, id, x: selected.x + 30, y: selected.y + 30 }] });
    setSelectedId(id);
  };
  const reorder = (toFront: boolean) => {
    if (!selected) return;
    const rest = free.items.filter((i) => i.id !== selected.id);
    commit({ ...free, items: toFront ? [...rest, selected] : [selected, ...rest] });
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    onChange(prev);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const src = await fileToSlideImage(file);
      const dims = await new Promise<{ w: number; h: number }>((res) => {
        const im = new Image();
        im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => res({ w: 4, h: 3 });
        im.src = src;
      });
      const w = 480;
      const h = Math.min(700, Math.round((w * dims.h) / dims.w));
      if (selected?.kind === "image") patchItem(selected.id, { src });
      else add({ kind: "image", x: 560, y: 200, w, h, src });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that image.");
    }
  };

  const ctl = "bg-background border border-border rounded-sm px-2 py-1 text-xs font-body focus:outline-none focus:border-primary";
  const btn = "inline-flex items-center gap-1 text-xs text-primary hover:text-gold-light font-body border border-primary/30 hover:border-primary/60 rounded-sm px-2.5 py-1.5 disabled:opacity-40";
  const iconBtn = (active: boolean) => `p-1.5 rounded-sm border ${active ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`;

  const ColorPick = ({ value, onPick, label }: { value?: string; onPick: (v: string) => void; label: string }) => (
    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-body">
      {label}
      <select
        value={COLOR_TOKENS.includes((value ?? "") as never) ? value : "custom"}
        onChange={(e) => e.target.value !== "custom" && onPick(e.target.value)}
        className={ctl}
      >
        {COLOR_TOKENS.map((t) => <option key={t} value={t}>{TOKEN_LABEL[t]}</option>)}
        <option value="custom">Custom…</option>
      </select>
      <input
        type="color"
        value={resolveColor(value, C)}
        onChange={(e) => onPick(e.target.value.toUpperCase())}
        aria-label={`${label} colour`}
        className="w-6 h-6 p-0 border border-border rounded-sm bg-transparent"
      />
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} onClick={() => add({ kind: "text", x: 200, y: 300, w: 600, h: 120, text: "New text", fontSize: 40, font: "sans", color: "ink", align: "left" })}><Type className="w-3.5 h-3.5" /> Text</button>
        <button className={btn} onClick={() => fileRef.current?.click()}><ImageIcon className="w-3.5 h-3.5" /> {selected?.kind === "image" ? "Replace image" : "Image"}</button>
        <button className={btn} onClick={() => add({ kind: "shape", x: 300, y: 300, w: 400, h: 240, shape: "rect", fill: "accent" })}><Square className="w-3.5 h-3.5" /> Box</button>
        <button className={btn} onClick={() => add({ kind: "shape", x: 300, y: 300, w: 260, h: 260, shape: "ellipse", fill: "accent" })}><Circle className="w-3.5 h-3.5" /> Circle</button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickImage} />
        <span className="flex-1" />
        <ColorPick label="Background" value={free.bg} onPick={(v) => commit({ ...free, bg: v })} />
        <button className={btn} onClick={undo} disabled={history.length === 0}><Undo2 className="w-3.5 h-3.5" /> Undo</button>
      </div>

      <div
        ref={stageRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={() => setSelectedId(null)}
        className="relative w-full overflow-hidden rounded-sm border border-border/50 outline-none focus:ring-1 focus:ring-primary/50"
        style={{ aspectRatio: "16 / 9", background: resolveColor(free.bg, C), touchAction: "none" }}
        aria-label="Slide canvas — drag items to move, drag the corner handle to resize, arrow keys nudge"
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: FREE_W, height: FREE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {free.items.map((it) => (
            <div key={it.id}>
              <FreeItemView item={it} C={C} />
              <div
                onPointerDown={(e) => startDrag(e, it, "move")}
                style={{
                  position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h, cursor: "move",
                  outline: it.id === selectedId ? "4px solid #3b82f6" : "none",
                }}
              />
              {it.id === selectedId && (
                <div
                  onPointerDown={(e) => startDrag(e, it, "resize")}
                  style={{ position: "absolute", left: it.x + it.w - 14, top: it.y + it.h - 14, width: 28, height: 28, background: "#3b82f6", border: "3px solid #fff", borderRadius: 4, cursor: "nwse-resize" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-sm p-3 space-y-2.5 min-h-[64px]">
        {!selected && <p className="text-xs text-muted-foreground font-body">Click an item to edit it. Drag to move, pull the blue corner to resize, arrow keys nudge (Shift = fine), Delete removes.</p>}
        {selected && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button className={btn} onClick={() => reorder(true)}><ArrowUpToLine className="w-3.5 h-3.5" /> Front</button>
              <button className={btn} onClick={() => reorder(false)}><ArrowDownToLine className="w-3.5 h-3.5" /> Back</button>
              <button className={btn} onClick={duplicate}><Copy className="w-3.5 h-3.5" /> Duplicate</button>
              <button className={btn} onClick={remove}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
            {selected.kind === "text" && (
              <div className="space-y-2">
                <textarea
                  value={selected.text ?? ""}
                  onChange={(e) => patchItem(selected.id, { text: e.target.value }, false)}
                  onBlur={() => setHistory((h) => h)}
                  rows={3}
                  className={`${ctl} w-full resize-y`}
                  aria-label="Text"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-body">
                    Size
                    <input type="number" min={10} max={300} value={selected.fontSize ?? 32} onChange={(e) => patchItem(selected.id, { fontSize: Math.max(10, Math.min(300, Number(e.target.value) || 32)) }, false)} className={`${ctl} w-16`} />
                  </label>
                  <select value={selected.font ?? "sans"} onChange={(e) => patchItem(selected.id, { font: e.target.value as "serif" | "sans" })} className={ctl} aria-label="Font">
                    <option value="sans">Body font</option>
                    <option value="serif">Heading font</option>
                  </select>
                  <button className={iconBtn(!!selected.bold)} onClick={() => patchItem(selected.id, { bold: !selected.bold })} aria-label="Bold"><Bold className="w-3.5 h-3.5" /></button>
                  <button className={iconBtn(!!selected.italic)} onClick={() => patchItem(selected.id, { italic: !selected.italic })} aria-label="Italic"><Italic className="w-3.5 h-3.5" /></button>
                  {(["left", "center", "right"] as const).map((a) => (
                    <button key={a} className={iconBtn((selected.align ?? "left") === a)} onClick={() => patchItem(selected.id, { align: a })} aria-label={`Align ${a}`}>
                      {a === "left" ? <AlignLeft className="w-3.5 h-3.5" /> : a === "center" ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  <ColorPick label="Colour" value={selected.color} onPick={(v) => patchItem(selected.id, { color: v })} />
                </div>
              </div>
            )}
            {selected.kind === "shape" && (
              <div className="flex flex-wrap items-center gap-3">
                <ColorPick label="Fill" value={selected.fill} onPick={(v) => patchItem(selected.id, { fill: v })} />
                <select value={selected.shape ?? "rect"} onChange={(e) => patchItem(selected.id, { shape: e.target.value as FreeItem["shape"] })} className={ctl} aria-label="Shape">
                  <option value="rect">Square corners</option>
                  <option value="round">Rounded</option>
                  <option value="ellipse">Ellipse</option>
                </select>
              </div>
            )}
            {selected.kind === "image" && (
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-body">
                <input type="checkbox" checked={!!selected.round} onChange={(e) => patchItem(selected.id, { round: e.target.checked })} /> Crop to circle
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FreeSlideEditor;
