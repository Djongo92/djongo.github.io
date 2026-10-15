import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import BootVeil from "@/components/BootVeil";
import { isDemoMode, primeDemoMode } from "@/lib/demoMode";
import { codeFromSearch, hasShowcaseGrant, verifyShowcaseCode } from "@/lib/demoAccess";

/**
 * /demo — the door to the gated product showcase.
 *
 * Three ways in, in descending order of how common they are:
 *
 * 1. A link sent by sales, `/demo?key=CODE`. The code is verified server-side
 *    and the visitor never sees this form — they get the boot veil and land in
 *    the product.
 * 2. Already verified in this tab. main.tsx primes demo state and rewrites the
 *    URL before React mounts, so this component doesn't normally render at all;
 *    the grant check here covers in-app client-side navigation to /demo.
 * 3. No code — someone who found the link or clicked through from the site.
 *    They get the form, and, more usefully, a route to the free audit, which is
 *    the thing that actually converts a stranger.
 */
/** The code was right but the browser wouldn't keep the grant. Rare, and worth
 *  naming precisely — "invalid code" would send someone hunting the wrong bug. */
const STORAGE_BLOCKED =
  "Your code is valid, but this browser is blocking the storage the showcase needs. Try a normal (non-private) window.";

export default function ShowcaseGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const linkCode = codeFromSearch(location.search);

  const [code, setCode] = useState(linkCode ?? "");
  // A code in the URL is checked immediately, so open in the verifying state
  // rather than flashing the form for one frame first.
  const [verifying, setVerifying] = useState(Boolean(linkCode));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Seeds the showcase and goes in. False if the grant didn't take. */
  const enter = useCallback(() => {
    if (!primeDemoMode()) return false;
    // Enter via a full canonical load, not an SPA navigate: navigate("/")
    // under the /app basename leaves the address bar at "/app" (no trailing
    // slash), and reloading THAT URL serves Vite's base-URL error page
    // instead of restoring the demo. BASE_URL is "/app/" — a URL that
    // round-trips. The grant lives in sessionStorage, so the fresh load
    // boots straight into demo mode (same prime-then-load handoff the
    // marketing site uses).
    window.location.replace(import.meta.env.BASE_URL);
    return true;
  }, []);

  const submit = useCallback(
    async (value: string, signal?: AbortSignal) => {
      setVerifying(true);
      setError(null);
      const result = await verifyShowcaseCode(value, signal);
      if (signal?.aborted) return;
      if (result.ok) {
        if (enter()) return;
        setVerifying(false);
        setError(STORAGE_BLOCKED);
        return;
      }
      setVerifying(false);
      setError(result.message);
      inputRef.current?.focus();
    },
    [enter],
  );

  // The ask: nobody should bounce off an invitation-only gate with no way
  // to ask for an invitation. Deliberately quieter than the teaser below —
  // the audit on their own firm converts better.
  const [requestEmail, setRequestEmail] = useState("");
  const [requestFirm, setRequestFirm] = useState("");
  const [requestHoney, setRequestHoney] = useState("");
  const [requestState, setRequestState] = useState<"idle" | "sending" | "done">("idle");
  const [requestError, setRequestError] = useState<string | null>(null);

  const submitRequest = useCallback(async () => {
    if (requestState === "sending") return;
    setRequestState("sending");
    setRequestError(null);
    try {
      // Root-relative like demoAccess.ENDPOINT: the API server owns /api at
      // the site root across every artifact.
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: requestEmail,
          firmName: requestFirm || undefined,
          website: requestHoney,
        }),
      });
      if (res.ok) {
        setRequestState("done");
        return;
      }
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setRequestError(body?.message ?? "Something went wrong. Try again.");
      setRequestState("idle");
    } catch {
      setRequestError("Couldn't reach the server. Check your connection and try again.");
      setRequestState("idle");
    }
  }, [requestEmail, requestFirm, requestHoney, requestState]);

  useEffect(() => {
    if (hasShowcaseGrant()) {
      if (enter()) return;
      setVerifying(false);
      setError(STORAGE_BLOCKED);
      return;
    }
    if (!linkCode) return;
    const controller = new AbortController();
    void submit(linkCode, controller.signal);
    return () => controller.abort();
  }, [enter, linkCode, submit]);

  if (verifying) return <BootVeil label="Checking your access" />;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: "hsl(222 47% 4%)" }}
    >
      <div className="w-full max-w-md">
        <a
          href="/"
          className="font-display text-3xl font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          Uvid
        </a>

        <p className="mt-8 text-[10px] eyebrow text-primary">
          Product showcase
        </p>
        <h1 className="mt-3 font-display text-2xl text-foreground leading-snug">
          The full product, by invitation.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground font-body leading-relaxed">
          This is the complete Uvid platform running on a sample firm — the real scoring engine,
          the real workshop tools, the real battle plan. We hand out access one firm at a time.
        </p>

        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (!verifying) void submit(code);
          }}
        >
          <label htmlFor="showcase-code" className="block text-xs font-body text-muted-foreground mb-2">
            Access code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="showcase-code"
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter your code"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "showcase-code-error" : undefined}
                className="w-full bg-card hairline border rounded-xl pl-9 pr-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-body tap-scale disabled:opacity-60 shrink-0"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter"}
            </button>
          </div>
          {error && (
            <p id="showcase-code-error" role="alert" className="mt-2 text-xs text-destructive font-body">
              {error}
            </p>
          )}
        </form>

        {/* The important half of this page. Most people who land here don't
            have a code, and the free audit is what they actually want — it
            runs on their own firm rather than a fictional one. */}
        <div className="mt-10 pt-8 border-t hairline">
          <p className="text-sm text-foreground font-body">No code? You don't need one to get your score.</p>
          <p className="mt-1.5 text-xs text-muted-foreground font-body leading-relaxed">
            Run the audit on your own firm instead — two of the five categories score for real, free,
            in about a minute. No signup.
          </p>
          <button
            onClick={() => navigate("/teaser")}
            className="mt-4 inline-flex items-center gap-2 text-sm font-body text-primary hover:gap-3 transition-all tap-scale"
          >
            Score my firm <ArrowRight className="w-4 h-4" />
          </button>

          {requestState === "done" ? (
            <p className="mt-8 text-xs text-primary font-body leading-relaxed" role="status">
              Request received — if the showcase is a fit for your firm, a code is on its way.
            </p>
          ) : (
            <form
              className="mt-8"
              onSubmit={(e) => {
                e.preventDefault();
                void submitRequest();
              }}
            >
              <p className="text-xs text-muted-foreground font-body leading-relaxed">
                Rather see the full product first? Leave your work email and we'll consider sending a code.
              </p>
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@yourfirm.com"
                    aria-label="Work email"
                    className="w-full bg-card hairline border rounded-xl pl-9 pr-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <input
                  type="text"
                  value={requestFirm}
                  onChange={(e) => setRequestFirm(e.target.value)}
                  autoComplete="organization"
                  placeholder="Firm name (optional)"
                  aria-label="Firm name (optional)"
                  className="w-full bg-card hairline border rounded-xl px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
                />
              </div>
              {/* Honeypot — real users never see or fill this field. */}
              <input
                type="text"
                value={requestHoney}
                onChange={(e) => setRequestHoney(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
                name="website"
              />
              {requestError && (
                <p role="alert" className="mt-2 text-xs text-destructive font-body">
                  {requestError}
                </p>
              )}
              <button
                type="submit"
                disabled={requestState === "sending"}
                className="mt-3 inline-flex items-center gap-2 text-sm font-body text-foreground hairline border rounded-xl px-4 py-2.5 hover:border-primary transition-colors tap-scale disabled:opacity-60"
              >
                {requestState === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request an invite"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
