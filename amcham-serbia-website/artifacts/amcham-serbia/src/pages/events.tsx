import React from 'react';
import { Link, useSearch, useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { mockEvents } from '@/data/mock';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

export default function Events() {
  const { t, lang } = useI18n();
  const searchString = useSearch();
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(searchString);
  
  const filter = (params.get('tab') as 'upcoming' | 'past') || 'upcoming';
  const topicFilter = params.get('topic') || 'all';

  const updateFilters = (updates: { tab?: string, topic?: string }) => {
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

  const now = new Date();
  
  const filteredEvents = mockEvents.filter(event => {
    const isPast = new Date(event.date) < now || event.status === 'past';
    const matchesTime = filter === 'upcoming' ? !isPast : isPast;
    const topic = lang === 'sr' ? event.topicSr : event.topic;
    const matchesTopic = topicFilter === 'all' || topic === topicFilter;
    return matchesTime && matchesTopic;
  });

  const topics = Array.from(new Set(mockEvents.map(e => lang === 'sr' ? e.topicSr : e.topic)));

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open': return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase rounded-sm">{t('events.status.open')}</span>;
      case 'full': return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-bold uppercase rounded-sm">{t('events.status.full')}</span>;
      case 'past': return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold uppercase rounded-sm">{t('events.status.past')}</span>;
      default: return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase rounded-sm">{t('events.status.request_pending')}</span>;
    }
  };

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('events.title')} description={t('events.subtitle')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-16 border-b border-border/10">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t('events.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('events.subtitle')}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border bg-white sticky top-20 z-40 shadow-sm">
        <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => updateFilters({ tab: 'upcoming' })}
              className={`px-4 py-2 text-sm font-bold rounded-sm transition-colors whitespace-nowrap ${filter === 'upcoming' ? 'bg-primary text-primary-foreground' : 'bg-background border border-border hover:border-primary/50 text-foreground'}`}
            >
              {t('events.upcoming')}
            </button>
            <button 
              onClick={() => updateFilters({ tab: 'past' })}
              className={`px-4 py-2 text-sm font-bold rounded-sm transition-colors whitespace-nowrap ${filter === 'past' ? 'bg-primary text-primary-foreground' : 'bg-background border border-border hover:border-primary/50 text-foreground'}`}
            >
              {t('events.past')}
            </button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{t('events.topic')}</span>
            <select 
              value={topicFilter}
              onChange={(e) => updateFilters({ topic: e.target.value })}
              className="border border-border p-2 rounded-sm text-sm focus:outline-none focus:border-primary bg-background w-full md:w-auto"
            >
              <option value="all">{t('events.all_topics')}</option>
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
          {filteredEvents.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border/50 rounded-sm bg-white">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold font-serif mb-2">{t('events.no_results')}</h3>
              <p className="text-muted-foreground">{t('events.no_results_desc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredEvents.map(event => {
                const title = lang === 'sr' ? event.titleSr : event.title;
                const topic = lang === 'sr' ? event.topicSr : event.topic;
                const dateObj = new Date(event.date);
                
                return (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <div className="group bg-white border border-border hover:border-primary/50 p-6 md:p-8 rounded-sm shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 md:gap-12 items-start md:items-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-primary transition-colors"></div>
                      
                      {/* Date Box */}
                      <div className="flex flex-col items-center justify-center bg-background border border-border rounded-sm w-24 h-24 shrink-0 group-hover:border-primary/30 transition-colors">
                        <span className="text-sm font-bold text-primary uppercase">{dateObj.toLocaleString(lang === 'sr' ? 'sr-RS' : 'en-US', { month: 'short' })}</span>
                        <span className="text-3xl font-serif font-bold text-foreground leading-none">{dateObj.getDate()}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          {getStatusBadge(event.status)}
                          <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">{topic}</span>
                        </div>
                        <h3 className="text-2xl font-serif font-bold mb-2 group-hover:text-primary transition-colors truncate">{title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/> {event.venue}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {event.audience}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end mt-4 md:mt-0 w-full md:w-auto">
                        <span className="w-full md:w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all text-sm font-bold md:text-transparent">
                          <span className="md:hidden flex-1 text-center mr-2">{t('common.read_more')}</span>
                          <ArrowRight className="w-5 h-5 shrink-0" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
