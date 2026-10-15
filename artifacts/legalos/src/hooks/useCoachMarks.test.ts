import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCoachMarks, resetTourForFreshShowcase, type TourVariant } from "./useCoachMarks";

const KEY = "legalos_tour_progress";
const LEGACY_KEY = "legalos_coachmarks_seen";
// Both variants walk the same steps now; only the closing hand-off differs.
const DEMO_STEPS = 6;
const ACCOUNT_STEPS = 6;

const mount = (variant: TourVariant = "demo") => renderHook(() => useCoachMarks(variant));

describe("useCoachMarks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts clean on a first run", () => {
    const { result } = mount();
    expect(result.current.hasSeen()).toBe(false);
    expect(result.current.isResumable()).toBe(false);
    expect(result.current.isOffered()).toBe(false);
    expect(result.current.active).toBe(false);
  });

  it("starts from the beginning when there is no saved progress", () => {
    const { result } = mount();
    act(() => result.current.start(DEMO_STEPS));
    expect(result.current.active).toBe(true);
    expect(result.current.startStep).toBe(0);
  });

  // The behaviour the single "seen" flag couldn't express: a tour interrupted
  // partway through used to disappear for good, because the flag was only
  // written at the very end and the trigger that started it was one-shot.
  it("resumes an interrupted tour at the step it reached", () => {
    const { result } = mount();
    act(() => result.current.start(DEMO_STEPS));
    act(() => result.current.recordStep(3));

    // A refresh: fresh hook, same storage.
    const reopened = mount();
    expect(reopened.result.current.isResumable()).toBe(true);
    expect(reopened.result.current.hasSeen()).toBe(false);
    act(() => reopened.result.current.start(DEMO_STEPS));
    expect(reopened.result.current.startStep).toBe(3);
  });

  it("treats a finished tour as seen and no longer resumable", () => {
    const { result } = mount();
    act(() => result.current.start(DEMO_STEPS));
    act(() => result.current.recordStep(2));
    act(() => result.current.finish());

    expect(result.current.active).toBe(false);
    const reopened = mount();
    expect(reopened.result.current.hasSeen()).toBe(true);
    expect(reopened.result.current.isResumable()).toBe(false);
  });

  // "Skip" and "Done" both mean don't interrupt me again — not never show me
  // this. Replay has to work regardless of how the last run ended.
  it("replays from the start after the tour was finished or skipped", () => {
    const { result } = mount();
    act(() => result.current.start(DEMO_STEPS));
    act(() => result.current.recordStep(4));
    act(() => result.current.finish());

    act(() => result.current.restart());
    expect(result.current.active).toBe(true);
    expect(result.current.startStep).toBe(0);
  });

  it("migrates someone who completed the tour under the old flag", () => {
    localStorage.setItem(LEGACY_KEY, "1");
    const { result } = mount();
    expect(result.current.hasSeen()).toBe(true);
    expect(result.current.isResumable()).toBe(false);
    // Migrated, not merely read — the old key is retired so it can't
    // resurrect a "done" state after a legitimate replay.
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toContain('"done"');
  });

  it("falls back to a first run when stored progress is unreadable", () => {
    localStorage.setItem(KEY, "not json");
    const { result } = mount();
    expect(result.current.hasSeen()).toBe(false);
    expect(result.current.isResumable()).toBe(false);
  });

  it.each([
    ["an unknown status", { v: 2, status: "halfway", step: 1, variant: "demo" }],
    ["a fractional step", { v: 2, status: "running", step: 1.5, variant: "demo" }],
    ["a negative step", { v: 2, status: "running", step: -3, variant: "demo" }],
    ["an unknown variant", { v: 2, status: "running", step: 1, variant: "trial" }],
    ["an older schema", { v: 1, status: "running", step: 1, variant: "demo" }],
  ])("ignores stored progress with %s", (_label, stored) => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    const { result } = mount();
    expect(result.current.hasSeen()).toBe(false);
    expect(result.current.isResumable()).toBe(false);
  });

  // The variants are free to diverge in length again (demo carried an extra
  // framing slide until that framing moved to the welcome screen). Resuming
  // across the two could mount the overlay on a step that doesn't exist:
  // invisible, undismissable, and still holding back everything that waits
  // for the tour to finish.
  it("does not resume one variant's tour into the other", () => {
    const demo = mount("demo");
    act(() => demo.result.current.start(DEMO_STEPS));
    act(() => demo.result.current.recordStep(DEMO_STEPS - 1));

    const account = mount("account");
    expect(account.result.current.isResumable()).toBe(false);
    act(() => account.result.current.start(ACCOUNT_STEPS));
    expect(account.result.current.startStep).toBe(0);
  });

  it("clamps a saved step that is past the end of the current tour", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, status: "running", step: 99, variant: "demo" }));
    const { result } = mount("demo");
    act(() => result.current.start(DEMO_STEPS));
    expect(result.current.startStep).toBe(DEMO_STEPS - 1);
  });

  it("keeps progress out of React state so the start step is stable mid-tour", () => {
    const { result, rerender } = mount();
    act(() => result.current.start(DEMO_STEPS));
    act(() => result.current.recordStep(2));
    rerender();
    // Recording a step must not move the overlay's starting point under it.
    expect(result.current.startStep).toBe(0);
    expect(result.current.active).toBe(true);
  });

  // Offering the tour must not start it — the whole point of the welcome is
  // that nothing takes over the screen until the visitor says yes.
  it("does not start the tour merely by offering it", () => {
    const { result } = mount();
    act(() => result.current.offer());
    expect(result.current.active).toBe(false);
    expect(result.current.isOffered()).toBe(true);
  });

  // An unanswered question that isn't persisted is a question that gets
  // silently dropped: the flag that raises the welcome is a one-shot, so a
  // reload would otherwise leave the visitor with neither welcome nor tour.
  it("re-raises an unanswered welcome after a reload", () => {
    const { result } = mount();
    act(() => result.current.offer());

    const reopened = mount();
    expect(reopened.result.current.isOffered()).toBe(true);
    expect(reopened.result.current.hasSeen()).toBe(false);
    expect(reopened.result.current.isResumable()).toBe(false);
  });

  it("treats 'just explore' as answered and never asks again", () => {
    const { result } = mount();
    act(() => result.current.offer());
    act(() => result.current.decline());

    const reopened = mount();
    expect(reopened.result.current.hasSeen()).toBe(true);
    expect(reopened.result.current.isOffered()).toBe(false);
    expect(reopened.result.current.isResumable()).toBe(false);
  });

  // Declining means "don't interrupt me again", not "never show me this".
  it("replays on demand after the welcome was declined", () => {
    const { result } = mount();
    act(() => result.current.offer());
    act(() => result.current.decline());

    act(() => result.current.restart());
    expect(result.current.active).toBe(true);
    expect(result.current.startStep).toBe(0);
  });

  it("does not carry one variant's pending welcome into the other", () => {
    const demo = mount("demo");
    act(() => demo.result.current.offer());

    const account = mount("account");
    expect(account.result.current.isOffered()).toBe(false);
  });

  // v2 → v3 only added the `offered` status, so v2 records still describe
  // states v3 understands. Discarding them would re-offer the tour to
  // everyone who had already sat through it — the exact nag this change
  // exists to remove.
  it("keeps a tour finished under the previous schema finished", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, status: "done", step: 0, variant: "demo" }));
    const { result } = mount("demo");
    expect(result.current.hasSeen()).toBe(true);
    expect(result.current.isOffered()).toBe(false);
  });

  // The migration must not become a way to smuggle in a state the old schema
  // could never have produced: v2 had no `offered`, so a record claiming one
  // was hand-edited, not written by a previous version of this app.
  it("rejects a previous-schema record claiming a status that schema never had", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, status: "offered", step: 0, variant: "demo" }));
    const { result } = mount("demo");
    expect(result.current.isOffered()).toBe(false);
    expect(result.current.hasSeen()).toBe(false);
    expect(result.current.isResumable()).toBe(false);
  });

  it("resumes a tour left running under the previous schema", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, status: "running", step: 3, variant: "demo" }));
    const { result } = mount("demo");
    expect(result.current.isResumable()).toBe(true);
    act(() => result.current.start(DEMO_STEPS));
    expect(result.current.startStep).toBe(3);
  });

  // The access-code contract: entering the showcase via a code is a fresh
  // sales session, so the welcome + tour must greet the visitor even when
  // this browser finished (or dismissed) the tour on an earlier visit. The
  // stored "done" lives in localStorage and would otherwise veto it forever.
  it("greets a fresh showcase entry even after the tour was finished", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 3, status: "done", step: 0, variant: "demo" }));
    resetTourForFreshShowcase();

    const { result } = mount("demo");
    expect(result.current.hasSeen()).toBe(false);
    expect(result.current.isOffered()).toBe(false);
    expect(result.current.isResumable()).toBe(false);
  });

  // A fresh grant also mustn't resume a tour interrupted in some earlier
  // showcase session — the new visitor starts clean, not mid-way through
  // someone else's walkthrough.
  it("starts a fresh showcase entry clean rather than resuming an old interruption", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 3, status: "running", step: 3, variant: "demo" }));
    resetTourForFreshShowcase();

    const { result } = mount("demo");
    expect(result.current.isResumable()).toBe(false);
    expect(result.current.hasSeen()).toBe(false);
  });

  // The full regression sequence from code review: account tour done → fresh
  // showcase grant → the account side is untouched, the demo side greets.
  it("resets only the demo side when an account holder enters the showcase", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 3, status: "done", step: 0, variant: "account" }));
    resetTourForFreshShowcase();

    const account = mount("account");
    expect(account.result.current.hasSeen()).toBe(true);

    const demo = mount("demo");
    expect(demo.result.current.hasSeen()).toBe(false);
    expect(demo.result.current.isResumable()).toBe(false);
  });

  // Variants keep independent "seen" state: finishing the fictional-firm demo
  // tour says nothing about whether a real account has been walked through
  // its own dashboard — that welcome must still fire on first real login.
  it("does not let a finished demo tour suppress the account welcome", () => {
    const demo = mount("demo");
    act(() => demo.result.current.start(DEMO_STEPS));
    act(() => demo.result.current.finish());

    const account = mount("account");
    expect(account.result.current.hasSeen()).toBe(false);
    expect(account.result.current.isResumable()).toBe(false);
  });
});
