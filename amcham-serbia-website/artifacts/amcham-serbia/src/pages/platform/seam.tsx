import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { Layers, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Link } from 'wouter';

export default function PlatformSeam() {
  const { t } = useI18n();

  const [toggles, setToggles] = useState({
    directory: true,
    needs: true,
    activity: true
  });

  const seamData = [
    { portal: "Event registration & attendance", staff: "Relationship timeline entry", effect: "Used for relevant follow-up" },
    { portal: "Committee application", staff: "Matchmaking & policy lists", effect: "Used to route opportunities" },
    { portal: "Profile completion", staff: "Public directory visibility", effect: "Shown only if published" },
    { portal: "Survey response (Lap Time)", staff: "Aggregated needs analysis", effect: "Combined with member responses" },
    { portal: "Portal messages and requests", staff: "Service workflow context", effect: "Visible to assigned staff" }
  ];

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('platform.seam.title')} description={t('platform.seam.desc')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10 flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
          <div>
            <Link href="/platform" className="text-sm font-bold text-accent hover:underline mb-4 inline-block">← Back to Platform Hub</Link>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2">{t('platform.seam.title')}</h1>
            <p className="text-lg text-muted-foreground">{t('platform.seam.subtitle')}</p>
          </div>
          <div className="w-16 h-16 bg-secondary-foreground/10 rounded-sm flex items-center justify-center text-secondary-foreground shrink-0">
            <Layers className="w-8 h-8" />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pt-12">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          
          <p className="text-xl font-medium text-foreground mb-12 border-l-4 border-primary pl-6 py-2">
            {t('platform.seam.desc')}
          </p>

          <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 md:p-6 font-bold">{t('platform.seam.portal_records')}</th>
                    <th className="p-4 md:p-6 font-bold border-l border-border">{t('platform.seam.staff_see')}</th>
                    <th className="p-4 md:p-6 font-bold border-l border-border text-primary">{t('platform.seam.effect')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {seamData.map((row, i) => (
                    <tr key={i} className="hover:bg-background/50 transition-colors">
                      <td className="p-4 md:p-6 font-medium text-foreground">{row.portal}</td>
                      <td className="p-4 md:p-6 text-muted-foreground border-l border-border">{row.staff}</td>
                      <td className="p-4 md:p-6 font-mono font-medium text-primary border-l border-border">{row.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-serif font-bold text-foreground">{t('platform.seam.never_see')}</h2>
              </div>
              <ul className="space-y-4">
                {[
                  "Personal messages between members in the Marketplace.",
                  "Individual responses to anonymous pulse surveys.",
                  "Financial data not explicitly provided for fee calculation.",
                  "Drafts of profiles or offers not yet published."
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start bg-background border border-border p-4 rounded-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0"></div>
                    <span className="text-sm text-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-serif font-bold text-foreground">{t('platform.seam.privacy')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6 font-medium">
                {t('platform.seam.privacy_desc')}
              </p>
              
              <div className="space-y-4">
                {[
                  { id: 'directory', label: "Include my company in the public member directory" },
                  { id: 'needs', label: "Use our data to infer matchmaking needs" },
                  { id: 'activity', label: "Show our event attendance history to other members" }
                ].map((toggle) => (
                  <div key={toggle.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-sm shadow-sm">
                    <span className="text-sm font-bold text-foreground">{toggle.label}</span>
                    <button 
                      onClick={() => setToggles(prev => ({ ...prev, [toggle.id]: !prev[toggle.id as keyof typeof prev] }))}
                      className={`w-12 h-6 rounded-full relative transition-colors ${toggles[toggle.id as keyof typeof toggles] ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${toggles[toggle.id as keyof typeof toggles] ? 'translate-x-6' : ''}`}></span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
