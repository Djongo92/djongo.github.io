import { motion } from 'framer-motion';
import { CheckCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { SCORED_FIRMS } from '../data/benchmarkLeaders';

export function EmailCapture() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — hidden from real users
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/report-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, website }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message ?? 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-white/10 bg-card/30 p-8 md:p-12 rounded-2xl relative">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-primary text-xs mb-4 eyebrow">
            <Mail className="w-4 h-4" /> Free Report
          </div>
          <h3 className="text-2xl md:text-3xl font-serif text-white mb-3">
            The Q3 2026 Serbia Law Firm Visibility Report.
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The full {SCORED_FIRMS}-firm benchmark, category-level averages, the biggest
            quarter-over-quarter movers, and the three visibility gaps most firms in
            the market share. One PDF, delivered once per quarter.
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-4 border border-primary/25 bg-primary/5 p-6 rounded-xl"
            data-testid="text-email-success"
          >
            <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-white font-medium mb-1">Report request received.</div>
              <div className="text-sm text-muted-foreground">
                We'll email the report when the Q3 data closes. In the
                meantime, run the free partial audit:{' '}
                <a href="/app/teaser" className="text-primary hover:text-white transition-colors">
                  get your score &rarr;
                </a>
              </div>
            </div>
          </motion.div>
        ) : (
          <div>
            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3" data-testid="form-email-capture">
              {/* Honeypot field: invisible to humans, bots that auto-fill it are silently dropped server-side */}
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] w-px h-px opacity-0"
              />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@yourfirm.rs"
                aria-label="Your email address"
                aria-describedby={error ? 'email-error' : undefined}
                data-testid="input-email"
                className={`flex-1 bg-background/60 border ${error ? 'border-red-400/60' : 'border-white/15'} text-white placeholder:text-muted-foreground/50 px-4 py-4 text-sm tabular-nums rounded-xl focus:outline-none focus:border-primary/60 transition-colors`}
              />
              <button
                type="submit"
                disabled={submitting}
                data-testid="button-email-submit"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground px-7 py-4 text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send Me the Report'}
              </button>
            </form>
            {error ? (
              <p id="email-error" role="alert" className="mt-2 text-xs text-red-400 tabular-nums font-medium">{error}</p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground/60 eyebrow">
                No spam. One report per quarter.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
