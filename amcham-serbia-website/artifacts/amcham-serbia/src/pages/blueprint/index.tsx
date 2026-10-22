import React from 'react';
import { Link } from 'wouter';
import { BlueprintLayout } from '@/components/blueprint-layout';
import { useI18n } from '@/lib/i18n';
import { LayoutDashboard, Compass, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BlueprintOverview() {
  const { t } = useI18n();

  return (
    <BlueprintLayout title={t('blueprint.nav.overview')}>
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Simple Story Arc */}
        <div className="max-w-4xl mb-20">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-foreground leading-tight">
            A simple diagnostic and a clear roadmap.
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            The AmCham Serbia platform must be as effective as the organization it represents. 
            This blueprint shows what works, what could work better, and five steps to get there.
          </p>
        </div>

        {/* Diagnosis & Roadmap Preview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          
          <div className="bg-card border border-border p-8 md:p-12 shadow-sm rounded-2xl flex flex-col h-full group hover:border-primary/30 transition-colors">
            <div className="mb-6 w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full text-primary">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">1. The analysis</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              What the site does well today, where it struggles to serve members, and the plain evidence of how we measure up.
            </p>
            <div className="mt-auto">
              <Link href="/blueprint/diagnostic" className="inline-flex items-center gap-2 text-primary font-bold hover:underline group-hover:gap-3 transition-all">
                Read the analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-card border border-border p-8 md:p-12 shadow-sm rounded-2xl flex flex-col h-full group hover:border-primary/30 transition-colors">
            <div className="mb-6 w-12 h-12 bg-accent/10 flex items-center justify-center rounded-full text-accent">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">2. The roadmap</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              A five-step plan for the redesign, each step with its reason and what it makes possible.
            </p>
            <div className="mt-auto">
              <Link href="/blueprint/roadmap" className="inline-flex items-center gap-2 text-primary font-bold hover:underline group-hover:gap-3 transition-all">
                View the 5-step roadmap <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
        </div>

        {/* Sub-sections Links */}
        <div className="border-t border-border pt-16 mb-20">
          <h3 className="text-xl font-bold mb-8">Also in this blueprint:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/blueprint/direction" className="bg-background border border-border p-6 rounded-2xl hover:bg-muted transition-colors group flex items-start gap-4">
              <Layers className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-bold mb-2 group-hover:text-primary transition-colors">The direction</h4>
                <p className="text-sm text-muted-foreground">The look we chose and why, with the colours, type and buttons.</p>
              </div>
            </Link>
            <Link href="/blueprint/pages" className="bg-background border border-border p-6 rounded-2xl hover:bg-muted transition-colors group flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-bold mb-2 group-hover:text-primary transition-colors">Every page</h4>
                <p className="text-sm text-muted-foreground">Every page template explained, with a link to the working page.</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </BlueprintLayout>
  );
}
