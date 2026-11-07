import { memo } from "react";

export const DiwaliBackgroundPatterns = memo(function DiwaliBackgroundPatterns() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Deep festive night sky tint overlay */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-65"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(58, 12, 86, 0.45) 0%, rgba(26, 8, 42, 0.3) 50%, rgba(15, 6, 24, 0.5) 100%)",
        }}
      />

      {/* Repeating Diwali Rangoli/Floral Pattern matching the reference screenshots */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07] dark:opacity-[0.09]"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="diwaliMotifPattern"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            {/* Center Rangoli Motif */}
            <g transform="translate(40, 40)" stroke="#ffd166" strokeWidth="1" fill="none">
              {/* Center miniature circle */}
              <circle cx="0" cy="0" r="3" fill="#ffd166" fillOpacity="0.4" />

              {/* 4 diamond petal curves (North, South, East, West) */}
              <path d="M 0,-3 C 3.5,-9 5,-15 0,-20 C -5,-15 -3.5,-9 0,-3 Z" fill="#ffd166" fillOpacity="0.1" />
              <path d="M 0,3 C 3.5,9 5,15 0,20 C -5,15 -3.5,9 0,3 Z" fill="#ffd166" fillOpacity="0.1" />
              <path d="M -3,0 C -9,3.5 -15,5 -20,0 C -15,-5 -9,-3.5 -3,0 Z" fill="#ffd166" fillOpacity="0.1" />
              <path d="M 3,0 C 9,3.5 15,5 20,0 C 15,-5 9,-3.5 3,0 Z" fill="#ffd166" fillOpacity="0.1" />

              {/* 4 diagonal accent dots */}
              <circle cx="-13" cy="-13" r="1.2" fill="#ffd166" />
              <circle cx="13" cy="-13" r="1.2" fill="#ffd166" />
              <circle cx="-13" cy="13" r="1.2" fill="#ffd166" />
              <circle cx="13" cy="13" r="1.2" fill="#ffd166" />
            </g>

            {/* Corner offset dots for diamond grid alignment */}
            <circle cx="0" cy="0" r="1" fill="#ffd166" opacity="0.6" />
            <circle cx="80" cy="0" r="1" fill="#ffd166" opacity="0.6" />
            <circle cx="0" cy="80" r="1" fill="#ffd166" opacity="0.6" />
            <circle cx="80" cy="80" r="1" fill="#ffd166" opacity="0.6" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#diwaliMotifPattern)" />
      </svg>

      {/* Ambient festive top glow (smooth radial gradient without heavy CSS blur) */}
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[85vw] max-w-[1100px] h-[300px] pointer-events-none opacity-20 dark:opacity-35"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(255, 154, 0, 0.3) 0%, rgba(200, 30, 110, 0.15) 50%, transparent 80%)",
        }}
      />
    </div>
  );
});
