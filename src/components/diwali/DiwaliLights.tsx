import { memo, useMemo } from "react";

interface LittleBulbDef {
  x: number; // percentage across width (0 - 100)
  y: number; // px from top along catenary sag
  color: string;
  glowColor: string;
  animationPattern: string; // One of the 4 random festive glow patterns
  duration: number;
  delay: number;
}

const ANIMATION_PATTERNS = [
  "fairyTwinkleGentle",
  "fairyTwinkleFast",
  "fairyTwinklePulse",
  "fairyTwinkleShimmer",
];

export const DiwaliLights = memo(function DiwaliLights() {
  // Series of 36 delicate little warm yellow rice bulbs with random glow patterns
  const bulbs = useMemo<LittleBulbDef[]>(() => {
    // Rich warm golden-yellow series palette
    const warmPalette = [
      { color: "#FFD166", glow: "rgba(255, 209, 102, 0.7)" },  // Warm gold
      { color: "#FFBE0B", glow: "rgba(255, 190, 11, 0.75)" },  // Amber gold
      { color: "#FFEAA7", glow: "rgba(255, 234, 167, 0.65)" }, // Champagne gold
      { color: "#FFC043", glow: "rgba(255, 192, 67, 0.7)" },   // Sunburst honey
      { color: "#FDB813", glow: "rgba(253, 184, 19, 0.75)" },  // Saffron gold
    ];

    const list: LittleBulbDef[] = [];
    const totalBulbs = 36;

    for (let i = 0; i < totalBulbs; i++) {
      const pct = (i / (totalBulbs - 1)) * 100;
      // 4 draped hanging series arcs across the width
      const sectionPct = (pct % 25) / 25;
      const sag = Math.sin(sectionPct * Math.PI) * 20; // 20px gentle sag
      const y = 6 + sag;
      const colorObj = warmPalette[i % warmPalette.length]!;

      // Pseudo-random pattern, duration and delay based on index
      const patternIndex = (i * 7 + 3) % ANIMATION_PATTERNS.length;
      const animationPattern = ANIMATION_PATTERNS[patternIndex]!;
      const duration = 1.4 + ((i * 11) % 9) * 0.18; // 1.4s to 2.8s
      const delay = ((i * 13) % 23) * 0.12; // 0s to 2.7s

      list.push({
        x: pct,
        y,
        color: colorObj.color,
        glowColor: colorObj.glow,
        animationPattern,
        duration,
        delay,
      });
    }
    return list;
  }, []);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 right-0 z-30 overflow-hidden select-none h-16 sm:h-20"
      aria-hidden="true"
    >
      {/* Delicate dark bronze series wire across top */}
      <svg
        className="absolute top-0 left-0 w-full h-14 pointer-events-none"
        viewBox="0 0 1000 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="seriesWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2c1e10" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#4a341c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#2c1e10" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* 4 draped thin series wire arcs */}
        <path
          d="M 0,6 Q 125,26 250,6 Q 375,26 500,6 Q 625,26 750,6 Q 875,26 1000,6"
          fill="none"
          stroke="url(#seriesWireGrad)"
          strokeWidth="1.2"
        />
      </svg>

      {/* Series of little warm yellow bulbs with random glow patterns */}
      {bulbs.map((bulb, idx) => (
        <div
          key={idx}
          className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{
            left: `${bulb.x}%`,
            top: `${bulb.y}px`,
            willChange: "transform, opacity",
          }}
        >
          {/* Tiny wire connector clip */}
          <div className="w-1 h-0.5 rounded-t-xs bg-[#4a3520]" />

          {/* Little warm yellow rice bulb (delicate capsule with randomized glow pattern) */}
          <div
            className="relative w-1.5 h-2.5 sm:w-2 sm:h-3 rounded-full"
            style={{
              backgroundColor: bulb.color,
              boxShadow: `0 0 5px 1.5px ${bulb.glowColor}`,
              animation: `${bulb.animationPattern} ${bulb.duration}s ease-in-out ${bulb.delay}s infinite alternate`,
            }}
          >
            {/* Little white-hot filament center */}
            <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white opacity-80" />
          </div>
        </div>
      ))}
    </div>
  );
});
