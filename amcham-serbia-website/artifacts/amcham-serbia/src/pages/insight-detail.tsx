import React from 'react';
import { useRoute, Link } from 'wouter';
import { mockInsights } from '@/data/mock';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { ArrowLeft, Download, FileText, ChevronRight } from 'lucide-react';

export default function InsightDetail() {
  const [, params] = useRoute('/insights/:id');
  const { lang, t } = useI18n();
  
  const insight = mockInsights.find(i => i.id === params?.id);

  if (!insight) {
    return <div className="p-24 text-center">{t('common.no_results')}</div>;
  }

  const title = lang === 'sr' ? insight.titleSr : insight.title;
  const summary = lang === 'sr' ? insight.summarySr : insight.summary;
  const type = lang === 'sr' ? insight.typeSr : insight.type;
  const methodology = lang === 'sr' ? insight.methodologySr : insight.methodology;

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={title} description={summary} />
      
      {/* Hero */}
      <section className="bg-secondary text-secondary-foreground pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src={`${import.meta.env.BASE_URL}images/research-documents.jpg`} 
            alt="Research Background" 
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-secondary-foreground mb-12 text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('insights.detail.back')}
          </Link>
          
          <div className="flex gap-3 mb-6">
            <span className="px-3 py-1 bg-secondary-foreground text-secondary text-xs font-bold uppercase rounded-sm tracking-wider">{type}</span>
            <span className="px-3 py-1 bg-transparent border border-secondary-foreground/20 text-secondary-foreground text-xs font-bold uppercase rounded-sm">{insight.year}</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 max-w-4xl leading-tight text-balance">{title}</h1>
          <p className="text-lg md:text-xl text-secondary-foreground/80 max-w-3xl leading-relaxed">
            {summary}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 md:px-8 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            {/* Key Findings */}
            <div className="bg-card border border-border p-8 md:p-12 shadow-xl rounded-sm">
              <h2 className="text-2xl font-serif font-bold mb-8">{t('insights.detail.key_findings')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {insight.keyFindings.map((finding, i) => (
                  <div key={i} className="flex flex-col border-l-4 border-primary pl-6">
                    <span className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-2">{finding.metric}</span>
                    <span className="text-sm font-medium text-muted-foreground leading-relaxed">{lang === 'sr' ? finding.descriptionSr : finding.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Methodology */}
            <div className="bg-card border border-border p-8 rounded-sm shadow-sm">
              <h3 className="text-lg font-serif font-bold mb-3 flex items-center gap-2">
                 {t('insights.detail.methodology')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {methodology}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-card border border-border p-8 rounded-sm sticky top-24 shadow-sm">
              <h3 className="font-bold text-lg mb-6 border-b border-border pb-4">{t('insights.detail.download_report')}</h3>
              
              <button className="w-full bg-primary text-primary-foreground py-4 rounded-sm font-bold flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 mb-4">
                <Download className="w-5 h-5" /> {t('insights.detail.full_pdf')}
              </button>
              
              <div className="flex justify-between items-center text-xs text-muted-foreground px-2">
                <span>{t('insights.detail.file_size')}: {insight.fileSize || 'Unknown'}</span>
                <span>{t('insights.detail.language')}: EN / SR</span>
              </div>
              
              <div className="mt-8 pt-8 border-t border-border">
                <h4 className="font-bold text-sm mb-4">{t('insights.detail.related')}</h4>
                <div className="space-y-4">
                  <Link href="/events" className="group flex flex-col hover:bg-background p-3 -mx-3 rounded-sm transition-colors">
                    <span className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Event</span>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors flex items-center gap-1">Presentation of Results <ChevronRight className="w-4 h-4"/></span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
