import React from 'react';
import { BlueprintLayout } from '@/components/blueprint-layout';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { Target, Flag, PenTool, Rocket, LineChart } from 'lucide-react';

export default function BlueprintRoadmap() {
  const { t } = useI18n();

  const steps = [
    {
      id: 1,
      icon: Target,
      title: "Step 1 — Quick wins",
      timeline: "Weeks 1–2",
      what: "Fill the events calendar, point the “new Board members” button to the right page, update the Digital Economy Committee page (it still says 2023–2025), and add a privacy notice with a cookie choice.",
      why: "Small things that are quick to put right and make a visible difference straight away, while the redesign is prepared.",
      unlocks: "A clean starting point to measure the redesign against."
    },
    {
      id: 2,
      icon: Flag,
      title: "Step 2 — Try the direction with members",
      timeline: "Weeks 3–4",
      what: "Five prototype pages (the ones on this site), tested with real members and prospective members on the five journeys.",
      why: "Watching a few members try the pages settles most design questions quickly. One round of testing now saves months of revisions later.",
      unlocks: "An agreed direction everyone has already seen working."
    },
    {
      id: 3,
      icon: PenTool,
      title: "Step 3 — Rebuild the core journeys",
      timeline: "Weeks 5–8",
      what: "Membership enquiry, events, directory, research, advocacy — the five templates, bilingual, with the content model that links them (an event connects to its committee, topic, and research).",
      why: "These five journeys are what most visitors come for. The rest of the site can follow; these come first.",
      unlocks: "The measurable core — enquiries, registrations, research reads."
    },
    {
      id: 4,
      icon: Rocket,
      title: "Step 4 — Verify, train, launch",
      timeline: "Weeks 9–12",
      what: "Accessibility check, editor training, rehearsed launch with a rollback plan.",
      why: "A site stays good when the team can update it with confidence, so training and a calm launch matter as much as the build.",
      unlocks: "A site that stays good because the team owns it."
    },
    {
      id: 5,
      icon: LineChart,
      title: "Step 5 — Measure, then switch on the platform",
      timeline: "30 & 90 days after launch",
      what: <span>Compare enquiries and registrations with the Step 1 starting point, and use the numbers to decide which <Link href="/platform" className="text-primary underline">platform</Link> features to switch on first, starting with the ones that save the team the most time.</span>,
      why: "The first 90 days of real use show what members and staff need most, so each next step can point to the difference it should make.",
      unlocks: "A clear order for what comes next, based on how the site is actually used."
    }
  ];

  return (
    <BlueprintLayout title={t('blueprint.nav.roadmap')}>
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl font-serif font-bold mb-6">The Roadmap</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Five steps, each with a reason and what it makes possible.
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
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] ml-auto md:ml-0 bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm group-hover:border-primary/40 group-hover:shadow-md transition-all">
                  
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
