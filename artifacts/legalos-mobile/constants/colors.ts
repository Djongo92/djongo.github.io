/**
 * Uvid Mobile — dark navy/gold palette matching the web app.
 * Both light and dark are set to the same dark theme so the app
 * is always dark regardless of system appearance.
 */

const NAVY       = '#0B0F1E';
const CARD       = '#111828';
const CARD2      = '#182036';
const GOLD       = '#C49C36';
const CREAM      = '#EDE8DD';
const MUTED_FG   = '#7A7F96';
const BORDER     = '#1C2240';

const theme = {
  text: CREAM,
  tint: GOLD,
  background: NAVY,
  foreground: CREAM,
  card: CARD,
  cardForeground: CREAM,
  primary: GOLD,
  primaryForeground: NAVY,
  secondary: CARD2,
  secondaryForeground: CREAM,
  muted: CARD2,
  mutedForeground: MUTED_FG,
  accent: GOLD,
  accentForeground: NAVY,
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: BORDER,
  input: BORDER,
};

const colors = {
  light: theme,
  dark: theme,
  radius: 4,
};

export default colors;

/**
 * Semantic one-off hues — status signals and the score-tier ramp. Every
 * screen imports these instead of hardcoding a hex, so a stale flag reads
 * the same amber everywhere and the tier ramp can't drift between the
 * Score tab, the leaderboard, and share cards.
 */
export const WARNING = '#f59e0b';
export const SUCCESS = '#4BAF8A';
export const INFO = '#5B8AF0';
export const GOLD_DEEP = '#C4A035';

/** Score-tier ramp used by the ring and any tier-colored surface (high → low). */
export const TIER_COLORS = {
  blue: INFO,
  purple: '#7C6FE0',
  gold: GOLD_DEEP,
  green: SUCCESS,
  orange: '#E07C4A',
} as const;
