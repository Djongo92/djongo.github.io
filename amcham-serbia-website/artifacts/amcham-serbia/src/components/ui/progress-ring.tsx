import React from 'react';
import { motion } from 'framer-motion';

export function ProgressRing({ percent, size = 120, stroke = 10, color = '#40D9F1', trackColor = 'rgba(255,255,255,0.15)', label }: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {label ?? <span className="text-3xl font-serif font-light">{Math.round(percent)}%</span>}
      </div>
    </div>
  );
}
