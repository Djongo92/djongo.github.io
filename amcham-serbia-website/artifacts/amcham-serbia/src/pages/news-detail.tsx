import React from 'react';
import { useRoute, Link } from 'wouter';
import { mockNews } from '@/data/mock';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';

export default function NewsDetail() {
  const [, params] = useRoute('/news/:id');
  const { lang, t } = useI18n();
  
  const news = mockNews.find(n => n.id === params?.id);

  if (!news) {
    return <div className="p-24 text-center">{t('common.no_results')}</div>;
  }

  const title = lang === 'sr' ? news.titleSr : news.title;
  const content = lang === 'sr' ? news.contentSr : news.content;
  const topic = lang === 'sr' ? news.topicSr : news.topic;

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={title} description={lang === 'sr' ? news.summarySr : news.summary} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground pt-12 pb-24">
        <div className="container mx-auto px-4 md:px-8">
          <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-secondary-foreground mb-12 text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('news.back')}
          </Link>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-8 max-w-4xl leading-tight text-balance">{title}</h1>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-secondary-foreground/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              <span>{new Date(news.date).toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-accent" />
              <span className="uppercase tracking-widest font-bold text-xs">{topic}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 md:px-8 -mt-12">
        <div className="bg-card border border-border p-8 md:p-16 shadow-xl rounded-sm max-w-4xl mx-auto">
          <div className="prose prose-stone prose-lg max-w-none text-foreground leading-relaxed">
            <p className="lead text-xl font-medium text-muted-foreground mb-8">
              {lang === 'sr' ? news.summarySr : news.summary}
            </p>
            {content.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
