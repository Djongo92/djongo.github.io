import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { platformData } from '@/data/platform';
import { AiBadge } from '@/components/ui/ai-badge';

// Composes a plain-language "why this score" explanation from a company's
// real scoreFactors — the strongest driver and the biggest drag, each with
// its own underlying signal text — rather than a generic canned sentence.
export function explainScore(companyId: string): { text: string; strongest: string; weakest: string } | null {
  const data = (platformData.console as any)?.intelligence?.scoreFactors?.[companyId];
  if (!data?.factors?.length) return null;

  const ranked = [...data.factors].sort((a: any, b: any) => (b.value / b.max) - (a.value / a.max));
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const strongSignal = strongest.signals?.[0]?.text;
  const weakSignal = weakest.signals?.[0]?.text;

  const parts: string[] = [];
  parts.push(`Primarily driven by ${strongest.name} (${strongest.value}/${strongest.max})${strongSignal ? ` — ${strongSignal}` : ''}.`);
  if (weakest.name !== strongest.name) {
    parts.push(`Held back by ${weakest.name} (${weakest.value}/${weakest.max})${weakSignal ? ` — ${weakSignal}` : ''}.`);
  }
  return { text: parts.join(' '), strongest: strongest.name, weakest: weakest.name };
}

export function ScoreExplanation({ companyId, children }: { companyId: string; children: React.ReactNode }) {
  const explanation = explainScore(companyId);
  if (!explanation) return <>{children}</>;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dashed border-current/30 hover:border-current/60 transition-colors">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-foreground text-background p-4 rounded-2xl text-xs leading-relaxed space-y-2 shadow-xl">
        <p className="font-medium">{explanation.text}</p>
        <AiBadge className="bg-background/10 border-background/10 text-background/70" />
      </TooltipContent>
    </Tooltip>
  );
}
