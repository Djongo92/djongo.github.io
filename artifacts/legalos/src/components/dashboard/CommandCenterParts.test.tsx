import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// The two cards embedded in the right column load their own data; they're
// covered elsewhere and only need to be present here.
vi.mock("@/components/dashboard/Campaigns", () => ({ default: () => <div>campaigns-card</div> }));
vi.mock("@/components/dashboard/ClientWinLog", () => ({ default: () => <div>client-wins-card</div> }));
vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: { children?: ReactNode } & Record<string, unknown>) => {
    const { initial: _i, animate: _a, transition: _t, ...dom } = rest;
    return <div {...(dom as object)}>{children}</div>;
  } },
}));
const downloadScoreCard = vi.fn();
vi.mock("@/lib/visibilityScoreCard", () => ({ downloadScoreCard: (...a: unknown[]) => downloadScoreCard(...a) }));

import { DEMO_AUDIT } from "@/data/demoData";
import { computeMeasuredTotals } from "@/lib/measuredScore";
import ShareCardDialog, { shareHeadline } from "./ShareCardDialog";
import OngoingEndeavors, { timeAgo } from "./OngoingEndeavors";

const measured = computeMeasuredTotals(DEMO_AUDIT.categories as Parameters<typeof computeMeasuredTotals>[0]);

describe("ShareCardDialog", () => {
  beforeEach(() => downloadScoreCard.mockReset());

  it("renders nothing until it's open and the image exists", () => {
    const { container, rerender } = render(
      <ShareCardDialog open={false} imageUrl="data:x" audit={DEMO_AUDIT} measured={measured} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
    rerender(<ShareCardDialog open imageUrl={null} audit={DEMO_AUDIT} measured={measured} onClose={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows the card and downloads it, then closes", () => {
    const onClose = vi.fn();
    render(<ShareCardDialog open imageUrl="data:image/png;base64,x" audit={DEMO_AUDIT} measured={measured} onClose={onClose} />);
    expect(screen.getByAltText("Visibility score card")).toBeTruthy();
    fireEvent.click(screen.getByText("Download PNG"));
    expect(downloadScoreCard).toHaveBeenCalledWith(DEMO_AUDIT);
    expect(onClose).toHaveBeenCalled();
  });

  it("opens LinkedIn with the firm, its score and the app link", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ShareCardDialog open imageUrl="data:x" audit={DEMO_AUDIT} measured={measured} onClose={() => {}} />);
    fireEvent.click(screen.getByText("LinkedIn"));
    const url = decodeURIComponent(String(open.mock.calls[0][0]));
    expect(url).toContain(shareHeadline(DEMO_AUDIT, measured));
    expect(url).toContain(`${window.location.origin}/app/`);
    open.mockRestore();
  });

  it("shareHeadline names the firm and states the score on the 500 scale", () => {
    const line = shareHeadline(DEMO_AUDIT, measured);
    expect(line.startsWith(`${DEMO_AUDIT.display_name || DEMO_AUDIT.audited_domain} scored `)).toBe(true);
    expect(line).toMatch(/\d+ .*500/);
    expect(line.endsWith("on the Market Visibility Score")).toBe(true);
  });
});

describe("OngoingEndeavors", () => {
  const base = {
    readChaptersCount: 3, totalChapters: 30, maturityScore: null, battlePlanFilled: 2, runs: [],
    siteHealthIssues: [], audit: DEMO_AUDIT, history: [],
    onOpenGuidebook: () => {}, onOpenMaturity: () => {}, onOpenWorkshopTool: () => {},
  };

  it("shows progress, the empty Workshop state, and no site-health card without issues", () => {
    render(<OngoingEndeavors {...base} />);
    expect(screen.getByText("3/30 read")).toBeTruthy();
    expect(screen.getByText("Not run yet")).toBeTruthy();
    expect(screen.getByText("2/7 sections ready")).toBeTruthy();
    expect(screen.getByText(/Nothing run yet/)).toBeTruthy();
    expect(screen.queryByText("Site health")).toBeNull();
    expect(screen.getByText("campaigns-card")).toBeTruthy();
    expect(screen.getByText("client-wins-card")).toBeTruthy();
  });

  it("lists recent runs (newest five) and opens the tool on click", () => {
    const onOpenWorkshopTool = vi.fn();
    const runs = Array.from({ length: 7 }, (_, i) => ({
      id: `r${i}`, toolId: "headline" as const, toolLabel: "Headline Lab", title: `Run ${i}`,
      preview: "", createdAt: Date.now() - 5 * 60_000,
    }));
    render(<OngoingEndeavors {...base} maturityScore={62} runs={runs as never} siteHealthIssues={["No HTTPS"]} onOpenWorkshopTool={onOpenWorkshopTool} />);
    expect(screen.getByText("62% scored")).toBeTruthy();
    expect(screen.getAllByText(/^Run \d$/)).toHaveLength(5);
    fireEvent.click(screen.getByText("Run 0"));
    expect(onOpenWorkshopTool).toHaveBeenCalledWith("headline");
    expect(screen.getByText("No HTTPS")).toBeTruthy();
  });

  it("timeAgo rounds to minutes, hours, days", () => {
    const now = Date.now();
    expect(timeAgo(now - 5 * 60_000)).toBe("5m ago");
    expect(timeAgo(now - 3 * 3_600_000)).toBe("3h ago");
    expect(timeAgo(now - 2 * 86_400_000)).toBe("2d ago");
  });
});
