import { SVGProps } from "react";

/**
 * Bespoke monoline workshop icon set.
 * 24x24, stroke-only, currentColor, 1.25 stroke width.
 * Designed to feel hand-drafted next to the serif display type.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Svg = ({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const SwipeIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3" width="13" height="17" rx="1.5" />
    <path d="M7 8h7M7 11h7M7 14h4" />
    <path d="M17 6l3 1v14l-3-1" />
  </Svg>
);

export const CopywriterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19l8-15 8 15" />
    <path d="M7.5 13h9" />
    <circle cx="12" cy="20" r="0.6" fill="currentColor" />
  </Svg>
);

export const RewriteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 17l9-9 3 3-9 9H4z" />
    <path d="M14 6l2-2 4 4-2 2" />
    <path d="M3 21h7" />
  </Svg>
);

export const AutopsyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M15.5 15.5L20 20" />
    <path d="M8 11h6M11 8v6" />
  </Svg>
);

export const AuditIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M8 8h8M8 11h8M8 14l1.2 1.2L12 12.4M14 17h3" />
  </Svg>
);

export const HeadlinesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 21V3l6 4 6-4v18" />
    <path d="M9 11h6" />
  </Svg>
);

export const TeardownIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4v16M4 12h16" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </Svg>
);

export const PitchDeckIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
    <path d="M7 12l3-3 2 2 4-4" />
  </Svg>
);

export const BioIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <circle cx="12" cy="10" r="2.5" />
    <path d="M7.5 17c1-2.2 3-3.3 4.5-3.3s3.5 1.1 4.5 3.3" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="1.5" />
    <path d="M4 10h16M8 3v4M16 3v4" />
    <circle cx="9" cy="14" r="0.8" fill="currentColor" />
    <circle cx="13" cy="14" r="0.8" fill="currentColor" />
    <circle cx="17" cy="14" r="0.8" fill="currentColor" />
  </Svg>
);