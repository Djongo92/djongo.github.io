import { motion, LayoutGroup } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

/**
 * iOS-style segmented control with a sliding selection pill.
 * Uses backdrop-blur translucent track and spring-eased pill motion.
 */
function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const padY = size === "sm" ? "py-1" : "py-1.5";
  const padX = size === "sm" ? "px-2.5" : "px-3.5";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <LayoutGroup id={groupId}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "relative inline-flex items-center gap-0.5 rounded-full p-0.5",
          "bg-muted/60 backdrop-blur-xl",
          "border border-border/40",
          "shadow-[inset_0_0_0_0.5px_hsl(var(--foreground)/0.04)]",
          className,
        )}
      >
        {options.map((opt, i) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-body font-medium tracking-tight",
                "transition-colors duration-200",
                padX,
                padY,
                textSize,
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={`segmented-pill-${groupId}`}
                  className={cn(
                    "absolute inset-0 -z-10 rounded-full bg-background",
                    "shadow-[0_1px_2px_hsl(var(--foreground)/0.08),0_2px_8px_hsl(var(--foreground)/0.06),inset_0_0_0_0.5px_hsl(var(--foreground)/0.06)]",
                  )}
                  transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                />
              )}
              {opt.icon && <span className="inline-flex shrink-0">{opt.icon}</span>}
              <span className="relative">{opt.label}</span>
              {/* subtle vertical divider between inactive segments */}
              {i < options.length - 1 && !isActive && options[i + 1].value !== value && (
                <span className="absolute right-[-1px] top-1/2 -translate-y-1/2 h-3 w-px bg-border/50" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export { SegmentedControl };