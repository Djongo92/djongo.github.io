---
name: Headless browser testing on Replit NixOS
description: How to run real-browser interaction tests (mobile viewport, forms, drawers) in this workspace
---

Prebuilt Chromium binaries (`@sparticuz/chromium`, playwright's downloads) fail on NixOS with `libnspr4.so: cannot open shared object file`.

**Working recipe:** install the `chromium` nix system dependency, then drive it with `playwright-core`:

```js
const { chromium } = require('playwright-core');
const b = await chromium.launch({ executablePath: execSync('which chromium').toString().trim(), args: ['--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
```

**Why:** nix chromium links against the workspace's own libs; downloaded binaries expect Debian paths.

**The script file must physically live inside the artifact directory** (e.g. `artifacts/legalos-marketing/probe.cjs`), because `playwright-core` is a dependency of that one package, not the workspace root. Writing the script to `/tmp` and running it with cwd set to the artifact still fails with `MODULE_NOT_FOUND` — node resolves `node_modules` by walking up from the *script's own path*, not from cwd. Write it into the artifact, run it, delete it.

**How to apply:** any time a task needs interactive verification (open drawers, submit forms, check horizontal overflow via `document.documentElement.scrollWidth > window.innerWidth`) rather than the static Screenshot tool. Target `http://localhost:80/<artifact path>`; make sure all involved workflows (marketing, app, api-server) are running first — 502s from a sibling artifact look like frontend bugs otherwise. Also: dev DB schema may need `pnpm --dir lib/db run push` before API form endpoints work.

**Overlay interception in the web app:** on a fully seeded demo, the Battle Plan page pops a badge MilestoneCelebration modal that intercepts all clicks — pre-seed `legalos_battleplan_badges_seen` with all badge ids (and `legalos_tour_progress` status "done", sessionStorage `legalos_showcase_grant` + `guidebook_personalize_seen`) via addInitScript to keep the screen clear; the fixed ShowcaseBar can also intercept sidebar clicks (use force:true).

**Recharts tooltip hover flakiness in the Playwright testing subagent:** a single `hover()` on a recharts `<Line>` dot often fails to trigger the tooltip, or does so on only one of several visually identical charts using the exact same tooltip/dot component. Before concluding "the tooltip is broken for category X," check whether at least one chart using the *same shared component* succeeded — if so, treat the failures as automated-hover flakiness (needs slow/incremental mousemove, not a single jump) rather than a real bug, and don't keep re-running the same check.
