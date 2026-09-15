import React from 'react';
import { useRoute, Link } from 'wouter';
import { mockMembers } from '@/data/mock';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { ArrowLeft, Globe, Building2, Info, Calendar } from 'lucide-react';

export default function MemberDetail() {
  const [, params] = useRoute('/members/:id');
  const { lang, t } = useI18n();
  
  const member = mockMembers.find(m => m.id === params?.id);

  if (!member) {
    return <div className="p-24 text-center">{t('common.no_results')}</div>;
  }

  const sector = lang === 'sr' ? member.sectorSr : member.sector;
  const summary = lang === 'sr' ? member.summarySr : member.summary;

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={member.name} description={summary} />
      
      {/* Header/Cover */}
      <div className="h-48 md:h-64 bg-secondary w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
      </div>
      
      <div className="container mx-auto px-4 md:px-8 relative -mt-24 md:-mt-32">
        
        <Link href="/members" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-white mb-6 text-white/80 transition-colors relative z-20">
          <ArrowLeft className="w-4 h-4" /> {t('members.detail.back')}
        </Link>
        
        <div className="bg-white border border-border rounded-sm shadow-xl p-8 md:p-12 mb-8 relative z-10 flex flex-col md:flex-row gap-8 items-start">
          
          <div className="w-32 h-32 md:w-48 md:h-48 bg-background border border-border shadow-sm flex items-center justify-center shrink-0 -mt-20 md:-mt-24 bg-white">
            <span className="text-5xl md:text-7xl font-serif font-bold text-primary">{member.name.charAt(0)}</span>
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase rounded-sm">{member.category} Member</span>
              <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-1"><Building2 className="w-3 h-3"/> {sector}</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6">{member.name}</h1>
            
            <div className="flex items-center gap-4 border-t border-border pt-6">
              <a href={member.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold bg-background border border-border px-4 py-2 hover:border-primary hover:text-primary transition-all rounded-sm">
                <Globe className="w-4 h-4" /> {t('members.detail.website')}
              </a>
            </div>
          </div>
          
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-border p-8 rounded-sm shadow-sm">
              <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" /> {t('members.detail.about')}
              </h2>
              <p className="text-foreground leading-relaxed text-lg">
                {summary}
              </p>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-border p-6 rounded-sm shadow-sm sticky top-24">
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4">{t('members.detail.details')}</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">{t('members.detail.category')}</span>
                  <span className="font-bold">{member.category}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">{t('members.detail.sector')}</span>
                  <span className="font-bold text-right">{sector}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">{t('members.detail.updated')}</span>
                  <span className="font-medium flex items-center gap-1 text-xs"><Calendar className="w-3 h-3"/> {new Date(member.reviewDate).toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
