import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const reportError = vi.fn();
vi.mock("@/lib/errorReporting", () => ({ reportError: (...a: unknown[]) => reportError(...a) }));

import { AppErrorBoundary } from "./AppErrorBoundary";

const Boom = () => {
  throw new Error("render failed");
};

describe("AppErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(<AppErrorBoundary><p>fine</p></AppErrorBoundary>);
    expect(screen.getByText("fine")).toBeTruthy();
  });

  it("shows a way forward instead of a blank page, and reports the error", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AppErrorBoundary><Boom /></AppErrorBoundary>);
    quiet.mockRestore();
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeTruthy();
    expect(reportError).toHaveBeenCalledTimes(1);
    const [err, source] = reportError.mock.calls[0];
    expect(source).toBe("boundary");
    expect((err as Error).message).toBe("render failed");
    expect((err as Error).stack).toContain("Component stack:");
  });
});
