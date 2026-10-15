---
name: AI stress injection legs
description: Live prompt-injection canary legs for paste paths in the AI tools stress harness
---
Rule: a live injection leg must prove the pasted payload actually reached the model. roast-homepage's pastedCopy replaces the fetch unconditionally, but competitor-analysis consults its pastedCopies map ONLY when the URL's fetch errored or returned no text. Pair the injection copy with a guaranteed-unresolvable `.invalid` (RFC 2606) URL in both competitorUrls and the pastedCopies key.

**Why:** with a fetchable URL (e.g. example.org) the paste is silently ignored — the canary scan runs against fetched content and the "proof" is vacuous; a completion review rejected exactly that.

**How to apply:** when adding an injection leg for any tool with a paste fallback, first check whether paste replaces or merely backfills the fetch; verify by inspecting the saved output for the pasted copy's distinctive content.
