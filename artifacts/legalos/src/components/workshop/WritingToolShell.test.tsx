import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ArticleDrafter, PressPitchBuilder } from "./writingTools";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useFirmContext", () => ({ useFirmContext: () => ({ context: null }) }));
vi.mock("@/lib/demoMode", () => ({ isDemoMode: () => false }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));

afterEach(() => vi.unstubAllGlobals());

const sse = (text: string) =>
  new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`, { status: 200 });

describe("writing tool shell", () => {
  it("keeps the button disabled until the required field is filled", () => {
    render(<ArticleDrafter />);
    const btn = screen.getByRole("button", { name: /draft the article/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/new data-protection amendments/i), { target: { value: "New law" } });
    expect(btn).toBeEnabled();
  });

  it("posts the form to its own endpoint and shows the streamed draft", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sse("## Headline options\nA draft"));
    vi.stubGlobal("fetch", fetchMock);
    render(<PressPitchBuilder />);
    fireEvent.change(screen.getByPlaceholderText(/advised a regional lender/i), { target: { value: "A deal" } });
    fireEvent.click(screen.getByRole("button", { name: /build the pitch/i }));
    await waitFor(() => expect(screen.getByText("A draft")).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/functions/v1/workshop-press-pitch");
    expect(JSON.parse(init.body).story).toBe("A deal");
  });
});
