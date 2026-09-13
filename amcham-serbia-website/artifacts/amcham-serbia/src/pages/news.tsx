import React from 'react';
import { Link, useSearch, useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { mockNews } from '@/data/mock';
import { Newspaper, ArrowRight } from 'lucide-react';

export default function News() {
  const { t, lang } = useI18n();
  const searchString = useSearch();
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(searchString);
  
  const topicFilter = params.get('topic') || 'all';

  const updateFilters = (updates: { topic?: string }) => {
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

  const topics = Array.from(new Set(mockNews.map(n => lang === 'sr' ? n.topicSr : n.topic)));

  const filteredNews = mockNews.filter(news => {
    const topic = lang === 'sr' ? news.topicSr : news.topic;
    return topicFilter === 'all' || topic === topicFilter;
  });

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('news.title')} description={t('news.subtitle')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-16 border-b border-border/10">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t('news.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('news.subtitle')}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-border sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row gap-4 justify-end items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm font-semibold text-muted-foreground">{t('events.topic')}</span>
            <select 
              value={topicFilter}
              onChange={(e) => updateFilters({ topic: e.target.value })}
              className="border border-border p-2 rounded-sm text-sm focus:outline-none focus:border-primary bg-background"
            >
              <option value="all">{t('news.all_topics')}</option>
              {topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="pt-12">
        <div className="container mx-auto px-4 md:px-8">
          {filteredNews.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border/50 rounded-sm bg-white">
              <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold font-serif mb-2">{t('common.no_results')}</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredNews.map(news => {
                const title = lang === 'sr' ? news.titleSr : news.title;
                const summary = lang === 'sr' ? news.summarySr : news.summary;
                const topic = lang === 'sr' ? news.topicSr : news.topic;
                
                return (
                  <div key={news.id} className="bg-white border border-border rounded-sm hover:shadow-lg hover:border-primary/50 transition-all flex flex-col h-full group">
                    <div className="p-6 md:p-8 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold px-2 py-1 bg-background border border-border rounded-sm text-muted-foreground uppercase tracking-wider">
                          {topic}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                          {new Date(news.date).toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <Link href={`/news/${news.id}`}>
                        <h3 className="text-xl font-serif font-bold mb-4 group-hover:text-primary transition-colors cursor-pointer line-clamp-3">
                          {title}
                        </h3>
                      </Link>
                      
                      <p className="text-muted-foreground text-sm line-clamp-4 flex-1">
                        {summary}
                      </p>
                    </div>
                    
                    <div className="px-6 md:px-8 py-4 border-t border-border bg-background/50">
                      <Link href={`/news/${news.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 w-max">
                        {t('common.read_more')} <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
