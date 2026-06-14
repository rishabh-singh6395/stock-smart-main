import { motion } from "framer-motion";
import React from "react";

export default function Sparkline({ data = [], color = "#ffffff" }: { data?: number[]; color?: string }) {
  const width = 120;
  const height = 40;
  if (!data || data.length === 0) return <svg width={width} height={height} />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="sgrad" x1="0" x2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={points}
        fill="url(#sgrad)"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        style={{ vectorEffect: 'non-scaling-stroke' }}
      />
    </svg>
  );
}
