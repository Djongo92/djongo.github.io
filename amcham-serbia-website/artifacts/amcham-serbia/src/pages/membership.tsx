import React, { Suspense } from 'react';
import { lazyWithReload } from '@/lib/lazy-with-reload';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { CheckCircle2, Quote } from 'lucide-react';

const MembershipForm = lazyWithReload(() => import('./membership-form'));

export default function Membership() {
  const { t } = useI18n();

  const benefits = t('membership.benefits') as unknown as string[];
  const testimonials = t('membership.testimonials') as unknown as { quote: string; name: string; role: string }[];

  return (
    <div className="w-full">
      <SEO title={t('membership.title')} description={t('membership.subtitle')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-20 pb-32">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">{t('membership.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('membership.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 -mt-16 relative z-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Col: Info */}
            <div className="lg:col-span-7 bg-background p-8 border border-border shadow-xl rounded-2xl">
              <h2 className="text-2xl font-serif font-bold mb-6">{t('membership.why_join')}</h2>
              <ul className="flex flex-col gap-4 mb-12">
                {Array.isArray(benefits) && benefits.map((benefit, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>

              {Array.isArray(testimonials) && testimonials.length > 0 && (
                <div className="mb-12 pt-8 border-t border-border">
                  <h2 className="text-2xl font-serif font-bold mb-6">{t('membership.testimonials_title')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {testimonials.map((item, i) => (
                      <div key={i} className="border border-border bg-card p-5 rounded-2xl flex flex-col gap-3">
                        <Quote className="w-5 h-5 text-primary/40 shrink-0" />
                        <p className="text-sm text-foreground leading-relaxed italic flex-1">"{item.quote}"</p>
                        <div className="pt-3 border-t border-border/60">
                          <div className="text-sm font-bold text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-serif font-bold mb-6 pt-8 border-t border-border">{t('membership.categories_title')}</h2>
              <div className="space-y-6">
                {[
                  { id: 'patron', name: t('membership.categories.patron.name'), desc: t('membership.categories.patron.desc'), feeFrom: t('membership.categories.patron.fee_from') },
                  { id: 'corporate', name: t('membership.categories.corporate.name'), desc: t('membership.categories.corporate.desc'), feeFrom: t('membership.categories.corporate.fee_from') },
                  { id: 'business', name: t('membership.categories.business.name'), desc: t('membership.categories.business.desc'), feeFrom: t('membership.categories.business.fee_from') },
                  { id: 'nonprofit', name: t('membership.categories.nonprofit.name'), desc: t('membership.categories.nonprofit.desc'), feeFrom: t('membership.categories.nonprofit.fee_from') }
                ].map((cat, i) => (
                  <div key={i} className="border border-border p-6 rounded-2xl hover:border-primary/30 transition-colors bg-card">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-bold text-lg text-primary">{cat.name}</h3>
                      <span className="text-sm font-bold text-foreground whitespace-nowrap shrink-0">{cat.feeFrom}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{cat.desc}</p>
                    <p className="text-xs text-muted-foreground mt-4">{t('membership.fee_basis')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Form */}
            <div className="lg:col-span-5 relative z-20">
              <div className="bg-card border-2 border-border p-8 sticky top-24 rounded-2xl shadow-xl">
                <h3 className="text-2xl font-serif font-bold mb-2">{t('membership.form.title')}</h3>
                <p className="text-sm text-muted-foreground mb-8">{t('membership.form.subtitle')}</p>
                
                <Suspense fallback={<div className="min-h-[560px]" aria-busy="true" />}>
                  <MembershipForm />
                </Suspense>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
