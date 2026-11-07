import { memo } from "react";
import { Sparkles } from "lucide-react";
import { diwaliSound } from "./diwali-sound";

export const DiwaliBanner = memo(function DiwaliBanner({
  className = "",
}: {
  className?: string;
}) {
  const handleClick = () => {
    diwaliSound.playSparkler();
  };

  return (
    <div
      onClick={handleClick}
      role="banner"
      className={`relative inline-flex items-center justify-center gap-2 sm:gap-3 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full select-none cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(255, 183, 3, 0.12) 0%, rgba(247, 37, 133, 0.15) 50%, rgba(255, 107, 0, 0.12) 100%)",
        border: "1px solid rgba(255, 209, 102, 0.35)",
        boxShadow:
          "0 0 20px rgba(255, 183, 3, 0.2), inset 0 0 15px rgba(255, 215, 0, 0.1)",
      }}
      title="Happy Diwali! Click for sparks"
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 rounded-full blur-md opacity-40 pointer-events-none group-hover:opacity-75 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(90deg, #ffb703, #ff007f, #ffb703)",
        }}
      />

      {/* Left Sparkle Star */}
      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-spin-slow shrink-0 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />

      {/* Main Festive Greeting */}
      <div className="relative flex items-center gap-1.5 sm:gap-2">
        <span
          className="font-display text-base sm:text-lg md:text-xl font-extrabold tracking-wide text-transparent bg-clip-text"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #fff3b0 0%, #ffd166 25%, #ff9e00 50%, #ff5400 75%, #ffd166 100%)",
            textShadow: "0 0 18px rgba(255, 190, 11, 0.55)",
            filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))",
          }}
        >
          Happy Diwali
        </span>

        <span className="text-amber-400 font-bold text-xs sm:text-sm">✦</span>

        <span
          className="font-sans text-base sm:text-lg md:text-xl font-bold tracking-normal text-transparent bg-clip-text"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #ffd166 0%, #ffb703 30%, #ff7b00 70%, #ffb703 100%)",
            textShadow: "0 0 18px rgba(255, 190, 11, 0.55)",
          }}
        >
          शुभ दीपावली
        </span>
      </div>

      {/* Right Sparkle Star */}
      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse shrink-0 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
    </div>
  );
});

