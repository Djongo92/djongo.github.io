import React from 'react';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { Shield, TrendingUp, Users, Scale, Laptop, HeartPulse, Sprout, Building2, Globe, FileText, Briefcase, CheckCircle2, Crown } from 'lucide-react';
import { Link } from 'wouter';
import { policyWins } from '@/data/mock';
import { committeeRosters, platformData } from '@/data/platform';

const COMMITTEE_ICONS: Record<string, any> = {
  "Digital Economy": Laptop,
  "Health Care": HeartPulse,
  "Tax & Finance": TrendingUp,
  "Labor & HR": Users,
  "Real Estate & Construction": Building2,
  "ESG & Environment": Sprout,
  "Compliance & Ethics": Shield,
  "Trade & Customs": Scale
};

export default function Advocacy() {
  const { t, lang } = useI18n();

  const committees = committeeRosters.map(c => {
    const chair = platformData.allMembers.find(m => m.id === c.chairCompanyId);
    const memberNames = c.memberCompanyIds.map(id => platformData.allMembers.find(m => m.id === id)?.name).filter(Boolean) as string[];
    return { name: c.name, nameSr: c.nameSr, icon: COMMITTEE_ICONS[c.name] || Globe, chairName: chair?.name, memberNames, size: 1 + c.memberCompanyIds.length };
  });

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('advocacy.title')} description={t('advocacy.subtitle')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-20 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">{t('advocacy.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('advocacy.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 -mt-16 relative z-20">
        <div className="container mx-auto px-4 md:px-8">
          
          <div className="bg-white border border-border p-8 md:p-12 shadow-xl rounded-sm mb-16">
            <h2 className="text-3xl font-serif font-bold mb-8">{t('advocacy.approach')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col border-l-2 border-primary/20 pl-6 hover:border-primary transition-colors duration-300">
                <div className="w-12 h-12 bg-background border border-border rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t('advocacy.approach_1_title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('advocacy.approach_1_desc')}
                </p>
              </div>
              <div className="flex flex-col border-l-2 border-primary/20 pl-6 hover:border-primary transition-colors duration-300">
                <div className="w-12 h-12 bg-background border border-border rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t('advocacy.approach_2_title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('advocacy.approach_2_desc')}
                </p>
              </div>
              <div className="flex flex-col border-l-2 border-primary/20 pl-6 hover:border-primary transition-colors duration-300">
                <div className="w-12 h-12 bg-background border border-border rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t('advocacy.approach_3_title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('advocacy.approach_3_desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-serif font-bold mb-6">{t('advocacy.track_record')}</h2>
            <p className="text-muted-foreground mb-12 max-w-3xl text-lg">
              {t('advocacy.track_record_desc')}
            </p>

            <div className="relative border-l-2 border-primary/20 ml-3 space-y-10">
              {policyWins.map((win) => (
                <div key={win.id} className="relative pl-10">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-background shadow"></div>
                  <div className="bg-white border border-border p-6 rounded-sm shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="flex flex-wrap items-center gap-3 mb-3 text-xs font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">
                        {new Date(win.date).toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'en-US', { month: 'short', year: 'numeric' })}
                      </span>
                      <span className="w-1 h-1 bg-border rounded-full"></span>
                      <span className="text-primary">{lang === 'sr' ? win.committeeSr : win.committee}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      {lang === 'sr' ? win.titleSr : win.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed pl-7">
                      {lang === 'sr' ? win.outcomeSr : win.outcome}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-serif font-bold mb-6">{t('advocacy.committees')}</h2>
            <p className="text-muted-foreground mb-12 max-w-3xl text-lg">
              {t('advocacy.committees_desc')}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {committees.map((committee, i) => {
                const Icon = committee.icon;
                return (
                  <div key={i} className="bg-white border border-border p-6 rounded-sm hover:border-primary/50 hover:shadow-md transition-all group flex flex-col items-start h-full">
                    <div className="w-12 h-12 bg-primary/5 rounded-sm flex items-center justify-center mb-6 group-hover:bg-primary transition-colors text-primary group-hover:text-primary-foreground">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{lang === 'sr' ? committee.nameSr : committee.name}</h3>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Crown className="w-3 h-3 text-primary" /> {t('advocacy.chaired_by')} {committee.chairName}
                    </div>
                    {committee.memberNames.length > 0 && (
                      <p className="text-xs text-muted-foreground/80 leading-relaxed">{committee.memberNames.join(', ')}</p>
                    )}
                    <div className="mt-auto pt-4 w-full flex justify-between items-center text-sm border-t border-border/50">
                      <span className="text-muted-foreground">{committee.size} {t('advocacy.member_companies')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-8 md:p-12 rounded-sm text-center relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <h3 className="text-3xl font-serif font-bold mb-6">{t('advocacy.cta_title')}</h3>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('advocacy.cta_desc')}
            </p>
            <Link href="/membership" className="inline-flex bg-primary text-primary-foreground px-10 py-4 rounded-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-lg">
              {t('advocacy.cta_btn')}
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
