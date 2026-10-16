// Renders a chapter's copyable artifacts (templates, checklists, scripts,
// scorecards) plus its proof metric. Artifacts are the rubric's utilitarian
// core — advice tells, artifacts let the firm DO — so they render as
// first-class copyable cards between the doctrine and the Action Plan.
import { useState } from "react";
import { Copy, Check, FileText, ListChecks, MessagesSquare, Gauge, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { ChapterArtifact } from "@/data/chapters";

const TYPE_META: Record<ChapterArtifact["type"], { label: string; Icon: typeof FileText }> = {
  template: { label: "Template", Icon: FileText },
  checklist: { label: "Checklist", Icon: ListChecks },
  script: { label: "Script", Icon: MessagesSquare },
  scorecard: { label: "Scorecard", Icon: Gauge },
};

const ArtifactCard = ({ artifact }: { artifact: ChapterArtifact }) => {
  const [copied, setCopied] = useState(false);
  const { label, Icon } = TYPE_META[artifact.type];

  const copy = async () => {
    await navigator.clipboard.writeText(artifact.body);
    setCopied(true);
    toast.success(`${label} copied — paste it anywhere.`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border/50 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-secondary/20">
        <span className="eyebrow text-[10px] text-primary flex items-center gap-1.5">
          <Icon className="w-3 h-3" /> {label} · {artifact.title}
        </span>
        <button
          onClick={copy}
          className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-[13px] leading-relaxed text-secondary-foreground/85 font-body whitespace-pre-wrap">
        {artifact.body}
      </pre>
    </div>
  );
};

interface ChapterArtifactsProps {
  artifacts: ChapterArtifact[];
  proofMetric?: string;
}

const ChapterArtifacts = ({ artifacts, proofMetric }: ChapterArtifactsProps) => (
  <section className="mb-10">
    <h2 className="font-display text-2xl md:text-3xl text-foreground font-medium mb-2 mt-4">The Materials</h2>
    <p className="text-sm text-muted-foreground font-body mb-5">
      Everything this chapter tells you to build — ready to copy and use.
    </p>
    <div className="space-y-4">
      {artifacts.map((a) => (
        <ArtifactCard key={a.title} artifact={a} />
      ))}
    </div>
    {proofMetric && (
      <div className="mt-5 bg-primary/5 border-l-4 border-primary p-4 rounded-r-sm flex items-start gap-3">
        <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="font-body text-xs text-secondary-foreground/85 leading-relaxed">
          <span className="font-medium text-foreground">Proof it worked:</span> {proofMetric}
        </p>
      </div>
    )}
  </section>
);

export default ChapterArtifacts;
