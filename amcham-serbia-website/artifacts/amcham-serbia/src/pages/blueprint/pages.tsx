import React from 'react';
import { BlueprintLayout } from '@/components/blueprint-layout';
import { useI18n } from '@/lib/i18n';
import { Link } from 'wouter';
import { ExternalLink, CheckCircle, Target } from 'lucide-react';

export default function BlueprintPages() {
  const { t } = useI18n();

  const testJourneys = [
    {
      id: "T1",
      name: "Homepage",
      path: "/",
      description: "One proposition and restrained network motif; primary membership action + secondary events action; three intent routes (connect / participate / understand); current research, events and advocacy as dated, maintained cards; no carousel."
    },
    {
      id: "T2",
      name: "Membership",
      path: "/membership",
      description: "Preparation checklist (eligibility, categories, fee basis, approval); \"Discuss membership\" short enquiry distinct from full application; benefits as actions with examples and restrictions; three-step explanation with owner-confirmed timings."
    },
    {
      id: "T3",
      name: "Event detail",
      path: "/events/evt-01",
      description: "Date, timezone, venue, eligibility and price rule visible together; action label reflects capacity/approval (confirmed, pending, full, cancelled are distinct states); programme + takeaways; calendar export and help contact."
    },
    {
      id: "T4",
      name: "Member directory",
      path: "/members",
      description: "Name search with shareable URL state and result counts; sector and category filters with reset; standard cards → profiles with approved public information; no personal contacts exposed by default."
    },
    {
      id: "T5",
      name: "Research detail",
      path: "/insights/ins-01",
      description: "One edition owns summary, methodology and downloads; reading findings vs downloading are distinct actions with descriptive file labels (size, language, format); verified findings with units, sample, dates; fieldwork dates easy to find."
    }
  ];

  const supportingPages = [
    {
      id: "S1",
      name: "Events listing",
      path: "/events",
      description: "Upcoming vs past clearly separated; eligibility, date and timezone visible BEFORE clicking through; capacity states (open / pending / full) honest on the card itself."
    },
    {
      id: "S2",
      name: "Insights listing",
      path: "/insights",
      description: "The research hub: filter by topic and year; every edition clearly dated; reading findings online vs downloading the report are visibly distinct actions."
    },
    {
      id: "S3",
      name: "News listing",
      path: "/news",
      description: "Dated, topic-tagged, current; this page is the proof the chamber is active; full Serbian/English parity."
    },
    {
      id: "S4",
      name: "Advocacy",
      path: "/advocacy",
      description: "Current priorities in plain language; committees with a visible participation contact; dated positions; chamber positions visually separated from member opinions."
    },
    {
      id: "S5",
      name: "About",
      path: "/about",
      description: "Mission, governance, and the real executive team with names and roles; contact routes obvious; this page answers 'who runs this place'."
    },
    {
      id: "S6",
      name: "Member detail",
      path: "/members/hmo",
      description: "Consistent public profile: sector, description, approved public contacts only; no personal details exposed by default."
    },
    {
      id: "S7",
      name: "News detail",
      path: "/news/news-01",
      description: "Absolute date, topic tag, related items; press-release hygiene."
    }
  ];

  const renderPageCard = (page: any, isTestJourney: boolean) => (
    <div key={page.id} className="bg-white border border-border rounded-sm shadow-xl overflow-hidden flex flex-col md:flex-row group">
      <div className="bg-secondary text-secondary-foreground p-8 md:p-12 md:w-1/3 shrink-0 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white font-serif font-bold text-xl">
              {page.id}
            </div>
            {isTestJourney && (
              <div className="bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                <Target className="w-3.5 h-3.5" />
                Test journey
              </div>
            )}
          </div>
          <h3 className="text-2xl font-serif font-bold mb-2">{page.name}</h3>
          <code className="text-accent text-sm bg-accent/10 px-2 py-1 rounded-sm block w-max">{page.path}</code>
        </div>
        
        <div className="mt-12 relative z-10">
          <Link href={page.path} className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-6 py-3 rounded-sm font-bold hover:bg-primary/90 transition-all shadow-lg group-hover:scale-105">
            View live prototype <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="p-8 md:p-12 md:w-2/3">
        <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-widest mb-6">Implemented Capabilities</h4>
        <ul className="space-y-4">
          {page.description.split('; ').map((req: string, idx: number) => (
            <li key={idx} className="flex gap-4 items-start">
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground text-lg leading-relaxed">{req.trim()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <BlueprintLayout title={t('blueprint.nav.pages')}>
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="max-w-3xl mb-12">
          <h2 className="text-3xl font-serif font-bold mb-6">{t('blueprint.pages_title')}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t('blueprint.pages_subtitle')}
          </p>
        </div>

        <div className="space-y-12 mb-20">
          {testJourneys.map(page => renderPageCard(page, true))}
        </div>

        <div className="max-w-3xl mb-12 border-t border-border pt-16">
          <h2 className="text-3xl font-serif font-bold mb-6">Supporting Pages</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            These pages support the core journeys, completing the informational architecture of the site. They are built to the exact same standard of clarity and accessibility.
          </p>
        </div>

        <div className="space-y-12 mb-20">
          {supportingPages.map(page => renderPageCard(page, false))}
        </div>

      </div>
    </BlueprintLayout>
  );
}
