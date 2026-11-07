import { useState, useEffect, memo } from "react";
import { DiwaliLights } from "./DiwaliLights";
import { DiwaliLanterns } from "./DiwaliLanterns";
import { MarigoldGarlands } from "./MarigoldGarlands";
import { DiyaRow } from "./DiyaRow";
import { DiwaliCrackersCanvas } from "./DiwaliCrackersCanvas";
import { DiwaliBackgroundPatterns } from "./DiwaliBackgroundPatterns";

export interface DiwaliThemeProps {
  defaultActive?: boolean;
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
      {/* Subtle traditional rangoli pattern & warm ambient festival glow */}
      <DiwaliBackgroundPatterns />

      {/* Hanging multi-color fairy string lights across top */}
      <DiwaliLights />

      {/* Akash Kandil / Diwali sky lanterns at top corners */}
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
