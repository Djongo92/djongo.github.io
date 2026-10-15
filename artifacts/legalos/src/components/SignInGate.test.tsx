/**
 * SignInGate hash-routing tests
 *
 * Verifies that:
 *   /app/#signin  → the auth form (email + password inputs) is rendered on mount
 *   /app/         → the auth form is NOT rendered; the domain-input teaser is shown
 *
 * These tests guard against regressions in the hash-based `authOpen` initializer
 * in SignInGate and in the LOG IN href in NavBar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Stubs for heavy/network-dependent child components
// ---------------------------------------------------------------------------
vi.mock("@/components/GoldParticles", () => ({
  default: () => null,
}));

// LiveScoreTeaser renders a domain input that is visible on /app/ (no hash).
// The stub provides a recognisable domain input so we can assert it's present.
vi.mock("@/components/LiveScoreTeaser", () => ({
  default: ({ variant: _variant, onGetFullScore: _cb }: { variant?: string; onGetFullScore?: () => void }) => (
    <input aria-label="Firm domain" placeholder="yourdomain.com" />
  ),
}));

vi.mock("@/components/DemoScoreTeaser", () => ({
  default: ({ onUnlock: _u, onBack: _b }: { onUnlock?: () => void; onBack?: () => void }) => (
    <div>DemoScoreTeaser</div>
  ),
}));

// ---------------------------------------------------------------------------
// Auth hook – no-op stubs; SignInGate doesn't call these during mount
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signUp: vi.fn(),
    signIn: vi.fn(),
    resetPassword: vi.fn(),
    session: null,
    loading: false,
    sessionExpired: false,
  }),
}));

// ---------------------------------------------------------------------------
// Supabase client – not exercised in these tests but imported transitively
// ---------------------------------------------------------------------------
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// ---------------------------------------------------------------------------
// framer-motion – forward children as-is so AnimatePresence / motion.div work
// ---------------------------------------------------------------------------
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  const React = await import("react");
  const passThrough =
    (_tag: string) =>
    ({ children, ...rest }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children ?? null);
  return {
    ...actual,
    motion: new Proxy(actual.motion, {
      get(_target, prop: string) {
        return passThrough(prop);
      },
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children ?? null),
  };
});

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are registered
// ---------------------------------------------------------------------------
import SignInGate from "./SignInGate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setHash(hash: string) {
  // happy-dom exposes window.location as a writable URL object
  Object.defineProperty(window, "location", {
    value: { ...window.location, hash },
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SignInGate – hash routing", () => {
  const onDemo = vi.fn();

  beforeEach(() => {
    onDemo.mockClear();
  });

  afterEach(() => {
    // Reset hash between tests
    setHash("");
  });

  it("shows the auth form immediately when the URL hash is #signin", () => {
    setHash("#signin");
    render(<SignInGate onDemo={onDemo} />);

    // The auth form contains an email field labelled "Work email"
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    // …and a password field
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("does NOT show the auth form on plain /app/ (no hash)", () => {
    setHash("");
    render(<SignInGate onDemo={onDemo} />);

    // Auth-form inputs must be absent
    expect(screen.queryByLabelText("Work email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();

    // The domain input from LiveScoreTeaser should be visible instead
    expect(screen.getByLabelText("Firm domain")).toBeInTheDocument();
  });
});
