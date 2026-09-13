import React from 'react';
import { Link, useSearch, useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { mockInsights } from '@/data/mock';
import { FileText, Download, BarChart2, Lightbulb } from 'lucide-react';

export default function Insights() {
  const { t, lang } = useI18n();
  const searchString = useSearch();
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(searchString);

  const typeFilter = params.get('topic') || 'all';
  const yearFilter = params.get('year') || 'all';

  const updateFilters = (updates: { topic?: string, year?: string }) => {
    const p = new URLSearchParams(searchString);
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== 'all') {
        p.set(k, v);
      } else {
        p.delete(k);
      }
    });
    navigate(location + '?' + p.toString(), { replace: true });
  };

  const types = Array.from(new Set(mockInsights.map(i => lang === 'sr' ? i.typeSr : i.type)));
  const years = Array.from(new Set(mockInsights.map(i => i.year))).sort((a, b) => b - a);

  const filteredInsights = mockInsights.filter(insight => {
    const type = lang === 'sr' ? insight.typeSr : insight.type;
    const matchesType = typeFilter === 'all' || type === typeFilter;
    const matchesYear = yearFilter === 'all' || insight.year.toString() === yearFilter;
    return matchesType && matchesYear;
  });

  const getIconForType = (type: string) => {
    if (type.includes('Survey') || type.includes('Istraživanje')) return <BarChart2 className="w-6 h-6 text-primary" />;
    if (type.includes('Policy') || type.includes('politike')) return <Lightbulb className="w-6 h-6 text-primary" />;
    return <FileText className="w-6 h-6 text-primary" />;
  };

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('insights.title')} description={t('insights.subtitle')} />
      
      <section className="bg-secondary text-secondary-foreground py-16 border-b border-border/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t('insights.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('insights.subtitle')}
          </p>
        </div>
      </section>

      <section className="bg-white border-b border-border sticky top-20 z-40 shadow-sm">
        <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-4 w-full md:w-auto">
            <select 
              value={typeFilter}
              onChange={(e) => updateFilters({ topic: e.target.value })}
              className="border border-border p-2 rounded-sm bg-background focus:outline-none focus:border-primary text-sm flex-1 md:w-48"
            >
              <option value="all">{t('insights.all_formats')}</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select 
              value={yearFilter}
              onChange={(e) => updateFilters({ year: e.target.value })}
              className="border border-border p-2 rounded-sm bg-background focus:outline-none focus:border-primary text-sm flex-1 md:w-32"
            >
              <option value="all">{t('insights.all_years')}</option>
              {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="pt-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredInsights.map(insight => {
              const title = lang === 'sr' ? insight.titleSr : insight.title;
              const summary = lang === 'sr' ? insight.summarySr : insight.summary;
              const type = lang === 'sr' ? insight.typeSr : insight.type;
              
              return (
                <div key={insight.id} className="bg-white border border-border rounded-sm overflow-hidden group hover:shadow-lg transition-all flex flex-col">
                  <div className="p-8 flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-primary/5 rounded-sm flex items-center justify-center">
                        {getIconForType(type)}
                      </div>
                      <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
                        {insight.year}
                      </span>
                    </div>
                    
                    <span className="text-xs font-bold px-2 py-1 bg-background border border-border rounded-sm text-foreground mb-4 inline-block">
                      {type}
                    </span>
                    
                    <Link href={`/insights/${insight.id}`}>
                      <h3 className="text-2xl font-serif font-bold mb-4 group-hover:text-primary transition-colors cursor-pointer">
                        {title}
                      </h3>
                    </Link>
                    
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6">
                      {summary}
                    </p>
                  </div>
                  
                  <div className="bg-background px-8 py-4 border-t border-border flex justify-between items-center">
                    <Link href={`/insights/${insight.id}`} className="text-sm font-bold hover:text-primary transition-colors">
                      {t('insights.read_summary')}
                    </Link>
                    {insight.fileSize && (
                      <button className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                        <Download className="w-4 h-4" /> PDF ({insight.fileSize})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
