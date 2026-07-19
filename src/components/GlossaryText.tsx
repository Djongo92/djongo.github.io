import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildGlossaryMatcher } from "@/lib/glossary";

// Build the matcher once at module load — glossary is static.
const { regex, lookup } = buildGlossaryMatcher();

interface GlossaryTextProps {
  text: string;
  /**
   * If true, only highlights the FIRST occurrence of each term in this text.
   * Default true — keeps the page from looking like a sea of underlined terms.
   */
  uniqueOnly?: boolean;
}

/**
 * Wraps any string and turns recognised marketing/legal terms into hover-defined
 * tooltips. Falls back to plain text if no terms match (zero overhead).
 */
const GlossaryText = ({ text, uniqueOnly = true }: GlossaryTextProps) => {
  const parts = useMemo(() => {
    if (!text) return [text];

    // Reset regex state — global regexes carry lastIndex between uses.
    regex.lastIndex = 0;

    const seen = new Set<string>();
    const segments: Array<string | { match: string; key: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matched = match[0];
      const key = matched.toLowerCase();

      if (uniqueOnly && seen.has(key)) continue;
      seen.add(key);

      if (match.index > lastIndex) {
        segments.push(text.slice(lastIndex, match.index));
      }
      segments.push({ match: matched, key });
      lastIndex = match.index + matched.length;
    }
    if (lastIndex < text.length) {
      segments.push(text.slice(lastIndex));
    }

    return segments.length > 0 ? segments : [text];
  }, [text, uniqueOnly]);

  // No matches found — return text as-is to avoid extra DOM
  if (parts.length === 1 && typeof parts[0] === "string") {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string") return <span key={i}>{part}</span>;
        const entry = lookup.get(part.key);
        if (!entry) return <span key={i}>{part.match}</span>;
        return (
          <Tooltip key={i} delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="border-b border-dotted border-primary/50 cursor-help text-foreground/95 hover:text-primary transition-colors">
                {part.match}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs p-3 bg-card border border-border shadow-xl text-foreground"
            >
              <p className="font-display text-sm text-primary mb-1 not-italic">{entry.term}</p>
              <p className="font-body text-xs text-secondary-foreground/80 leading-relaxed">
                {entry.definition}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
};

export default GlossaryText;