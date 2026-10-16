// Batch-regeneration loop for the Deck Builder's "apply roast fixes to all
// slides" action. Factored out of PitchDeck.tsx so the partial-failure
// contract is unit-testable: every slide is attempted even after a failure,
// and the caller receives the exact set of slides that did not regenerate —
// it must NOT report success or clear the fixes while any remain.
export async function applyToAllSlides(
  count: number,
  regen: (index: number) => Promise<boolean>,
): Promise<number[]> {
  const failed: number[] = [];
  for (let i = 0; i < count; i++) {
    const ok = await regen(i);
    if (!ok) failed.push(i);
  }
  return failed;
}
