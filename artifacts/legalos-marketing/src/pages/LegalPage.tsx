import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  kind: 'privacy' | 'terms' | 'dpa';
}

const PRIVACY_SECTIONS = [
  {
    h: '1. What we collect',
    p: 'When you run a free audit, we collect the website domain you provide and analyse publicly available information about the firm it belongs to: website content and structure, legal directory listings (Chambers & Partners, Legal 500, IFLR1000), press coverage, and public client reviews. If you create an account, we additionally store your email address and the audit results associated with your account. If you subscribe to the quarterly report, we store your email address for that purpose only.',
  },
  {
    h: '2. What we do not collect',
    p: 'We do not access any private, privileged, or client-related information. The audit reads only what is already publicly visible on the open web and in public directories. We do not sell, rent, or share your personal data with third parties for their marketing purposes.',
  },
  {
    h: '3. How audit results are used',
    p: 'Your firm\u2019s score is private to you until you explicitly choose to claim a position on the public benchmark. Aggregate, anonymised statistics (for example, category averages across the market) may be used in published reports without identifying unscored firms.',
  },
  {
    h: '4. Cookies and analytics',
    p: 'The marketing site uses only functional storage necessary for the site to operate (for example, remembering a report subscription in your browser). We measure aggregate product usage with PostHog, a privacy-respecting analytics service hosted in the EU; it is configured without advertising cookies or cross-site tracking. We do not run third-party advertising trackers.',
  },
  {
    h: '5. Data retention and your rights',
    p: 'You may request access to, correction of, or deletion of your personal data at any time by contacting us. Account data is deleted upon account closure. Report-subscription emails include an unsubscribe option. You have the rights afforded by applicable data protection law, including the GDPR where it applies.',
  },
  {
    h: '6. Contact',
    p: 'For any privacy question or request, email support@uvid.com. Uvid DOO, Republic of Serbia, is the data controller for the personal data described in this policy.',
  },
];

const TERMS_SECTIONS = [
  {
    h: '1. The service',
    p: 'Uvid provides a market visibility scoring and benchmarking service for law firms, built from publicly available data. The free partial audit scores 2 of 5 categories without an account. The full platform \u2014 complete scoring, the guidebook, the AI Workshop, and the Battle Plan export \u2014 requires an account.',
  },
  {
    h: '2. Accuracy of data',
    p: 'Scores are computed from external, publicly available sources that change over time. While we cross-reference multiple sources and display data freshness alongside every score, we do not warrant that any score, ranking, or underlying data point is error-free or current at every moment. Scores are informational benchmarks, not professional advice.',
  },
  {
    h: '3. Acceptable use',
    p: 'You may audit your own firm or firms you are authorised to represent. You may not use the service to harass, defame, or misrepresent other firms; scrape or resell benchmark data; or attempt to manipulate scoring inputs. We may suspend access for misuse.',
  },
  {
    h: '4. Intellectual property',
    p: 'The scoring methodology, guidebook content, generated reports, and all site content are the property of Uvid. Battle Plan PDFs generated for your firm may be used freely within your firm. Third-party directory names (Chambers & Partners, Legal 500, IFLR1000) are trademarks of their respective owners; Uvid is not affiliated with or endorsed by them.',
  },
  {
    h: '5. Limitation of liability',
    p: 'The service is provided \u201cas is.\u201d To the maximum extent permitted by law, Uvid is not liable for business decisions made on the basis of scores or benchmarks, nor for indirect or consequential damages arising from use of the service.',
  },
  {
    h: '6. Changes',
    p: 'We may update these terms as the service evolves. Material changes will be announced on this page with an updated effective date. Continued use after changes constitutes acceptance.',
  },
  {
    h: '7. Paid services',
    p: 'Some parts of the service are paid, as indicated at checkout. Prices are shown in EUR before purchase; VAT or other applicable taxes are calculated and collected at checkout by our payment processor, Stripe. Unless a purchase is expressly described as a subscription, it is one-time and does not renew. You may request a refund within 14 days of purchase by emailing support@uvid.com; refunds are not available for deliverables already generated at your request (for example, a completed full audit or report). If a payment fails or is reversed, paid access may be suspended until resolved.',
  },
  {
    h: '8. Governing law',
    p: 'These terms are between you and Uvid DOO, Republic of Serbia, and are governed by the laws of the Republic of Serbia. The courts of Belgrade have exclusive jurisdiction, except where mandatory consumer protection law provides otherwise.',
  },
];

const DPA_SECTIONS = [
  {
    h: '1. Scope and roles',
    p: 'This Data Processing Agreement applies when Uvid DOO, Republic of Serbia, processes personal data on your behalf through the Uvid platform (for example, your account email, team member emails, and audit results tied to your account). You are the data controller; Uvid DOO is the data processor. Data we collect about the market from public sources (directory listings, press, public websites) is processed by Uvid as an independent controller and is not covered by this DPA.',
  },
  {
    h: '2. What we process and why',
    p: 'We process account and usage data solely to provide the service: running audits you request, storing your results and history, operating team workspaces and invite links, and delivering reports. We do not use your data for advertising, sell it, or share it with third parties for their own marketing.',
  },
  {
    h: '3. Subprocessors',
    p: 'We use a small set of subprocessors to operate the service: Supabase (database and authentication), Stripe (payment processing — card details never touch our servers), PostHog EU (product analytics, EU-hosted), Google APIs (public page measurement and place data), and AI model providers accessed via the Replit AI integrations gateway (for the copy and analysis tools you invoke). Each is bound by its own data processing terms; we engage only subprocessors that offer GDPR-appropriate safeguards.',
  },
  {
    h: '4. Security measures',
    p: 'Access to production data is restricted by row-level security policies scoped to firm membership, service-role keys are held in server-side secrets storage, single-use links expire, and all traffic is encrypted in transit. Audit evidence is stored so results can be verified rather than taken on trust.',
  },
  {
    h: '5. Retention, deletion, and requests',
    p: 'Account data is deleted upon account closure. You may export or request deletion of your firm data at any time by emailing support@uvid.com. We honour access, correction, and erasure requests under applicable data protection law, including the GDPR where it applies, within 30 days.',
  },
  {
    h: '6. International transfers',
    p: 'Where subprocessors process data outside the EEA, transfers rely on their standard contractual clauses or equivalent safeguards. PostHog analytics data is hosted in the EU.',
  },
  {
    h: '7. Contact',
    p: 'For any question about this DPA or to countersign a copy, email support@uvid.com.',
  },
];

const TITLES: Record<LegalPageProps['kind'], string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  dpa: 'Data Processing Agreement',
};

export function LegalPage({ kind }: LegalPageProps) {
  const sections = kind === 'privacy' ? PRIVACY_SECTIONS : kind === 'dpa' ? DPA_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 max-w-3xl py-24">
        <a
          href="#"
          onClick={() => { window.location.hash = ''; }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-12"
          data-testid="link-legal-back"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Uvid
        </a>

        <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">
          {TITLES[kind]}
        </h1>
        <p className="text-sm text-muted-foreground mb-16 tabular-nums font-medium">
          Effective date: August 15, 2026
        </p>

        <div className="space-y-12">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-serif text-white mb-3">{s.h}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
