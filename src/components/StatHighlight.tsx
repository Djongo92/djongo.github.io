import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface StatHighlightProps {
  value: string;
  label: string;
  suffix?: string;
}

const StatHighlight = ({ value, label, suffix = "" }: StatHighlightProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState("0");
  const numericValue = parseInt(value.replace(/[^0-9]/g, ""));

  useEffect(() => {
    if (!isInView || isNaN(numericValue)) {
      if (isInView) setDisplayValue(value);
      return;
    }

    let start = 0;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (numericValue - start) * eased);
      setDisplayValue(value.replace(/[0-9]+/, String(current)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, numericValue, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="text-center py-8 my-6 border-y border-border/30"
    >
      <div className="font-display text-5xl md:text-6xl font-bold text-primary mb-2">
        {displayValue}{suffix}
      </div>
      <p className="font-body text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
};

export default StatHighlight;
