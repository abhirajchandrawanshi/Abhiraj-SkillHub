import { useState, useEffect, memo } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { DiwaliLights } from "./DiwaliLights";
import { DiwaliLanterns } from "./DiwaliLanterns";
import { MarigoldGarlands } from "./MarigoldGarlands";
import { DiyaRow } from "./DiyaRow";
import { DiwaliCrackersCanvas } from "./DiwaliCrackersCanvas";
import { DiwaliBackgroundPatterns } from "./DiwaliBackgroundPatterns";
import { diwaliSound } from "./diwali-sound";

export interface DiwaliThemeProps {
  defaultActive?: boolean;
}

// Universal top voice/sound controller visible at the top of every screen
function TopSoundToggle() {
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

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = diwaliSound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      diwaliSound.playCrispCrackle();
    }
  };

  return (
    <aside
      className="fixed top-2.5 sm:top-3.5 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto select-none"
      aria-label="Festival sound controller"
    >
      <button
        onClick={toggleSound}
        type="button"
        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 shadow-md backdrop-blur-md cursor-pointer border ${
          !isMuted
            ? "bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border-amber-500/40 shadow-amber-500/20"
            : "bg-black/60 hover:bg-black/80 text-muted-foreground border-white/15"
        }`}
        title={isMuted ? "Turn cracker voice ON" : "Turn cracker voice OFF"}
        aria-label={isMuted ? "Turn cracker voice ON" : "Turn cracker voice OFF"}
      >
        <span className="flex items-center">
          {!isMuted ? (
            <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-muted-foreground/70" />
          )}
        </span>
        <span className="tracking-wide">
          Voice: {!isMuted ? "ON" : "OFF"}
        </span>
      </button>
    </aside>
  );
}

export const DiwaliTheme = memo(function DiwaliTheme({
  defaultActive = true,
}: DiwaliThemeProps) {
  const [isActive, setIsActive] = useState(defaultActive);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user previously toggled Diwali off in localStorage
    try {
      const stored = localStorage.getItem("abhiacademy-diwali-theme");
      if (stored !== null) {
        setIsActive(stored === "true");
      }
    } catch {
      // Safe catch
    }

    // Listen to custom toggle events from the control pill
    const handleToggle = (e: CustomEvent<{ active: boolean }>) => {
      setIsActive(e.detail.active);
    };
    window.addEventListener("toggle-diwali-theme" as any, handleToggle);
    return () => {
      window.removeEventListener("toggle-diwali-theme" as any, handleToggle);
    };
  }, []);

  if (!mounted || !isActive) {
    return null;
  }

  // Keep admin management panels clean
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* Top voice/sound toggle button accessible on every screen */}
      <TopSoundToggle />

      {/* Subtle traditional rangoli pattern & warm ambient festival glow */}
      <DiwaliBackgroundPatterns />

      {/* Hanging multi-color fairy string lights across top (non-sticky, scrolls with page) */}
      <DiwaliLights />

      {/* Akash Kandil / Diwali sky lanterns at top corners (non-sticky, scrolls with page) */}
      <DiwaliLanterns />

      {/* Vertical marigold flower garlands framing left and right screen borders */}
      <MarigoldGarlands />

      {/* Burning rocket crackers & sky fireworks canvas */}
      <DiwaliCrackersCanvas enabled={isActive} />

      {/* Row of traditional glowing clay diyas at the bottom */}
      <DiyaRow />
    </>
  );
});

export { DiwaliBanner } from "./DiwaliBanner";
export { DiwaliControlPill } from "./DiwaliControlPill";
