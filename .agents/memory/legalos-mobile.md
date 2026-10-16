---
name: LegalOS Mobile
description: Expo app artifact at artifacts/legalos-mobile, preview path /mobile/. Key decisions and structure.
---

## Structure
- 5 tabs: Score (index), Guidebook, Workshop, Rankings (leaderboard), Brief
- `context/DataContext.tsx` — demo data (DEMO_FIRM + LEADERBOARD, Serbia market) + live Supabase data when signed in
- `components/ScoreRing.tsx` — SVG ring (reanimated arc) + AnimatedNumber center count-up
- `components/TodayFocusCards.tsx` — swipe deck with custom Pan gesture physics (do NOT migrate to PressableScale)

## Interaction conventions (craft pass, 2026-08-15)
- ALL tappables use `components/PressableScale.tsx` (spring press-scale + Light haptic) — never TouchableOpacity fades or bare Pressables; no-op presses are fake affordances, remove the wrapper instead.
- Headline numbers count up via `components/AnimatedNumber.tsx` (extracted from ScoreRing) — never snap a watched number.
- Semantic hues live in constants/colors.ts (WARNING/SUCCESS/INFO/GOLD_DEEP/TIER_COLORS) — no hardcoded hexes in screens (ShareCard's brand-literal canvas and LogoMark's gold default are intentional exceptions).
- Haptics are native-only inside PressableScale (web = navigator.vibrate, never wanted on click); behavioral pins in lib/pressableScale.test.tsx.

**Why:** the app targets an Apple-grade feel; consistency of touch physics and number motion is what makes it read as one product.

## Color palette (constants/colors.ts)
Both light and dark set to the same dark theme (always dark):
- background: #0B0F1E, card: #111828, primary (gold): #C4A035, foreground (cream): #EDE8DD, border: #1C2240

## Data
- Supabase OTP auth + live data ARE wired (see mobile-supabase-auth.md); demo data shows only when provably signed out (mobile-demo-gating.md).

## Packages already in scaffold
react-native-svg (15.12.1), react-native-reanimated (~4.1.1), @expo/vector-icons, expo-haptics, expo-blur, expo-glass-effect, expo-symbols — all pre-installed, no extra installs needed.

## Expo SDK upgrades
Keep the workspace `react` and `react-dom` catalog versions exactly aligned with the version required by the mobile Expo SDK, even when the web artifacts also consume that catalog.

**Why:** a mobile-only React bump leaves pnpm with two React installations through shared packages such as React Query; Expo Doctor rejects that state and native runtime behavior can become unstable.

**How to apply:** after every Expo SDK upgrade, update the shared catalog, run a workspace install, then require both `expo install --check` and a 21/21 Expo Doctor result before restarting the mobile workflow.

On Replit's NixOS runtime, SDK 57 may print a missing `libglib-2.0.so.0` error while trying to launch the optional React Native DevTools shell. This is non-blocking when Metro continues to the QR URL and the app bundle renders; do not confuse it with a Metro startup failure.
