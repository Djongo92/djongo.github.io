import { useRef, useState } from "react";
import { Settings as SettingsIcon, Target, Download, Upload, Trash2, Briefcase, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { useScoreGoals } from "@/hooks/useScoreGoals";
import { PRACTICE_AREAS, FIRM_SIZES, GOALS } from "@/components/PersonalizeOnboarding";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/visibilityCategories";
import { downloadExportBundle, clearAllLocalData, importDataBundle } from "@/lib/dataManagement";
import type { AuditRow } from "@/components/dashboard/CommandCenter";

interface SettingsPageProps {
  primaryAudit?: AuditRow;
}

const SCORE_FIELD_FOR: Record<string, keyof AuditRow> = {
  performance: "performance_score",
  social: "social_score",
  seoAuthority: "seo_authority_score",
  thoughtLeadership: "thought_leadership_score",
  reputation: "reputation_score",
};

const SettingsPage = ({ primaryAudit }: SettingsPageProps) => {
  const { context, save } = useFirmContext();
  const { goals, setGoal } = useScoreGoals();
  const [practiceArea, setPracticeArea] = useState(context?.practiceArea ?? "");
  const [firmSize, setFirmSize] = useState(context?.firmSize ?? "");
  const [primaryGoal, setPrimaryGoal] = useState(context?.primaryGoal ?? "");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const saveContext = () => {
    save({ practiceArea, firmSize, primaryGoal });
    toast.success("Firm profile saved.");
  };

  const handleClear = () => {
    clearAllLocalData();
    setConfirmingClear(false);
    toast.success("Local data cleared. Reloading…");
    setTimeout(() => window.location.reload(), 800);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      if (typeof bundle !== "object" || bundle === null) throw new Error("not an object");
      const { imported, skipped } = importDataBundle(bundle);
      if (imported === 0) {
        toast.error("That file didn't have any data this app recognizes.");
        return;
      }
      toast.success(`Imported ${imported} item${imported === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}. Reloading…`);
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Couldn't read that file — make sure it's an export from this app.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="max-w-3xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Settings</span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">Firm Profile & Data</h1>
        <p className="text-sm text-muted-foreground font-body max-w-lg">
          Everything here lives in this browser only — there are no accounts yet, so nothing is shared across devices.
        </p>
      </header>

      <div className="max-w-3xl mx-auto px-6 space-y-6">
        {/* Firm context */}
        <div className="bg-card border border-border/50 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Firm Context</h2>
          </div>
          <p className="text-xs text-muted-foreground font-body mb-4">
            Used to tailor action plans and recommendations — this is separate from the audited domain/market/peer
            group, which are set when you run a Market Visibility audit.
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Practice area</p>
              <div className="flex flex-wrap gap-2">
                {PRACTICE_AREAS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPracticeArea(opt)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-body border transition-colors ${
                      practiceArea === opt
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Firm size</p>
              <div className="flex flex-wrap gap-2">
                {FIRM_SIZES.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFirmSize(opt)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-body border transition-colors ${
                      firmSize === opt
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Primary marketing goal</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPrimaryGoal(opt)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-body border transition-colors ${
                      primaryGoal === opt
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveContext}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-sm font-body text-sm hover:bg-primary/90 transition-colors"
            >
              Save firm profile
            </button>
          </div>
        </div>

        {/* Score targets */}
        <div className="bg-card border border-border/50 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Score Targets</h2>
          </div>
          <p className="text-xs text-muted-foreground font-body mb-4">
            Set a target for any category — it shows up as a marker on the Dashboard and Analytics so the score
            becomes something to hit, not just something to read.
          </p>

          <div className="space-y-3">
            {CATEGORY_ORDER.map((key) => {
              const meta = CATEGORY_META[key];
              const current = primaryAudit ? Number(primaryAudit[SCORE_FIELD_FOR[key]] ?? 0) : null;
              const target = goals[key];
              return (
                <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-body text-foreground">{meta.label}</p>
                    {current !== null && (
                      <p className="text-xs text-muted-foreground font-body">Currently {Math.round(current * 10) / 10} / {meta.max}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={meta.max}
                      value={target ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") setGoal(key, null);
                        else setGoal(key, Math.max(0, Math.min(meta.max, Number(v))));
                      }}
                      className="w-20 bg-secondary/80 border border-border text-foreground text-sm font-body px-2 py-1.5 rounded-sm text-right focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted-foreground font-body">/ {meta.max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data management */}
        <div className="bg-card border border-border/50 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Your Data</h2>
          </div>
          <p className="text-xs text-muted-foreground font-body mb-4">
            Guidebook progress, Workshop history, Battle Plan pieces, goals, and tracked competitors — all stored in
            this browser only. There are no accounts yet, so switching browsers or devices normally means starting
            over — export here, then import that same file on the new one to carry everything across. Exporting or
            clearing here doesn't affect a previously published audit on the server.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadExportBundle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-body border border-border/50 text-foreground hover:border-primary/40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export my data
            </button>

            <input ref={importInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
            <button
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-body border border-border/50 text-foreground hover:border-primary/40 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Import data
            </button>

            {!confirmingClear ? (
              <button
                onClick={() => setConfirmingClear(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-body border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear my data
              </button>
            ) : (
              <div className="inline-flex items-center gap-2">
                <span className="text-xs font-body text-destructive">Delete everything in this browser?</span>
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-sm text-xs font-body bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Yes, clear it
                </button>
                <button
                  onClick={() => setConfirmingClear(false)}
                  className="px-3 py-1.5 rounded-sm text-xs font-body border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
