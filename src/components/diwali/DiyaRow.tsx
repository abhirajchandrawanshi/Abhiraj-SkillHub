import { memo } from "react";

export const DiyaRow = memo(function DiyaRow() {
  const diyas = [
    { left: "10%", hideOnMobile: true },
    { left: "30%", hideOnMobile: false },
    { left: "50%", hideOnMobile: false },
    { left: "70%", hideOnMobile: false },
    { left: "90%", hideOnMobile: true },
  ];

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 select-none overflow-hidden h-14 sm:h-18"
      aria-hidden="true"
    >
      {/* Subtle warm base gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(255, 140, 0, 0.3), transparent 75%)",
        }}
      />

      {/* Row of Diyas */}
      <div className="relative w-full h-full max-w-7xl mx-auto">
        {diyas.map((d, idx) => (
          <div
            key={idx}
            className={`absolute bottom-1 sm:bottom-2 -translate-x-1/2 flex flex-col items-center ${
              d.hideOnMobile ? "hidden sm:flex" : "flex"
            }`}
            style={{ left: d.left }}
          >
            <SingleDiya delay={(idx * 0.25) % 1.5} />
          </div>
        ))}
      </div>
    </div>
  );
});

function SingleDiya({ delay }: { delay: number }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Flame Container */}
      <div
        className="relative flex flex-col items-center -mb-0.5 origin-bottom"
        style={{
          willChange: "transform, opacity",
          animation: `diyaFlameFlicker 1.8s ease-in-out ${delay}s infinite alternate`,
        }}
      >
        {/* Flame SVG */}
        <svg
          viewBox="0 0 16 26"
          className="w-3.5 h-5 sm:w-4 sm:h-6"
          width="16"
          height="24"
        >
          <defs>
            <linearGradient id={`flameGrad-${delay}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ff3c00" />
              <stop offset="50%" stopColor="#ff9900" />
              <stop offset="85%" stopColor="#ffea00" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
          {/* Flame teardrop */}
          <path
            d="M 8,1 C 11,8 15,14 15,19 A 7,7 0 0 1 1,19 C 1,14 5,8 8,1 Z"
            fill={`url(#flameGrad-${delay})`}
          />
          {/* Inner core */}
          <ellipse cx="8" cy="18" rx="2.5" ry="4" fill="#ffffff" opacity="0.9" />
        </svg>

        {/* Cotton Wick */}
        <div className="w-0.5 h-1 bg-neutral-900 rounded-t-full -mt-0.5 z-10" />
      </div>

      {/* Terracotta Diya Clay Lamp Body */}
      <svg
        viewBox="0 0 54 22"
        className="w-9 h-3.5 sm:w-11 sm:h-4.5"
        width="44"
        height="18"
      >
        <defs>
          <linearGradient id="clayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d96534" />
            <stop offset="50%" stopColor="#a33d14" />
            <stop offset="100%" stopColor="#5c1f06" />
          </linearGradient>
          <linearGradient id="gheeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8c3e00" />
            <stop offset="50%" stopColor="#ffbe0b" />
            <stop offset="100%" stopColor="#8c3e00" />
          </linearGradient>
        </defs>

        {/* Base bowl */}
        <path
          d="M 4,7 Q 27,24 50,7 Q 44,18 27,19 Q 10,18 4,7 Z"
          fill="url(#clayGrad)"
        />

        {/* Rim Edge */}
        <ellipse cx="27" cy="7" rx="23" ry="5" fill="url(#clayGrad)" stroke="#ffd166" strokeWidth="0.6" />

        {/* Ghee reservoir */}
        <ellipse cx="27" cy="7" rx="18" ry="3.5" fill="url(#gheeGrad)" />

        {/* Rim golden dots */}
        <circle cx="15" cy="9.5" r="0.9" fill="#ffd166" />
        <circle cx="21" cy="11" r="0.9" fill="#ffd166" />
        <circle cx="27" cy="11.5" r="1" fill="#ffd166" />
        <circle cx="33" cy="11" r="0.9" fill="#ffd166" />
        <circle cx="39" cy="9.5" r="0.9" fill="#ffd166" />
      </svg>
    </div>
  );
}
