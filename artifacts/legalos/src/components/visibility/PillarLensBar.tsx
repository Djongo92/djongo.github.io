import { useState } from "react";
import { Bookmark, X } from "lucide-react";
import { CATEGORY_META, CATEGORY_ORDER, type CategoryKey } from "@/lib/visibilityCategories";
import { FIXED_PRESETS, type PillarPreset } from "@/lib/pillarLens";

interface Props {
  /** "overall", a fixed preset id, a saved preset id, or "custom". */
  view: string;
  pillars: CategoryKey[];
  savedPresets: PillarPreset[];
  canSaveMore: boolean;
  onSelect: (view: string, pillars: CategoryKey[]) => void;
  onSave: (label: string, pillars: CategoryKey[]) => void;
  onRemove: (id: string) => void;
}

const chip = (active: boolean) =>
  `px-2.5 py-1 rounded-sm border text-xs font-body transition-colors ${
    active
      ? "border-primary bg-primary/10 text-foreground"
      : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
  }`;

export const PillarLensBar = ({ view, pillars, savedPresets, canSaveMore, onSelect, onSave, onRemove }: Props) => {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const togglePillar = (key: CategoryKey) => {
    const next = pillars.includes(key) ? pillars.filter((p) => p !== key) : [...pillars, key];
    onSelect("custom", CATEGORY_ORDER.filter((k) => next.includes(k)));
  };

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pillars.length === 0) return;
    onSave(name, pillars);
    setName("");
    setNaming(false);
  };

  return (
    <div className="space-y-2" role="group" aria-label="View the list by pillar">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow text-[9px] text-muted-foreground/70 mr-1">View by</span>
        <button className={chip(view === "overall")} aria-pressed={view === "overall"} onClick={() => onSelect("overall", [])}>
          Overall
        </button>
        {FIXED_PRESETS.map((p) => (
          <button
            key={p.id}
            className={chip(view === p.id)}
            aria-pressed={view === p.id}
            title={p.blurb}
            onClick={() => onSelect(p.id, p.pillars)}
          >
            {p.label}
          </button>
        ))}
        {savedPresets.map((p) => (
          <span key={p.id} className="inline-flex items-center">
            <button
              className={chip(view === p.id)}
              aria-pressed={view === p.id}
              title={p.pillars.map((k) => CATEGORY_META[k].label).join(" + ")}
              onClick={() => onSelect(p.id, p.pillars)}
            >
              <Bookmark className="w-2.5 h-2.5 inline mr-1 -mt-px" />
              {p.label}
            </button>
            <button
              onClick={() => onRemove(p.id)}
              aria-label={`Remove preset ${p.label}`}
              className="ml-0.5 text-muted-foreground/60 hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button className={chip(view === "custom")} aria-pressed={view === "custom"} onClick={() => onSelect("custom", pillars)}>
          Custom
        </button>
      </div>

      {view === "custom" && (
        <div className="bg-card border border-border/50 rounded-sm p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground font-body">
            Tick the pillars that matter to you. Each counts exactly as it does in the overall score — the others are just left out.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ORDER.map((k) => (
              <label key={k} className={`${chip(pillars.includes(k))} cursor-pointer inline-flex items-center gap-1.5`}>
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={pillars.includes(k)}
                  onChange={() => togglePillar(k)}
                />
                {CATEGORY_META[k].label}
              </label>
            ))}
          </div>
          {pillars.length > 0 && canSaveMore && (
            naming ? (
              <form onSubmit={submitName} className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="Name this view, e.g. Our priorities"
                  aria-label="Preset name"
                  className="flex-1 bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground text-xs font-body px-2 py-1.5 rounded-sm focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-2.5 py-1.5 rounded-sm text-xs font-body bg-primary text-primary-foreground disabled:opacity-40"
                >
                  Save
                </button>
                <button type="button" onClick={() => setNaming(false)} className="text-xs text-muted-foreground hover:text-foreground font-body">
                  Cancel
                </button>
              </form>
            ) : (
              <button onClick={() => setNaming(true)} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> Save as my preset
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
