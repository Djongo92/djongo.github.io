import React from 'react';
import { BlueprintLayout } from '@/components/blueprint-layout';
import { useI18n } from '@/lib/i18n';
import { Target, Flag, PenTool, Rocket, LineChart } from 'lucide-react';

export default function BlueprintRoadmap() {
  const { t } = useI18n();

  const steps = [
    {
      id: 1,
      icon: Target,
      title: "Step 1 — Fix what is broken",
      timeline: "Weeks 1–2",
      what: "Broken links, duplicated news, statistics trapped behind animations, out-of-date committee pages.",
      why: "These are verified defects, not opinions. Fixing them costs little, builds trust in the process, and stops the current site actively undermining credibility while the redesign is prepared.",
      unlocks: "A trustworthy baseline to measure the redesign against."
    },
    {
      id: 2,
      icon: Flag,
      title: "Step 2 — Agree the direction on evidence, not taste",
      timeline: "Weeks 3–4",
      what: "Five prototype pages (the ones on this site), tested with real members and prospective members on the five journeys.",
      why: "Design debates at board level are settled by watching real users succeed or fail, not by preference. One round of testing now prevents months of revision later.",
      unlocks: "A signed-off direction everyone has already seen working."
    },
    {
      id: 3,
      icon: PenTool,
      title: "Step 3 — Rebuild the core journeys",
      timeline: "Weeks 5–8",
      what: "Membership enquiry, events, directory, research, advocacy — the five templates, bilingual, with the content model that links them (an event connects to its committee, topic, and research).",
      why: "These five journeys ARE the website for 90% of visitors. Depth elsewhere can wait; these cannot.",
      unlocks: "The measurable core — enquiries, registrations, research reads."
    },
    {
      id: 4,
      icon: Rocket,
      title: "Step 4 — Verify, train, launch",
      timeline: "Weeks 9–12",
      what: "Accessibility check, editor training, rehearsed launch with a rollback plan.",
      why: "A site the team cannot confidently update decays within months. Launch is an operational event, not just a technical one.",
      unlocks: "A site that stays good because the team owns it."
    },
    {
      id: 5,
      icon: LineChart,
      title: "Step 5 — Measure, then decide what else",
      timeline: "30 & 90 days after launch",
      what: <span>Review enquiry and registration numbers against the Step-1 baseline; only then consider extras (dashboards, personalisation, AI features). Note: The <a href="/platform" className="text-primary underline">Member Platform</a> is the concrete post-launch horizon.</span>,
      why: "Features added before evidence tend to serve internal wishes, not visitors. The first 90 days of data tells us what is actually worth building next.",
      unlocks: "A backlog driven by evidence, with every future feature able to point to the number it should move."
    }
  ];

  return (
    <BlueprintLayout title={t('blueprint.nav.roadmap')}>
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl font-serif font-bold mb-6">The Roadmap</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A redesign is not just a visual update; it is an operational shift. 
            Here is the five-step plan where every phase argues for its own existence.
          </p>
        </div>

        <div className="space-y-12 mb-20 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-primary/20 before:to-transparent">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10">
                  <span className="font-bold">{step.id}</span>
                </div>
                
                {/* Content Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] ml-auto md:ml-0 bg-card border border-border p-6 md:p-8 rounded-sm shadow-sm group-hover:border-primary/40 group-hover:shadow-md transition-all">
                  
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">{step.timeline}</span>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-serif font-bold mb-6">{step.title}</h3>
                  
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">What</h4>
                      <p className="text-foreground leading-relaxed text-sm md:text-base">{step.what}</p>
                    </div>
                    
                    <div className="bg-primary/5 border-l-2 border-primary pl-4 py-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Why</h4>
                      <p className="text-foreground font-medium leading-relaxed text-sm md:text-base">{step.why}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Unlocks</h4>
                      <p className="text-foreground font-bold text-sm md:text-base">{step.unlocks}</p>
                    </div>
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>

      </div>
    </BlueprintLayout>
  );
}
