import React from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { mockEvents, mockInsights, mockMembers, mockNews } from '@/data/mock';
import { FileText, Newspaper, Calendar, Building, Search as SearchIcon, ArrowRight } from 'lucide-react';

export default function SearchPage() {
  const { t, lang } = useI18n();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const q = params.get('q') || '';
  const query = q.toLowerCase().trim();

  // Search execution
  const results = {
    news: [] as any[],
    events: [] as any[],
    insights: [] as any[],
    members: [] as any[],
    pages: [] as any[]
  };

  if (query) {
    // 1. News
    results.news = mockNews.filter(n => 
      n.title.toLowerCase().includes(query) || 
      n.titleSr.toLowerCase().includes(query) ||
      n.summary.toLowerCase().includes(query) ||
      n.summarySr.toLowerCase().includes(query)
    ).map(n => ({
      id: n.id,
      title: lang === 'en' ? n.title : n.titleSr,
      desc: lang === 'en' ? n.summary : n.summarySr,
      href: `/news/${n.id}`,
      typeLabel: t('search.type_news'),
      icon: Newspaper
    }));

    // 2. Events
    results.events = mockEvents.filter(e => 
      e.title.toLowerCase().includes(query) || 
      e.titleSr.toLowerCase().includes(query) ||
      e.topic.toLowerCase().includes(query) ||
      (e.topicSr && e.topicSr.toLowerCase().includes(query))
    ).map(e => ({
      id: e.id,
      title: lang === 'en' ? e.title : e.titleSr,
      desc: `${lang === 'en' ? e.topic : e.topicSr} • ${new Date(e.date).toLocaleDateString()}`,
      href: `/events/${e.id}`,
      typeLabel: t('search.type_events'),
      icon: Calendar
    }));

    // 3. Insights
    results.insights = mockInsights.filter(i => 
      i.title.toLowerCase().includes(query) || 
      i.titleSr.toLowerCase().includes(query) ||
      i.summary.toLowerCase().includes(query)
    ).map(i => ({
      id: i.id,
      title: lang === 'en' ? i.title : i.titleSr,
      desc: lang === 'en' ? i.summary : i.summarySr,
      href: `/insights/${i.id}`,
      typeLabel: t('search.type_insights'),
      icon: FileText
    }));

    // 4. Members
    results.members = mockMembers.filter(m => 
      m.name.toLowerCase().includes(query) || 
      m.summary.toLowerCase().includes(query) ||
      m.summarySr.toLowerCase().includes(query) ||
      m.sector.toLowerCase().includes(query) ||
      m.sectorSr.toLowerCase().includes(query)
    ).map(m => ({
      id: m.id,
      title: m.name,
      desc: `${m.category} • ${m.sector}`,
      href: `/members/${m.id}`,
      typeLabel: t('search.type_members'),
      icon: Building
    }));

    // 5. Static Pages (Manual mappings)
    const pages = [
      { href: '/membership', title: t('nav.membership'), keys: ['membership', 'članstvo', 'join', 'pridruži'] },
      { href: '/advocacy', title: t('nav.advocacy'), keys: ['advocacy', 'zastupanje', 'policy', 'odbori', 'committees'] },
      { href: '/about', title: t('nav.about'), keys: ['about', 'o nama', 'team', 'tim', 'board', 'kancelarija'] },
      { href: '/blueprint', title: t('nav.blueprint'), keys: ['blueprint', 'nacrt', 'design', 'dizajn'] }
    ];

    results.pages = pages.filter(p => 
      p.title.toLowerCase().includes(query) || p.keys.some(k => k.includes(query))
    ).map(p => ({
      id: p.href,
      title: p.title,
      desc: `AmCham Serbia - ${p.title}`,
      href: p.href,
      typeLabel: t('search.type_pages'),
      icon: FileText
    }));
  }

  const totalResults = Object.values(results).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="w-full bg-background min-h-[calc(100vh-80px)] pb-24">
      <SEO title={`${t('search.title')}${q ? ` - ${q}` : ''}`} description="Search results" />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-16 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">{t('search.title')}</h1>
          {q && <p className="text-xl text-white/80">"{q}" ({totalResults})</p>}
        </div>
      </section>

      {/* Results */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          
          {!q ? (
            <div className="text-center py-20 border border-dashed border-border rounded-sm bg-background">
              <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-xl font-medium text-muted-foreground">Enter a search term above.</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-20 border border-border rounded-sm bg-white shadow-sm">
              <SearchIcon className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-serif font-bold mb-4">{t('search.zero')} "{q}"</h2>
              
              <div className="max-w-md mx-auto mt-8 text-left">
                <p className="text-muted-foreground mb-4 font-medium">{t('search.zero_help')}</p>
                <div className="space-y-3">
                  <Link href="/membership" className="flex items-center justify-between p-3 border border-border rounded-sm hover:border-primary hover:text-primary transition-colors">
                    <span className="font-bold">{t('nav.membership')}</span> <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/events" className="flex items-center justify-between p-3 border border-border rounded-sm hover:border-primary hover:text-primary transition-colors">
                    <span className="font-bold">{t('nav.events')}</span> <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/members" className="flex items-center justify-between p-3 border border-border rounded-sm hover:border-primary hover:text-primary transition-colors bg-primary/5">
                    <span className="font-bold">{t('search.members_dir')}</span> <ArrowRight className="w-4 h-4 text-primary" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(results).map(([key, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <h3 className="font-serif font-bold text-xl mb-4 border-b border-border pb-2 flex items-center justify-between">
                      {items[0].typeLabel} 
                      <span className="text-sm font-sans bg-secondary/10 text-secondary px-2 py-0.5 rounded-sm">{items.length}</span>
                    </h3>
                    <div className="space-y-4">
                      {items.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <Link key={i} href={item.href} className="flex gap-4 p-4 border border-border rounded-sm bg-white hover:border-primary/50 hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 shrink-0 bg-background border border-border rounded-sm flex items-center justify-center group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-lg mb-1">{item.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
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
