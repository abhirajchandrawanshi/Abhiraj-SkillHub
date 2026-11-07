import { memo } from "react";

export const DiwaliLanterns = memo(function DiwaliLanterns() {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 right-0 z-30 select-none overflow-visible"
      aria-hidden="true"
    >
      {/* Left Lantern (Akash Kandil) */}
      <div
        className="absolute top-2 left-2 sm:left-6 md:left-10 origin-top"
        style={{
          willChange: "transform",
          animation: "lanternSway 4.5s ease-in-out infinite alternate",
        }}
      >
        <SingleLantern colorVariant="purple-gold" />
      </div>

      {/* Right Lantern (Akash Kandil) */}
      <div
        className="absolute top-2 right-2 sm:right-6 md:right-10 origin-top"
        style={{
          willChange: "transform",
          animation: "lanternSway 4.8s ease-in-out 0.8s infinite alternate-reverse",
        }}
      >
        <SingleLantern colorVariant="pink-gold" />
      </div>
    </div>
  );
});

function SingleLantern({ colorVariant }: { colorVariant: "purple-gold" | "pink-gold" }) {
  const isPurple = colorVariant === "purple-gold";
  const mainColor = isPurple ? "#8338ec" : "#d90429";
  const accentColor = isPurple ? "#ff006e" : "#ff9e00";
  const innerColor = isPurple ? "#3a86ff" : "#ffbe0b";

  return (
    <div className="relative flex flex-col items-center">
      {/* Golden Hanging Cord */}
      <div className="w-[1.5px] h-8 sm:h-12 bg-gradient-to-b from-amber-400 to-amber-600" />

      {/* Hanging Loop */}
      <div className="w-2 h-2 rounded-full border border-amber-300 -mt-0.5 bg-amber-500/30" />

      {/* Lantern Body & Integrated Tassels SVG (1 single GPU-composited element) */}
      <svg
        viewBox="0 0 100 160"
        className="w-12 h-20 sm:w-14 sm:h-24"
        width="56"
        height="96"
      >
        <defs>
          <linearGradient id={`outerDiamond-${colorVariant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor={accentColor} />
            <stop offset="100%" stopColor="#c69214" />
          </linearGradient>

          <linearGradient id={`innerFacet1-${colorVariant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={mainColor} />
            <stop offset="100%" stopColor="#2b0938" />
          </linearGradient>

          <radialGradient id={`glowCenter-${colorVariant}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#fff3b0" />
            <stop offset="80%" stopColor={innerColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Outer Diamond Shape */}
        <polygon
          points="50,4 96,50 50,96 4,50"
          fill={`url(#outerDiamond-${colorVariant})`}
          stroke="#ffeedd"
          strokeWidth="1.5"
        />

        {/* Inner Facet Panels */}
        <polygon
          points="50,14 86,50 50,86 14,50"
          fill={`url(#innerFacet1-${colorVariant})`}
          stroke="#ffd700"
          strokeWidth="1"
        />

        {/* Facet window lines */}
        <line x1="50" y1="14" x2="50" y2="86" stroke="#ffd700" strokeWidth="0.8" opacity="0.8" />
        <line x1="14" y1="50" x2="86" y2="50" stroke="#ffd700" strokeWidth="0.8" opacity="0.8" />

        {/* Inner Glowing Core */}
        <polygon
          points="50,28 72,50 50,72 28,50"
          fill={`url(#glowCenter-${colorVariant})`}
        />

        {/* Central Bright Light Star */}
        <circle cx="50" cy="50" r="5" fill="#ffffff" />

        {/* Golden Corner Accents */}
        <circle cx="50" cy="4" r="2.5" fill="#ffe066" />
        <circle cx="96" cy="50" r="2.5" fill="#ffe066" />
        <circle cx="50" cy="96" r="2.5" fill="#ffe066" />
        <circle cx="4" cy="50" r="2.5" fill="#ffe066" />

        {/* Hanging Tassels (drawn directly in SVG, zero DOM nodes overhead) */}
        <g strokeLinecap="round" strokeWidth="1.5">
          <line x1="26" y1="96" x2="26" y2="128" stroke="#ffd700" />
          <line x1="34" y1="96" x2="34" y2="138" stroke={accentColor} />
          <line x1="42" y1="96" x2="42" y2="148" stroke="#ffd700" />
          <line x1="50" y1="96" x2="50" y2="156" stroke={mainColor} strokeWidth="2" />
          <line x1="58" y1="96" x2="58" y2="148" stroke="#ffd700" />
          <line x1="66" y1="96" x2="66" y2="138" stroke={accentColor} />
          <line x1="74" y1="96" x2="74" y2="128" stroke="#ffd700" />
        </g>
      </svg>
    </div>
  );
}
