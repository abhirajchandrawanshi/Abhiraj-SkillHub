import { useState, useEffect, memo } from "react";
import { Volume2, VolumeX, Flame } from "lucide-react";
import { diwaliSound } from "./diwali-sound";

export const DiwaliControlPill = memo(function DiwaliControlPill({
  isActive = true,
  onToggleActive,
}: {
  isActive?: boolean;
  onToggleActive?: () => void;
}) {
  const [isMuted, setIsMuted] = useState(diwaliSound.getMuted());

  useEffect(() => {
    const handleSoundChange = (e: CustomEvent<{ isMuted: boolean }>) => {
      setIsMuted(e.detail.isMuted);
    };
    window.addEventListener("diwali-sound-change" as any, handleSoundChange);
    return () => {
      window.removeEventListener("diwali-sound-change" as any, handleSoundChange);
    };
  }, []);

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = diwaliSound.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      diwaliSound.playCrispCrackle();
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full select-none text-xs sm:text-sm font-semibold transition-all duration-300"
      style={{
        background: isActive
          ? "linear-gradient(135deg, rgba(255, 140, 0, 0.22) 0%, rgba(131, 56, 236, 0.25) 100%)"
          : "rgba(255, 255, 255, 0.08)",
        border: isActive
          ? "1px solid rgba(255, 190, 11, 0.45)"
          : "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: isActive ? "0 0 10px rgba(255, 183, 3, 0.2)" : "none",
      }}
    >
      {/* Diya / Flame Icon */}
      <span className="flex items-center text-amber-400">
        <Flame className="w-3.5 h-3.5 animate-pulse text-amber-400" />
      </span>

      {/* Label / Toggle Diwali */}
      <button
        onClick={onToggleActive}
        className="text-foreground hover:text-amber-400 transition-colors font-medium flex items-center gap-1 text-xs"
        title="Toggle Diwali festival theme"
      >
        <span>Diwali</span>
        <span className="hidden sm:inline text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
          {isActive ? "On" : "Off"}
        </span>
      </button>

      {/* Sound Toggle Button */}
      {isActive && (
        <button
          onClick={handleToggleSound}
          className="p-1 rounded-full text-muted-foreground hover:text-amber-300 transition-colors ml-0.5"
          title={isMuted ? "Turn cracker sound ON" : "Turn cracker sound OFF"}
          aria-label={isMuted ? "Enable cracker sound" : "Mute cracker sound"}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 opacity-60" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          )}
        </button>
      )}
    </div>
  );
});
