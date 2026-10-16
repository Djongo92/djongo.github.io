---
name: Firm private audits vs census rows — two score realities
description: A firm can have both a private account audit and a published census audit for the same domain; the signed-in dashboard only ever reads the private one, so the two surfaces can diverge badly.
---

# Firm private audits vs census rows

A firm can have two audit rows for the same domain+market: the published **census row** (system identity, full provider coverage, feeds the public Visibility Index) and their **own private row** (from interactive audits, feeds the signed-in Command Center). The signed-in view selects by the firm's own identity only — it can never see the census row, and the public index never sees the private one.

**Why:** Observed Aug 2026: a firm's private audit ran during a provider outage and stored two categories as "missing"; the measured-totals rule rescaled it to 390/500 while their published census row (fully measured) stood at 32% publicly. The firm saw a *higher* number signed in than the market saw — a credibility trap mid-sales-call.

**How to apply:** When someone reports "score X in the app vs Y on the leaderboard," check both rows before assuming a scaling bug — it's usually different audits AND different denominators (full scale vs measured-only rescale). Any fix to how the dashboard picks an audit must reckon with the census row living under a different identity.
