import React from 'react';
import { Link, useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';

export function BlueprintLayout({ children, title }: { children: React.ReactNode, title: string }) {
  const [location] = useLocation();
  const { t, lang } = useI18n();

  const links = [
    { href: '/blueprint', label: t('blueprint.nav.overview') },
    { href: '/blueprint/diagnostic', label: t('blueprint.nav.diagnostic') },
    { href: '/blueprint/roadmap', label: t('blueprint.nav.roadmap') },
    { href: '/blueprint/direction', label: t('blueprint.nav.direction') },
    { href: '/blueprint/pages', label: t('blueprint.nav.pages') },
  ];

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={`${title} | ${t('blueprint.title')}`} description={t('blueprint.subtitle')} />
      
      {/* Blueprint Header */}
      <section className="bg-secondary text-secondary-foreground pt-16 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider rounded-sm">Deliverable</span>
            {lang === 'sr' && <span className="text-xs text-white/60 italic">{t('blueprint.english_note')}</span>}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t('blueprint.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            {t('blueprint.subtitle')}
          </p>
        </div>
      </section>

      {/* Blueprint Subnav */}
      <section className="bg-white border-b border-border sticky top-20 z-40 shadow-sm overflow-x-auto">
        <div className="container mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-6 md:gap-8 min-w-max">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`py-4 text-sm font-bold border-b-2 transition-colors ${
                  location === link.href ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Main Blueprint Content */}
      <div className="pt-12">
        {children}
      </div>
    </div>
  );
}
