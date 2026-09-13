import React from 'react';
import { useRoute } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { mockEvents } from '@/data/mock';
import { Calendar, MapPin, Clock, Users, ArrowLeft, Download } from 'lucide-react';
import { Link } from 'wouter';

export default function EventDetail() {
  const [, params] = useRoute('/events/:id');
  const { t, lang } = useI18n();
  
  const event = mockEvents.find(e => e.id === params?.id);
  
  if (!event) {
    return <div className="p-24 text-center">{t('common.no_results')}</div>;
  }

  const title = lang === 'sr' ? event.titleSr : event.title;
  const topic = lang === 'sr' ? event.topicSr : event.topic;
  const dateObj = new Date(event.date);
  
  const isPast = dateObj < new Date() || event.status === 'past';

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={title} description={event.venue} />
      
      {/* Hero */}
      <section className="bg-secondary text-secondary-foreground pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-white mb-12 text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('events.detail.back')}
          </Link>
          
          <div className="flex gap-3 mb-6">
            <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase rounded-sm tracking-wider">{topic}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-8 max-w-4xl leading-tight">{title}</h1>
          
          <div className="flex flex-wrap gap-6 md:gap-10 text-sm md:text-base text-secondary-foreground/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              <span>{dateObj.toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <span>{dateObj.toLocaleTimeString(lang === 'sr' ? 'sr-RS' : 'en-US', { hour: '2-digit', minute: '2-digit' })} {event.timezone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              <span>{event.venue}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-8 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-8 bg-white border border-border p-8 md:p-12 shadow-xl rounded-sm">
            <h2 className="text-2xl font-serif font-bold mb-6 border-b border-border pb-4">{t('events.detail.agenda')}</h2>
            <div className="space-y-6 mb-12">
              {event.agenda.map((item, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-2 md:gap-6 border-l-2 border-primary/20 pl-4">
                  <div className="text-sm font-bold text-muted-foreground w-32 shrink-0">{item.time}</div>
                  <div className="text-foreground font-medium">{lang === 'sr' ? item.descriptionSr : item.description}</div>
                </div>
              ))}
            </div>

            {event.speakers && event.speakers.length > 0 && (
              <>
                <h2 className="text-2xl font-serif font-bold mb-6 border-b border-border pb-4">{t('events.detail.speakers')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {event.speakers.map((speaker, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-sm bg-background">
                      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white font-serif text-xl shrink-0">
                        {speaker.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{speaker.name}</h4>
                        <p className="text-xs text-muted-foreground">{lang === 'sr' ? speaker.titleSr : speaker.title}, {speaker.company}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sidebar CTA */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-border p-8 shadow-sm rounded-sm sticky top-24">
              <div className="mb-6 pb-6 border-b border-border space-y-4">
                <div>
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('events.detail.audience')}</span>
                  <div className="flex items-center gap-2 text-foreground font-medium"><Users className="w-4 h-4 text-primary"/> {event.audience}</div>
                </div>
                <div>
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t('events.detail.admission')}</span>
                  <div className="text-foreground font-medium">{event.priceRule}</div>
                </div>
              </div>

              {!isPast ? (
                <>
                  {event.status === 'open' ? (
                    <button className="w-full bg-primary text-primary-foreground py-4 rounded-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                      {t('events.detail.register')}
                    </button>
                  ) : event.status === 'full' ? (
                    <button disabled className="w-full bg-border text-muted-foreground py-4 rounded-sm font-bold cursor-not-allowed">
                      {t('events.detail.capacity_reached')}
                    </button>
                  ) : (
                    <button className="w-full bg-secondary text-secondary-foreground py-4 rounded-sm font-bold hover:bg-secondary/90 transition-colors">
                      {t('events.detail.request_invite')}
                    </button>
                  )}
                  <button className="w-full flex items-center justify-center gap-2 mt-4 text-sm font-bold text-foreground hover:text-primary transition-colors py-2">
                    <Calendar className="w-4 h-4"/> {t('events.detail.add_calendar')}
                  </button>
                </>
              ) : (
                <div className="text-center py-4 bg-background border border-border rounded-sm">
                  <span className="font-bold text-muted-foreground uppercase tracking-widest text-sm">{t('events.detail.concluded')}</span>
                </div>
              )}
            </div>
            
            {isPast && (
              <div className="bg-primary/5 border border-primary/20 p-6 rounded-sm">
                <h3 className="font-bold mb-2">{t('events.detail.materials')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('events.detail.materials_desc')}</p>
                <button className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                  <Download className="w-4 h-4"/> {t('events.detail.download')}
                </button>
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
