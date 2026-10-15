---
name: Parallel subagent file stomp
description: A write-subagent running concurrently with my own edits reverted files it was told not to touch — sequence, don't parallelize, same-artifact writes.
---

While a `general` write-subagent swept files in an artifact, I edited two other files in the same artifact concurrently. The subagent snapshotted/restored state around its own typecheck runs and silently reverted most of my in-flight edits on files outside its scope (only the edits applied before it started survived).

**Why:** lost ~15 applied edits with no error; surfaced only as "Cannot find name" typecheck errors that looked like my own half-finished work.

**How to apply:** when delegating write work to a subagent, either (a) finish and commit your own edits in that artifact BEFORE dispatching, or (b) let the subagent finish before editing anything in the same artifact. Disjoint-artifact parallelism is safe; same-artifact is not, even with disjoint file lists. After collecting a subagent's results, `git status` + a targeted grep of your own recent edits is the cheap integrity check.
