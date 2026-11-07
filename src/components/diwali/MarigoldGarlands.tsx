import { memo, useMemo } from "react";

// Lightweight, high-performance Marigold Blossom SVG (5 elements, 0 filters)
function MarigoldFlower({ isOrange }: { isOrange: boolean }) {
  const outerPetals = isOrange ? "#ff7b00" : "#ffbe0b";
  const midPetals = isOrange ? "#ff9500" : "#ffd166";
  const centerColor = isOrange ? "#9d0208" : "#d00000";

  return (
    <svg
      viewBox="0 0 28 28"
      className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
      width="24"
      height="24"
    >
      {/* Outer ruffle base */}
      <circle cx="14" cy="14" r="12" fill={outerPetals} opacity="0.9" />
      {/* 4 petal lobes */}
      <circle cx="14" cy="4" r="3.5" fill={outerPetals} />
      <circle cx="24" cy="14" r="3.5" fill={outerPetals} />
      <circle cx="14" cy="24" r="3.5" fill={outerPetals} />
      <circle cx="4" cy="14" r="3.5" fill={outerPetals} />
      {/* Mid fluff ring */}
      <circle cx="14" cy="14" r="8" fill={midPetals} />
      {/* Center blossom core */}
      <circle cx="14" cy="14" r="4.5" fill={centerColor} />
      <circle cx="14" cy="14" r="2" fill="#580000" />
    </svg>
  );
}

// Garland column swaying in wind (hardware-accelerated, hidden on mobile for max performance)
function GarlandColumn({ side }: { side: "left" | "right" }) {
  const count = 16; // 16 flowers is ideal and 60% lighter
  const flowers = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      isOrange: i % 2 === 0,
    }));
  }, [count]);

  const isLeft = side === "left";

  return (
    <div
      className={`fixed top-0 bottom-0 ${
        isLeft ? "left-0 sm:left-1" : "right-0 sm:right-1"
      } z-30 pointer-events-none select-none hidden lg:flex flex-col items-center overflow-visible py-2`}
      style={{
        transformOrigin: "top center",
        willChange: "transform",
        animation: isLeft
          ? "garlandSwayLeft 5s ease-in-out infinite alternate"
          : "garlandSwayRight 5.2s ease-in-out 0.8s infinite alternate",
      }}
      aria-hidden="true"
    >
      {/* Golden Thread */}
      <div className="absolute top-0 bottom-0 w-[1px] bg-amber-400/40 z-0" />

      {/* Flowers Stack */}
      <div className="relative z-10 flex flex-col items-center space-y-1 sm:space-y-1.5">
        {flowers.map((f) => (
          <div
            key={f.id}
            style={{
              transform: `rotate(${(f.id * 47) % 360}deg)`,
            }}
          >
            <MarigoldFlower isOrange={f.isOrange} />
          </div>
        ))}
      </div>
    </div>
  );
}

export const MarigoldGarlands = memo(function MarigoldGarlands() {
  return (
    <>
      <GarlandColumn side="left" />
      <GarlandColumn side="right" />
    </>
  );
});
