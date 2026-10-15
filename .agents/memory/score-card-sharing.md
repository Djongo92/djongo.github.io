---
name: Score card social sharing
description: How the share dialog works in CommandCenter.tsx after the upgrade.
---

## What was built
The share preview dialog in CommandCenter.tsx (around lines 884–930) now has:
1. LinkedIn share button — opens linkedin.com/sharing/share-offsite with pre-filled text + URL
2. X/Twitter share button — opens twitter.com/intent/tweet with score + firm name text
3. Copy link button — copies `${window.location.origin}/app/` to clipboard, shows "Copied!" feedback via `copiedLink` state
4. Download PNG — triggers downloadScoreCard(primary) from visibilityScoreCard.ts

## State added to CommandCenter
- `copiedLink: boolean` — drives the copy button feedback, resets after 2s via setTimeout

## Share URL used
`${window.location.origin}/app/` — the root of the app (Index page = leaderboard/dashboard).
There is no separate /leaderboard route; the main dashboard at / IS the leaderboard.

**Why:** No brand icon library in the project; LinkedIn/X logos are inline SVG paths in the button JSX.
