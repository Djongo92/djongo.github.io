// The 10-second rule: known-long waits get tips immediately, usually-fast
// tools only reveal them once the wait has genuinely dragged past the
// threshold — and the strip resets for the next run.
import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingTips } from "./LoadingTips";
import { AUDIT_LOADING_TIPS } from "@/lib/auditLoadingTips";

// framer-motion drives its own animation clock, which fake timers can't
// advance — swap it for passthroughs so visibility is purely state-driven.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    div: ({ children, initial, animate, exit, transition, ...rest }: any) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

describe("LoadingTips", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows a tip immediately for known-long runs", () => {
    render(<LoadingTips active />);
    expect(screen.getByText(AUDIT_LOADING_TIPS[0].title)).toBeInTheDocument();
  });

  it("stays hidden until the wait crosses the threshold", () => {
    render(<LoadingTips active afterMs={10000} />);
    expect(screen.queryByText(AUDIT_LOADING_TIPS[0].title)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(screen.queryByText(AUDIT_LOADING_TIPS[0].title)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText(AUDIT_LOADING_TIPS[0].title)).toBeInTheDocument();
  });

  it("rotates to the next tip while the wait continues", () => {
    render(<LoadingTips active />);
    act(() => {
      vi.advanceTimersByTime(4800);
    });
    expect(screen.getByText(AUDIT_LOADING_TIPS[1].title)).toBeInTheDocument();
  });

  it("disappears when the wait ends and restarts from the first tip next time", () => {
    const { rerender } = render(<LoadingTips active />);
    act(() => {
      vi.advanceTimersByTime(4800);
    });
    rerender(<LoadingTips active={false} />);
    expect(screen.queryByText(AUDIT_LOADING_TIPS[1].title)).toBeNull();
    rerender(<LoadingTips active />);
    expect(screen.getByText(AUDIT_LOADING_TIPS[0].title)).toBeInTheDocument();
  });

  it("never shows the strip when a gated wait ends before the threshold", () => {
    const { rerender } = render(<LoadingTips active afterMs={10000} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    rerender(<LoadingTips active={false} afterMs={10000} />);
    // The pending threshold timer must have been cancelled — no tip, ever.
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.queryByText(AUDIT_LOADING_TIPS[0].title)).toBeNull();
  });

  it("cancels the pending threshold timer on unmount", () => {
    const { unmount } = render(<LoadingTips active afterMs={10000} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.queryByText(AUDIT_LOADING_TIPS[0].title)).toBeNull();
  });
});
