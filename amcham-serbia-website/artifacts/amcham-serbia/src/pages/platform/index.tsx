import React, { useState } from 'react';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { LayoutDashboard, Smartphone, Layers, Info, ArrowRight, X, Presentation } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useShowcase } from '@/components/showcase-tour';

export default function PlatformHub() {
  const { t } = useI18n();
  const [showTip, setShowTip] = useState(true);
  const { start: startShowcase } = useShowcase();

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('platform.hub.title')} description={t('platform.hub.desc')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t('platform.hub.title')}</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {t('platform.hub.desc')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pt-12">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          
          <AnimatePresence>
            {showTip && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-12 flex items-start gap-3 relative overflow-hidden"
              >
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="pr-8">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-1">{t('platform.hub.tip_label')}</span>
                  <p className="text-sm text-foreground">{t('platform.hub.tip_body')}</p>
                </div>
                <button onClick={() => setShowTip(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            
            {/* Console */}
            <Link href="/platform/console" className="bg-card border border-border rounded-3xl shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all p-8 md:p-10 group flex flex-col items-start relative overflow-hidden">
              <div className="w-16 h-16 bg-background border border-border rounded-2xl flex items-center justify-center text-foreground mb-8 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4">{t('platform.hub.console_title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {t('platform.hub.console_desc')}
              </p>
              <div className="mt-auto flex items-center gap-2 text-primary font-bold">
                {t('platform.hub.open_console')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Portal */}
            <Link href="/platform/portal" className="bg-card border border-border rounded-3xl shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all p-8 md:p-10 group flex flex-col items-start relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 group-hover:bg-primary/10"></div>
              <div className="w-16 h-16 bg-background border border-border rounded-2xl flex items-center justify-center text-foreground mb-8 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors relative z-10">
                <Smartphone className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4 relative z-10">{t('platform.hub.portal_title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-8 relative z-10">
                {t('platform.hub.portal_desc')}
              </p>
              <div className="mt-auto flex items-center gap-2 text-primary font-bold relative z-10">
                {t('platform.hub.open_portal')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

          </div>

          {/* Showcase CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-accent/10 border border-accent/20 rounded-2xl px-6 py-5 mb-8">
            <div className="flex items-start gap-3">
              <Presentation className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-widest block mb-1">{t('showcase.cta_label', 'Showing someone the platform?')}</span>
                <p className="text-sm text-foreground">{t('showcase.cta_body', "Take the guided walkthrough — a scripted tour through the platform's strongest moments.")}</p>
              </div>
            </div>
            <button onClick={startShowcase} className="shrink-0 px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
              {t('showcase.cta_button', 'Start Showcase')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Seam */}
          <Link href="/platform/seam" className="block bg-secondary text-secondary-foreground rounded-3xl p-8 group hover:bg-secondary/90 transition-colors relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
              <div className="w-12 h-12 bg-secondary-foreground/10 rounded-2xl flex items-center justify-center text-secondary-foreground shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{t('platform.hub.seam')}</h3>
                <p className="text-secondary-foreground/70">{t('platform.hub.seam_desc')}</p>
              </div>
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-secondary-foreground/20 group-hover:border-secondary-foreground group-hover:bg-secondary-foreground text-secondary-foreground group-hover:text-secondary transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>

        </div>
      </section>
    </div>
  );
}
