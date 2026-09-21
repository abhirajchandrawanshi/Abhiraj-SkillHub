import * as React from "react";
import { ArrowRight } from "lucide-react";

export type SpinningBorderButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export const SpinningBorderButton = React.forwardRef<
  HTMLButtonElement,
  SpinningBorderButtonProps
>(function SpinningBorderButton(
  { children = "Buy Now", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={
        "group inline-flex overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] rounded-full pt-[1px] pr-[1px] pb-[1px] pl-[1px] relative items-center justify-center" +
        (className ? " " + className : "")
      }
      {...props}
    >
      {/* Spinning Border Beam (Visible on Hover) */}
      <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#ffffff_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Default Static Border */}
      <span className="absolute inset-0 rounded-full bg-zinc-800 transition-opacity duration-300 group-hover:opacity-0" />

      {/* 3D Button Surface & Content */}
      <span className="flex items-center justify-center gap-2 uppercase transition-colors duration-300 group-hover:text-white text-xs font-medium text-zinc-400 tracking-widest bg-gradient-to-b from-zinc-800 to-zinc-950 w-full h-full rounded-full pt-2.5 pr-6 pb-2.5 pl-6 relative shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
        <span className="relative z-10">{children}</span>
        <ArrowRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
});

export default SpinningBorderButton;
