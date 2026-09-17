import React, { useMemo } from 'react';
import { Link, useSearch, useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { mockMembers } from '@/data/mock';
import { Search, Building2, ExternalLink } from 'lucide-react';

export default function Members() {
  const { t, lang } = useI18n();
  const searchString = useSearch();
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(searchString);
  
  const searchQuery = params.get('q') || '';
  const categoryFilter = params.get('category') || 'all';
  const sectorFilter = params.get('sector') || 'all';

  const updateFilters = (updates: { q?: string, category?: string, sector?: string }) => {
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

  const categories = Array.from(new Set(mockMembers.map(m => m.category)));
  const sectors = Array.from(new Set(mockMembers.map(m => lang === 'sr' ? m.sectorSr : m.sector)));

  const filteredMembers = useMemo(() => {
    return mockMembers.filter(m => {
      const sector = lang === 'sr' ? m.sectorSr : m.sector;
      const summary = lang === 'sr' ? m.summarySr : m.summary;
      
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
      const matchesSector = sectorFilter === 'all' || sector === sectorFilter;
      return matchesSearch && matchesCategory && matchesSector;
    });
  }, [searchQuery, categoryFilter, sectorFilter, lang]);

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('members.title')} description={t('members.subtitle')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-16 border-b border-border/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t('members.title')}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              {t('members.subtitle')}
            </p>
          </div>
          <Link href="/platform" className="shrink-0 bg-primary/20 text-primary border border-primary/30 px-5 py-3 rounded-sm font-bold hover:bg-primary/30 transition-colors flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            {t('platform.nav')}
          </Link>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="bg-background border-b border-border sticky top-20 z-40 shadow-sm">
        <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row gap-4 items-center">
          
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={t('members.search_ph')}
              value={searchQuery}
              onChange={(e) => updateFilters({ q: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <select 
              value={categoryFilter}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary flex-1 md:w-48 text-sm"
            >
              <option value="all">{t('members.all_cats')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={sectorFilter}
              onChange={(e) => updateFilters({ sector: e.target.value })}
              className="border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary flex-1 md:w-48 text-sm"
            >
              <option value="all">{t('members.all_sectors')}</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
        </div>
      </section>

      {/* Directory Grid */}
      <section className="pt-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-6 flex justify-between items-center text-sm font-semibold text-muted-foreground">
            <span>{t('members.showing')} {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}</span>
            {(searchQuery || categoryFilter !== 'all' || sectorFilter !== 'all') && (
              <button 
                onClick={() => updateFilters({ q: '', category: 'all', sector: 'all' })}
                className="text-primary hover:underline"
              >
                {t('members.reset')}
              </button>
            )}
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-24 bg-card border border-dashed border-border rounded-sm">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold font-serif mb-2">{t('members.no_results')}</h3>
              <p className="text-muted-foreground">{t('members.no_results_desc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map(member => {
                const summary = lang === 'sr' ? member.summarySr : member.summary;
                const sector = lang === 'sr' ? member.sectorSr : member.sector;
                return (
                  <div key={member.id} className="bg-card border border-border rounded-sm p-6 hover:shadow-lg hover:border-primary/50 transition-all group flex flex-col relative">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-16 h-16 bg-background border border-border rounded-sm flex items-center justify-center text-primary font-serif font-bold text-2xl group-hover:bg-primary/5 transition-colors">
                        {member.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-background border border-border rounded-sm text-muted-foreground">
                        {member.category}
                      </span>
                    </div>

                    <h3 className="text-xl font-serif font-bold mb-1">{member.name}</h3>
                    <span className="text-xs text-primary font-bold uppercase tracking-widest mb-4 block">{sector}</span>
                    
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-1">
                      {summary}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                      <Link href={`/members/${member.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                        {t('members.view_profile')}
                      </Link>
                      <a href={member.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Visit website">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
