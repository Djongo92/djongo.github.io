// One "Diagnose" tool, two ways in: paste copy (Copy Autopsy) or point at a
// live page (Practice Page Audit). They used to be separate tiles doing
// near-identical jobs. The engines are unchanged, so saved history, hand-offs
// and the "audit" / "autopsy" tool ids all keep working.
import { FileText, Globe } from "lucide-react";
import CopyAutopsy from "./CopyAutopsy";
import PracticePageAudit from "./PracticePageAudit";

export type DiagnoseMode = "copy" | "page";

const MODES: { id: DiagnoseMode; label: string; hint: string; icon: typeof FileText }[] = [
  { id: "copy", label: "Paste copy", hint: "Grade a headline, bio, email or any text on six axes.", icon: FileText },
  { id: "page", label: "Check a live page", hint: "Score a practice-area page against the framework.", icon: Globe },
];

const Diagnose = ({ mode, onModeChange }: { mode: DiagnoseMode; onModeChange: (m: DiagnoseMode) => void }) => (
  <div>
    <div className="flex flex-wrap gap-2 mb-2" role="tablist" aria-label="Diagnose mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={mode === m.id}
          onClick={() => onModeChange(m.id)}
          className={`px-4 py-2 text-xs font-body rounded-sm border inline-flex items-center gap-2 transition-all ${
            mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          <m.icon className="w-3.5 h-3.5" /> {m.label}
        </button>
      ))}
    </div>
    <p className="text-[11px] text-muted-foreground font-body mb-6">{MODES.find((m) => m.id === mode)?.hint}</p>
    {mode === "copy" ? <CopyAutopsy /> : <PracticePageAudit />}
  </div>
);

export default Diagnose;
