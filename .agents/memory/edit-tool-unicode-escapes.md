---
name: Edit tool vs literal unicode escapes in source
description: Edit tool old_string silently fails when the file contains literal \u2014-style escapes — JSON decoding turns your pattern into the real character.
---

When a source file literally contains an escape sequence like `\u2014` (backslash-u, six characters — common in .tsx string literals), an Edit tool call whose `old_string` includes `\u2014` will NOT match: the tool-call JSON layer decodes it to the actual "—" character before the comparison.

**Why:** two layers of escaping — the file stores the raw escape; the tool parameter is JSON, where `\u2014` is a decoded character.

**How to apply:** when editing near literal escapes, anchor `old_string` on plain ASCII text adjacent to the escape (e.g. match `2 of 5 categories",` instead of `audit \u2014 2 of 5`), or rewrite via `node -e` with a regex. If an Edit unexpectedly reports "did not appear verbatim" on a string you can see in the file, suspect an embedded escape first.
