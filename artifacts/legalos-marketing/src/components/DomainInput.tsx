import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { DemoLink } from './DemoLaunch';

interface DomainInputProps {
  size?: 'default' | 'large';
  showDemoLink?: boolean;
  /** Which section of the page this input sits in — carried into the app so
   * onboarding can frame itself around why the visitor clicked. */
  source?: string;
}

export function DomainInput({ size = 'default', showDemoLink = false, source = 'hero' }: DomainInputProps) {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
    if (!cleaned || !cleaned.includes('.')) {
      setError('Enter your firm\u2019s website, e.g. yourfirm.rs');
      return;
    }
    window.location.href = `/app/teaser?domain=${encodeURIComponent(cleaned)}`;
  };

  const pad = size === 'large' ? 'py-5' : 'py-4';

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3" data-testid="form-domain-audit">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-sm select-none hidden sm:block tabular-nums font-medium">
            https://
          </span>
          <input
            type="text"
            value={domain}
            onChange={e => { setDomain(e.target.value); setError(''); }}
            placeholder="yourfirm.rs"
            aria-label="Your firm's website domain"
            aria-describedby={error ? 'domain-error' : undefined}
            data-testid="input-domain"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={`w-full bg-card/40 border ${error ? 'border-red-400/60' : 'border-white/15'} text-white placeholder:text-muted-foreground/50 px-4 sm:pl-[4.7rem] ${pad} text-sm tabular-nums rounded-full focus:outline-none focus:border-primary/60 transition-colors`}
          />
        </div>
        <button
          type="submit"
          data-testid="button-domain-submit"
          className={`inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-7 ${pad} text-sm font-semibold rounded-full hover:opacity-90 transition-opacity group whitespace-nowrap`}
        >
          Get My Score
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>
      {error ? (
        <p id="domain-error" role="alert" className="mt-2 text-xs text-red-400 tabular-nums font-medium">{error}</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground/70 eyebrow">
          Free partial audit &bull; Public data only &bull; 2 of 5 categories
        </p>
      )}
      {showDemoLink && (
        <div className="mt-4">
          <DemoLink
            from={source}
            data-testid="link-demo"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors group"
          >
            Request a guided demo &mdash; by invitation
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </DemoLink>
          {/* Said here rather than discovered at the door. The audit above is
              the open one; this link is the guided showcase, and a visitor who
              knows that before clicking doesn't experience the gate as a wall. */}
        </div>
      )}
    </div>
  );
}
