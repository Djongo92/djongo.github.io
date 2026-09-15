import React from "react";
import { Link } from "wouter";
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center p-8 bg-white border border-border shadow-xl rounded-sm max-w-md w-full">
        <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">{t('not_found.title')}</h2>
        <p className="text-muted-foreground mb-8">
          {t('not_found.desc')}
        </p>
        <Link href="/" className="inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-sm font-bold hover:bg-primary/90 transition-colors">
          {t('not_found.cta')}
        </Link>
      </div>
    </div>
  );
}
