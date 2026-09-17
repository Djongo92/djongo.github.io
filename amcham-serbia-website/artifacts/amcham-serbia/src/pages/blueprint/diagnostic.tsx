import React from 'react';
import { BlueprintLayout } from '@/components/blueprint-layout';
import { useI18n } from '@/lib/i18n';
import { CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';

export default function BlueprintDiagnostic() {
  const { t } = useI18n();

  return (
    <BlueprintLayout title={t('blueprint.nav.diagnostic')}>
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl font-serif font-bold mb-6">The Diagnostic</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Before we rebuild, we must agree on what works and what doesn't. 
            This plain-language assessment sets the baseline for the redesign.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* What works */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-2xl font-serif font-bold">What the site does well today</h3>
            </div>
            <ul className="space-y-4">
              {[
                "News is current and regularly published in both Serbian and English.",
                "Joining is possible online — a real enquiry form with substantive fields.",
                "An A–Z member directory with individual company profiles exists.",
                "Research is genuinely published — the Lap Time survey series as readable articles plus downloads."
              ].map((item, i) => (
                <li key={i} className="flex gap-4 items-start bg-card border border-border p-4 rounded-sm shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2 shrink-0"></div>
                  <span className="text-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What is hard */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <h3 className="text-2xl font-serif font-bold">What is hard today</h3>
            </div>
            <ul className="space-y-4">
              {[
                "A prospective member cannot quickly tell what membership offers, what it costs, or what happens after an enquiry.",
                "Finding an event, a company, a committee, or a research answer takes more effort than it should — the routes exist, the signposting doesn't.",
                "Key facts hide behind decoration: headline statistics only appear after scroll animations; some links point to the wrong destination; some content is duplicated or out of date."
              ].map((item, i) => (
                <li key={i} className="flex gap-4 items-start bg-card border border-border p-4 rounded-sm shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 shrink-0"></div>
                  <span className="text-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Evidence */}
        <div className="bg-secondary text-secondary-foreground p-8 md:p-12 rounded-sm shadow-xl relative overflow-hidden mb-16">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-serif font-bold text-secondary-foreground">The Evidence</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-6">
              <p className="text-lg text-secondary-foreground/90 leading-relaxed">
                Compared with 47 other AmCham websites across Europe, Serbia scores <strong className="text-secondary-foreground font-bold">8/12</strong> on how easy public information is to find — joining and events are the weak spots (research is already best-in-class at 3/3).
              </p>
              <p className="text-lg text-secondary-foreground/90 leading-relaxed">
                Visual first impression scores <strong className="text-secondary-foreground font-bold">4/6</strong> — the median. Not broken, not distinctive.
              </p>
            </div>

            <div className="bg-secondary-foreground/10 border border-secondary-foreground/20 p-6 rounded-sm">
              <h4 className="font-bold text-accent mb-4 uppercase tracking-widest text-sm">Five Test Journeys</h4>
              <p className="text-secondary-foreground/80 mb-4 text-sm">Everything in the redesign is judged against these five:</p>
              <ol className="space-y-2 list-decimal list-inside text-secondary-foreground/90 font-medium">
                <li>Join AmCham</li>
                <li>Attend an event</li>
                <li>Find a member</li>
                <li>Find research</li>
                <li>Reach a committee</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </BlueprintLayout>
  );
}
