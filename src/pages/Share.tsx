import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight } from "lucide-react";

interface Artifact {
  id: string;
  kind: string;
  title: string;
  source_url: string | null;
  payload: any;
  created_at: string;
  expires_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  roast: "Homepage Roast", autopsy: "Copy Autopsy", audit: "Practice Page Audit",
  teardown: "Competitor Teardown", headline: "Headline", bio: "Bio Rewrite",
  maturity: "Firm Maturity Score", roadmap: "30/60/90 Roadmap", pitch: "Pitch Deck",
  calendar: "Marketing Calendar", copy: "Copy",
};

const Share = () => {
  const { id } = useParams();
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.from("shared_artifacts").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setError("This share link is no longer available."); }
      else { setArtifact(data as Artifact); }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => { document.title = artifact ? `${artifact.title} · The Legal Web Playbook` : "Shared artifact · The Legal Web Playbook"; }, [artifact]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }
  if (error || !artifact) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-display text-2xl text-foreground mb-2">Link unavailable</p>
          <p className="text-sm text-muted-foreground font-body mb-6">{error || "Not found."}</p>
          <Link to="/" className="text-xs text-primary hover:text-gold-light font-body">← Back to the Playbook</Link>
        </div>
      </div>
    );
  }

  const dated = new Date(artifact.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">The Legal Web Playbook</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body">Shared artifact</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-2 text-[10px] tracking-[0.3em] uppercase text-primary font-body">{KIND_LABEL[artifact.kind] || artifact.kind}</div>
        <h1 className="font-display text-4xl text-foreground mb-3 leading-tight">{artifact.title}</h1>
        {artifact.source_url && <p className="text-xs text-muted-foreground font-body mb-6">{artifact.source_url}</p>}

        <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground bg-card border border-border/50 rounded-sm p-6">
          <pre className="whitespace-pre-wrap font-body text-sm text-foreground/90 leading-relaxed">
            {typeof artifact.payload === "string"
              ? artifact.payload
              : JSON.stringify(artifact.payload, null, 2)}
          </pre>
        </article>

        <footer className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body">
            Generated · {dated}
          </p>
          <Link to="/" className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
            Build your own <ArrowRight className="w-3 h-3" />
          </Link>
        </footer>
        <p className="mt-6 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-body text-center">
          For Authorized Use Only
        </p>
      </main>
    </div>
  );
};

export default Share;