interface EdgeCurveProps {
  position: "top" | "bottom";
}

export default function EdgeCurve({ position }: EdgeCurveProps) {
  const isBottom = position === "bottom";
  
  // Top: mostly straight neon line with very subtle dip (20px) to cradle nav
  // Bottom: inverse - mostly straight with subtle rise (peak) in center for BOOK A PC button
  // Old version had 60px dip (18 -> 78) which looked silly. New version 24px max.
  
  const topPath = "M0,32 L1600,32"; // Simple straight line - elegant frame
  const bottomPathWithPeak = "M0,60 C300,60 380,24 550,24 L1050,24 C1220,24 1300,60 1600,60";
  // For top we want straight, for bottom we want central plateau rising
  
  const d = isBottom ? bottomPathWithPeak : topPath;
  
  return (
    <svg
      className={`pointer-events-none absolute left-0 w-full ${isBottom ? "bottom-0" : "top-0"}`}
      style={{ height: isBottom ? "76px" : "52px" }}
      viewBox="0 0 1600 90"
      preserveAspectRatio="none"
      fill="none"
    >
      {/* Glow blur layer */}
      <path
        d={d}
        stroke="url(#edgeGlow)"
        strokeWidth="8"
        fill="none"
        opacity="0.18"
        style={{ filter: "blur(8px)" }}
      />
      {/* Main neon line */}
      <path
        d={d}
        stroke="url(#edgeGradient)"
        strokeWidth="1.5"
        fill="none"
        style={{ filter: "drop-shadow(0 0 8px rgba(179,102,255,0.9)) drop-shadow(0 0 16px rgba(255,207,92,0.4))" }}
        opacity="0.9"
      />
      {/* Inner thin highlight */}
      <path
        d={d}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.6"
        fill="none"
        opacity="0.5"
      />
      <defs>
        <linearGradient id="edgeGradient" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffcf5c" stopOpacity="0.6" />
          <stop offset="18%" stopColor="#b366ff" stopOpacity="1" />
          <stop offset="50%" stopColor="#7dd3fc" stopOpacity="1" />
          <stop offset="82%" stopColor="#b366ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffcf5c" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="edgeGlow" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b366ff" />
          <stop offset="50%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#b366ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
