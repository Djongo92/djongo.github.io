import React from 'react';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { ArrowLeft, Building2, Coins, Users, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { membershipGrowth, sectorBreakdown } from '@/data/impact';

const growthConfig = {
  members: { label: 'Members', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const sectorConfig = {
  members: { label: 'Members', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

export default function Impact() {
  const { t, lang } = useI18n();

  const sortedSectors = [...sectorBreakdown].sort((a, b) => b.members - a.members);

  const stats = [
    { icon: Building2, label: t('home.stats.members'), val: '260+' },
    { icon: Coins, label: t('home.stats.revenue'), val: t('home.stats.revenue_val') },
    { icon: Users, label: t('home.stats.employees'), val: t('home.stats.employees_val') },
    { icon: TrendingUp, label: t('home.stats.investments'), val: t('home.stats.investments_val') },
  ];

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('impact.title')} description={t('impact.subtitle')} />

      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-20 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <Link href="/about" className="text-sm font-bold text-accent hover:underline mb-6 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> {t('impact.back_to_about')}
          </Link>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">{t('impact.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">{t('impact.subtitle')}</p>
        </div>
      </section>

      <section className="py-16 -mt-16 relative z-20">
        <div className="container mx-auto px-4 md:px-8">

          {/* Stat tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white border border-border p-6 md:p-8 rounded-sm shadow-xl">
                <stat.icon className="w-6 h-6 text-primary mb-4" />
                <div className="text-3xl md:text-4xl font-serif font-bold text-secondary mb-2">{stat.val}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Membership growth */}
            <div className="bg-white border border-border p-8 rounded-sm shadow-sm">
              <h2 className="text-2xl font-serif font-bold mb-2">{t('impact.growth_title')}</h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{t('impact.growth_desc')}</p>
              <ChartContainer config={growthConfig} className="aspect-auto h-[280px] w-full">
                <AreaChart data={membershipGrowth} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillMembers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-members)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-members)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={36}
                    label={{ value: t('impact.growth_axis'), angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                  />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area
                    dataKey="members"
                    type="monotone"
                    fill="url(#fillMembers)"
                    stroke="var(--color-members)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Sector breakdown */}
            <div className="bg-white border border-border p-8 rounded-sm shadow-sm">
              <h2 className="text-2xl font-serif font-bold mb-2">{t('impact.sector_title')}</h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{t('impact.sector_desc')}</p>
              <ChartContainer config={sectorConfig} className="aspect-auto h-[280px] w-full">
                <BarChart
                  data={sortedSectors}
                  layout="vertical"
                  margin={{ left: 0, right: 24, top: 8, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey={lang === 'sr' ? 'sectorSr' : 'sector'}
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="members" fill="var(--color-members)" radius={4} barSize={16}>
                    <LabelList dataKey="members" position="right" className="fill-foreground" fontSize={12} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
