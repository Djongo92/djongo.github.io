// A generated placeholder for a firm that hasn't uploaded a logo yet —
// initials over one of three subtle geometric motifs, all inside the same
// gold/primary family so it reads as "this app's chrome," not a random
// avatar color. The motif is chosen deterministically from the firm name
// (a simple hash), so the same firm always gets the same crest instead of
// a different one on every render.
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function hashOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

interface FirmCrestProps {
  name: string;
  size?: number;
  className?: string;
}

const FirmCrest = ({ name, size = 32, className = "" }: FirmCrestProps) => {
  const hash = hashOf(name || "Firm");
  const motif = hash % 3;
  const id = `crest-${hash}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`rounded-sm shrink-0 ${className}`}
      role="img"
      aria-label={`${name} logo placeholder`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--gold-light))" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="4" fill={`url(#${id})`} />
      {motif === 0 && (
        <circle cx="16" cy="16" r="12" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
      )}
      {motif === 1 && (
        <path d="M0 24 L24 0 M8 32 L32 8" stroke="white" strokeOpacity="0.14" strokeWidth="1.5" />
      )}
      {motif === 2 && (
        <g fill="white" fillOpacity="0.14">
          <circle cx="6" cy="6" r="1.2" />
          <circle cx="16" cy="6" r="1.2" />
          <circle cx="26" cy="6" r="1.2" />
          <circle cx="6" cy="26" r="1.2" />
          <circle cx="16" cy="26" r="1.2" />
          <circle cx="26" cy="26" r="1.2" />
        </g>
      )}
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="13"
        fontWeight={600}
        fill="hsl(var(--primary-foreground))"
      >
        {initials(name)}
      </text>
    </svg>
  );
};

export default FirmCrest;
