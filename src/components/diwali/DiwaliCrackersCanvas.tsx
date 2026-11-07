import { useEffect, useRef, memo } from "react";
import { diwaliSound } from "./diwali-sound";

// Trailing bead in a firework ray
interface BeadPoint {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}

// Single firework streamer ray
interface BurstRay {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  headColor: string;
  gravity: number;
  drag: number;
  alpha: number;
  decay: number;
  headSize: number;
  trail: BeadPoint[];
  maxTrailLength: number;
  hasSubBurst?: boolean;
  subBurstTimer?: number;
}

// Secondary sub-burst sparkle
interface SubSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
}

// Sparkler fountain particle
interface FountainSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;
}

// Central burst flash (effect where cracker bursts)
interface BurstFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

// Embers cascading behind the rocket during ascent
interface RocketEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  wobbleOffset: number;
}

// 4 Distinct Cracker Behaviors
type CrackerMode =
  | "sparkler-fountain" // goes high, crackles intensely and extracts sparkling shower
  | "grand-shell"       // goes high and detonates into grand beaded pearl shell
  | "double-break"      // bursts into tracer stars, which then sub-burst into mini stars
  | "sky-crosser";      // goes up, doesn't burst, crosses the screen with fireworks and crackling sparks

// Trajectory Curve & 3D Flight Types
type TrajectoryType =
  | "towards-camera" // Swoops forward in 3D perspective towards the screen, growing larger
  | "arc-left"       // Bends and curves gracefully to the left
  | "arc-right"      // Bends and curves gracefully to the right
  | "s-curve"        // Weaves in a smooth sinusoidal serpentine S-curve
  | "straight";      // Classic majestic vertical ascent with subtle flutter

// Ascending Diwali rocket
interface Rocket {
  x: number;
  y: number;
  z: number;              // 3D depth distance (z=0 is screen plane, positive is in background, negative is near camera)
  vz: number;             // 3D velocity towards camera
  scale: number;          // Perspective projection scale = 400 / (400 + z)
  targetY: number;
  vx: number;
  vy: number;
  ax: number;             // Lateral curve acceleration
  trajectoryType: TrajectoryType;
  curvePhase: number;
  curveFreq: number;
  curveAmp: number;
  bodyColor: string;
  capColor: string;
  bandColor: string;
  mode: CrackerMode;
  burstType: "magenta-pearl" | "rainbow-willow" | "golden-palm";
  embers: RocketEmber[];
}

const RAINBOW_PALETTE = [
  "#FF007F", // Magenta
  "#00F5D4", // Cyan
  "#FFD166", // Gold
  "#06D6A0", // Green
  "#FF5400", // Orange
  "#9D4EDD", // Violet
  "#4CC9F0", // Sky blue
  "#FFF3B0", // Champagne
];

const ROCKET_THEMES = [
  { body: "#E83A82", cap: "#FFF3B0", band: "#FFFFFF" },
  { body: "#FF0055", cap: "#FFD166", band: "#FFE600" },
  { body: "#FA5252", cap: "#FFF3B0", band: "#FFD43B" },
  { body: "#F76707", cap: "#FFE066", band: "#FFFFFF" },
  { body: "#7950F2", cap: "#FFD166", band: "#FCC419" },
];

const MAX_CONCURRENT_ROCKETS = 2;

export const DiwaliCrackersCanvas = memo(function DiwaliCrackersCanvas({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const raysRef = useRef<BurstRay[]>([]);
  const subSparklesRef = useRef<SubSparkle[]>([]);
  const fountainSparksRef = useRef<FountainSpark[]>([]);
  const flashesRef = useRef<BurstFlash[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const nextAutoLaunchRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Detect low-power devices for automatic performance scaling
    const isLowPower =
      typeof navigator !== "undefined" &&
      navigator.hardwareConcurrency !== undefined &&
      navigator.hardwareConcurrency <= 4;

    let dpr = Math.min(window.devicePixelRatio || 1, isLowPower ? 1 : 1.25);

    const setCanvasSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, isLowPower ? 1 : 1.25);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Spawn central luminous burst flash & sparks right at detonation point (scaled by 3D perspective)
    const triggerBurstFlash = (x: number, y: number, color: string, scale = 1.0) => {
      flashesRef.current.push({
        x,
        y,
        radius: 4 * scale,
        maxRadius: 28 * scale,
        color,
        alpha: 0.9,
      });

      // Rapid outward flash sparks at burst point
      const count = isLowPower ? 6 : 9;
      for (let s = 0; s < count; s++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (2 + Math.random() * 3.5) * scale;
        fountainSparksRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: Math.random() < 0.6 ? "#FFFFFF" : color,
          alpha: 1,
          decay: 0.05 + Math.random() * 0.03,
          size: (1.8 + Math.random() * 1.2) * scale,
          gravity: 0.04,
        });
      }
    };

    // 1. BEHAVIOR 1: Sparkler Fountain (goes high, crackles intensely and extracts sparkling shower)
    const createSparklerFountain = (x: number, y: number, scale = 1.0) => {
      diwaliSound.playCrispCrackle();
      triggerBurstFlash(x, y, "#FFD166", scale);

      const count = isLowPower ? 26 : 38;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        const speed = (2.0 + Math.random() * 4.8) * scale;
        const colors = ["#FFFFFF", "#FFF3B0", "#FFD166", "#FF9E00", "#FFBE0B"];

        fountainSparksRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)]!,
          alpha: 1,
          decay: 0.016 + Math.random() * 0.014,
          size: (1.6 + Math.random() * 1.4) * scale,
          gravity: 0.08,
        });
      }
    };

    // 2. BEHAVIOR 2: Grand Spherical Shell (detonates into beaded pearl rays scaled by 3D perspective)
    const createGrandShell = (
      x: number,
      y: number,
      burstType: "magenta-pearl" | "rainbow-willow" | "golden-palm",
      scale = 1.0
    ) => {
      diwaliSound.playDeepBoom();
      const flashColor = burstType === "magenta-pearl" ? "#FF007F" : "#FFD166";
      triggerBurstFlash(x, y, flashColor, scale);

      const rayCount = isLowPower ? 24 : 28 + Math.floor(Math.random() * 6);
      const maxTrail = Math.round((isLowPower ? 6 : 8) * Math.min(scale, 1.25));

      for (let i = 0; i < rayCount; i++) {
        const angle = (Math.PI * 2 * i) / rayCount + (Math.random() - 0.5) * 0.2;
        const speed = (2.8 + Math.random() * 4.2) * scale;

        let rayColor: string;
        let headColor = "#FFFFFF";
        let gravity = 0.052;
        let drag = 0.966;
        let decay = 0.014 + Math.random() * 0.01;

        if (burstType === "magenta-pearl") {
          const variants = ["#FF1493", "#FF007F", "#F72585", "#C77DFF"];
          rayColor = variants[i % variants.length]!;
          headColor = "#FFF0F5";
          gravity = 0.044;
        } else if (burstType === "rainbow-willow") {
          rayColor = RAINBOW_PALETTE[i % RAINBOW_PALETTE.length]!;
          gravity = 0.06;
          drag = 0.962;
        } else {
          const goldVariants = ["#FFD166", "#FFB703", "#FB8500", "#FFE6A7"];
          rayColor = goldVariants[i % goldVariants.length]!;
          gravity = 0.048;
        }

        raysRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: rayColor,
          headColor,
          gravity,
          drag,
          alpha: 1,
          decay,
          headSize: (2.2 + Math.random() * 0.8) * scale,
          trail: [],
          maxTrailLength: maxTrail,
        });
      }
    };

    // 3. BEHAVIOR 3: Double-Break Sub-Burst (bursts into tracers, which then sub-burst)
    const createDoubleBreak = (x: number, y: number, scale = 1.0) => {
      diwaliSound.playWhistlePop();
      triggerBurstFlash(x, y, "#00F5D4", scale);

      const tracerCount = isLowPower ? 10 : 13;
      for (let i = 0; i < tracerCount; i++) {
        const angle = (Math.PI * 2 * i) / tracerCount + (Math.random() - 0.5) * 0.2;
        const speed = (3.4 + Math.random() * 2.2) * scale;
        const color = RAINBOW_PALETTE[i % RAINBOW_PALETTE.length]!;

        raysRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          headColor: "#FFFFFF",
          gravity: 0.04,
          drag: 0.965,
          alpha: 1,
          decay: 0.012,
          headSize: 2.6 * scale,
          trail: [],
          maxTrailLength: 7,
          hasSubBurst: true,
          subBurstTimer: 18 + Math.floor(Math.random() * 8),
        });
      }
    };

    // Trigger secondary sub-burst at ray tip
    const triggerSubBurstAt = (x: number, y: number, baseColor: string) => {
      diwaliSound.playSubBurstPop();
      const count = 5 + Math.floor(Math.random() * 3);
      for (let s = 0; s < count; s++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 2.2;
        subSparklesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: Math.random() < 0.5 ? baseColor : "#FFF3B0",
          alpha: 1,
          decay: 0.035 + Math.random() * 0.025,
          size: 1.5 + Math.random() * 1.0,
        });
      }
    };

    // Master burst dispatcher (scaled by 3D perspective)
    const handleApexDetonation = (r: Rocket) => {
      const scale = r.scale || 1.0;
      if (r.mode === "sparkler-fountain") {
        createSparklerFountain(r.x, r.y, scale);
      } else if (r.mode === "double-break") {
        createDoubleBreak(r.x, r.y, scale);
      } else if (r.mode === "grand-shell") {
        createGrandShell(r.x, r.y, r.burstType, scale);
      }
    };

    // Launch rocket (with 3D depth, curved bends, majestic ascent & distinct voices)
    const launchRocket = (startX?: number, targetX?: number, targetY?: number) => {
      if (rocketsRef.current.length >= MAX_CONCURRENT_ROCKETS) return;

      const width = canvas.width / dpr || window.innerWidth;
      const height = canvas.height / dpr || window.innerHeight;

      // Cycle all 4 cracker behaviors randomly
      const modeRoll = Math.random();
      const mode: CrackerMode =
        modeRoll < 0.28
          ? "sparkler-fountain"
          : modeRoll < 0.58
          ? "grand-shell"
          : modeRoll < 0.8
          ? "double-break"
          : "sky-crosser"; // crosses the screen with fireworks and crackling voices

      const sx = startX ?? width * 0.15 + Math.random() * width * 0.7;
      const ty =
        mode === "sky-crosser"
          ? -60
          : (targetY ?? height * 0.12 + Math.random() * (height * 0.28));
      const tx = targetX ?? sx + (Math.random() - 0.5) * 60;

      const dx = tx - sx;
      const dy = ty - height;
      const distance = Math.hypot(dx, dy);

      // Slower, smoother ascent speed (7.2-9.5 px/frame)
      const baseSpeed =
        mode === "sky-crosser" ? 8.5 + Math.random() * 1.8 : 7.2 + Math.random() * 2.2;

      // Determine Trajectory Type (3D Towards Camera, Arc Left, Arc Right, S-Curve, or Straight)
      const trajRoll = Math.random();
      let trajectoryType: TrajectoryType;
      let startZ = 0;
      let vz = 0;
      let ax = 0;
      let curveFreq = 0;
      let curveAmp = 0;
      let initialVx = (dx / distance) * baseSpeed;

      if (trajRoll < 0.32) {
        // --- 1. 3D TOWARDS CAMERA ---
        // Rocket starts in deep background, angles forward, and swells up as it flies towards the viewer
        trajectoryType = "towards-camera";
        startZ = 160 + Math.random() * 80; // starts at distance (z=160-240, scale ~0.65-0.72)
        vz = -(2.2 + Math.random() * 1.4); // travels rapidly towards the camera (scale will grow to ~1.4 - 1.6)
        ax = (Math.random() - 0.5) * 0.035; // gentle forward-swerving bend
        initialVx = (Math.random() - 0.5) * 1.5;
      } else if (trajRoll < 0.56) {
        // --- 2. ARC LEFT ---
        // Rocket leans slightly right at launch and then curves smoothly in a sweeping arc to the left
        trajectoryType = "arc-left";
        ax = -(0.045 + Math.random() * 0.04);
        initialVx = 1.0 + Math.random() * 1.5;
        startZ = (Math.random() - 0.5) * 50;
        vz = (Math.random() - 0.5) * 0.4;
      } else if (trajRoll < 0.80) {
        // --- 3. ARC RIGHT ---
        // Rocket leans slightly left at launch and then curves smoothly in a sweeping arc to the right
        trajectoryType = "arc-right";
        ax = 0.045 + Math.random() * 0.04;
        initialVx = -(1.0 + Math.random() * 1.5);
        startZ = (Math.random() - 0.5) * 50;
        vz = (Math.random() - 0.5) * 0.4;
      } else if (trajRoll < 0.92) {
        // --- 4. S-CURVE (WOBBLE / CORKSCREW WEAVE) ---
        // Real bottle-rocket wobble as thrust oscillates, leaving a serpentine golden trail
        trajectoryType = "s-curve";
        curveFreq = 0.07 + Math.random() * 0.05;
        curveAmp = 0.55 + Math.random() * 0.45;
        initialVx = (Math.random() - 0.5) * 0.8;
        startZ = (Math.random() - 0.5) * 40;
        vz = (Math.random() - 0.5) * 0.3;
      } else {
        // --- 5. CLASSIC VERTICAL WITH AIR DRIFT ---
        trajectoryType = "straight";
        ax = (Math.random() - 0.5) * 0.015;
        startZ = (Math.random() - 0.5) * 30;
        vz = 0;
      }

      const initialScale = Math.max(0.6, Math.min(1.8, 400 / (400 + startZ)));
      const theme = ROCKET_THEMES[Math.floor(Math.random() * ROCKET_THEMES.length)]!;
      const burstTypes: ("magenta-pearl" | "rainbow-willow" | "golden-palm")[] = [
        "magenta-pearl",
        "rainbow-willow",
        "golden-palm",
      ];
      const burstType = burstTypes[Math.floor(Math.random() * burstTypes.length)]!;

      // Distinct launch voice
      const ascentVoices: ("whistle" | "hiss" | "crackle")[] = ["whistle", "hiss", "crackle"];
      const launchVoice =
        mode === "sky-crosser"
          ? "crackle"
          : trajectoryType === "towards-camera"
          ? "hiss" // deep pressurized whoosh when rocketing towards camera
          : ascentVoices[Math.floor(Math.random() * ascentVoices.length)]!;

      diwaliSound.playRocketLaunch(launchVoice);

      rocketsRef.current.push({
        x: sx,
        y: height - 10,
        z: startZ,
        vz,
        scale: initialScale,
        targetY: ty,
        vx: initialVx,
        vy: (dy / distance) * baseSpeed,
        ax,
        trajectoryType,
        curvePhase: Math.random() * Math.PI * 2,
        curveFreq,
        curveAmp,
        bodyColor: theme.body,
        capColor: theme.cap,
        bandColor: theme.band,
        mode,
        burstType,
        embers: [],
      });
    };

    nextAutoLaunchRef.current = performance.now() + 600;

    // Interactive launch on click anywhere
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.closest("button") ||
          target.closest("a"))
      ) {
        return;
      }
      launchRocket(
        e.clientX + (Math.random() - 0.5) * 30,
        e.clientX,
        e.clientY
      );
    };

    window.addEventListener("click", handleDocumentClick);

    // Pause rendering when tab is hidden to save 100% CPU/battery
    let isHidden = false;
    const handleVisibilityChange = () => {
      isHidden = document.hidden;
      if (!isHidden) {
        lastFrameTimeRef.current = performance.now();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Main animation loop
    const animate = (now: number) => {
      if (isHidden) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = lastFrameTimeRef.current
        ? Math.min((now - lastFrameTimeRef.current) / 16.667, 2.0)
        : 1;
      lastFrameTimeRef.current = now;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // Additive blending for luminous festival fireworks
      ctx.globalCompositeOperation = "lighter";

      // Auto launch crackers periodically (1–2 seconds, 1 or 2 together)
      if (now > nextAutoLaunchRef.current) {
        const currentCount = rocketsRef.current.length;
        if (currentCount < MAX_CONCURRENT_ROCKETS) {
          const available = MAX_CONCURRENT_ROCKETS - currentCount;
          const launchBatch = available >= 2 ? (Math.random() < 0.5 ? 2 : 1) : 1;

          for (let b = 0; b < launchBatch; b++) {
            let sx: number;
            if (b === 0) {
              const sideBias = Math.random();
              if (sideBias < 0.45) {
                sx = w * 0.82 + Math.random() * (w * 0.13);
              } else if (sideBias < 0.9) {
                sx = w * 0.05 + Math.random() * (w * 0.13);
              } else {
                sx = w * 0.25 + Math.random() * (w * 0.5);
              }
            } else {
              const firstX = rocketsRef.current[rocketsRef.current.length - 1]?.x ?? w * 0.5;
              sx =
                firstX > w * 0.5
                  ? w * 0.05 + Math.random() * (w * 0.13)
                  : w * 0.82 + Math.random() * (w * 0.13);
            }
            launchRocket(sx);
          }

          nextAutoLaunchRef.current = now + 1000 + Math.random() * 800;
        } else {
          nextAutoLaunchRef.current = now + 150;
        }
      }

      // --- 1. DRAW ROCKETS, WAVY EMBERS & SKY-CROSSER FIREWORKS ---
      for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
        const r = rocketsRef.current[i];
        if (!r) continue;

        // 1. Update Trajectory Curve Physics
        r.curvePhase += r.curveFreq * dt;

        if (r.trajectoryType === "s-curve") {
          // Weaving sinusoidal serpentine bend
          r.vx += Math.cos(r.curvePhase) * r.curveAmp * 0.2 * dt;
        } else if (r.trajectoryType === "arc-left" || r.trajectoryType === "arc-right") {
          // Graceful lateral curve acceleration
          r.vx += r.ax * dt;
        } else if (r.trajectoryType === "towards-camera") {
          // Forward swoop with subtle lateral steering
          r.vx += r.ax * dt;
        } else if (r.ax) {
          r.vx += r.ax * dt;
        }

        // 2. Update 3D Z-Depth & Dynamic Perspective Scale
        r.z += r.vz * dt;
        const fov = 400;
        // Objects closer have smaller z and larger scale
        r.scale = Math.max(0.62, Math.min(1.75, fov / (fov + r.z)));

        // Golden ember beads per frame (scaled with 3D perspective and slipstream inertia)
        const emberCount = r.mode === "sky-crosser" ? 3 : 2;
        for (let em = 0; em < emberCount; em++) {
          const streamOffset = (em === 0 ? -2.2 : em === 1 ? 2.2 : 0) * r.scale;
          // Slipstream spread: trails slightly opposite to lateral acceleration
          const spreadX =
            (Math.random() - 0.5) * (r.trajectoryType === "towards-camera" ? 3.0 : 1.8) * r.scale;

          r.embers.push({
            x: r.x + streamOffset + spreadX,
            y: r.y + 16 * r.scale,
            vx: (Math.random() - 0.5) * 0.8 * r.scale - r.vx * 0.15,
            vy: (2.0 + Math.random() * 2.2) * r.scale,
            size: (1.5 + Math.random() * 1.2) * r.scale,
            color: Math.random() < 0.75 ? "#FFD166" : "#FF9E00",
            alpha: 0.9,
            decay: 0.028 + Math.random() * 0.018,
            wobbleOffset: Math.random() * Math.PI * 2,
          });
        }

        // Sky-Crosser specific: Spits continuous crackling sparks across the sky
        if (r.mode === "sky-crosser" && Math.random() < 0.7) {
          const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.6;
          fountainSparksRef.current.push({
            x: r.x + (Math.random() - 0.5) * 6 * r.scale,
            y: r.y + 16 * r.scale,
            vx: Math.cos(angle) * (1.5 + Math.random() * 2.5) * r.scale,
            vy: Math.sin(angle) * (1.5 + Math.random() * 2.5) * r.scale,
            color: Math.random() < 0.5 ? "#FFD166" : "#FFF3B0",
            alpha: 1,
            decay: 0.025 + Math.random() * 0.02,
            size: (1.5 + Math.random() * 1.0) * r.scale,
            gravity: 0.05,
          });
        }

        // Render embers
        for (let eIdx = r.embers.length - 1; eIdx >= 0; eIdx--) {
          const emb = r.embers[eIdx];
          if (!emb) continue;

          emb.wobbleOffset += 0.15 * dt;
          const wobble = Math.sin(emb.wobbleOffset) * 1.5;

          ctx.globalAlpha = emb.alpha;
          ctx.fillStyle = emb.color;
          ctx.beginPath();
          ctx.arc(emb.x + wobble, emb.y, emb.size, 0, Math.PI * 2);
          ctx.fill();

          emb.x += emb.vx * dt;
          emb.y += emb.vy * dt;
          emb.alpha -= emb.decay * dt;

          if (emb.alpha <= 0.02) {
            r.embers.splice(eIdx, 1);
          }
        }

        // Draw Authentic Diwali Bottle-Rocket with 3D Depth, Curvature & Perspective Scaling
        ctx.save();
        ctx.translate(r.x, r.y);
        const flightAngle = Math.atan2(r.vy, r.vx) + Math.PI / 2;
        ctx.rotate(flightAngle);
        // Apply dynamic 3D scale!
        ctx.scale(r.scale, r.scale);

        // Switch to source-over with full opacity so rocket is 100% solid & crisp
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1.0;

        // 1. Wooden bamboo guide stick (extends 36px below rocket)
        ctx.strokeStyle = "#c29b75";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 36);
        ctx.stroke();

        ctx.strokeStyle = "#8d6a45";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0.8, 6);
        ctx.lineTo(0.8, 36);
        ctx.stroke();

        // 2. Rocket Cylindrical Body (11px wide by 24px tall)
        const rw = 11;
        const rh = 24;

        // Subtle shadow behind body for 3D depth
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(-rw / 2 + 1, -rh / 2 + 1, rw, rh);

        // Vibrant 3D cylindrical shaded paper body
        const bodyGrad = ctx.createLinearGradient(-rw / 2, 0, rw / 2, 0);
        bodyGrad.addColorStop(0, "rgba(0,0,0,0.25)");
        bodyGrad.addColorStop(0.35, "rgba(255,255,255,0.35)"); // 3D specular highlight
        bodyGrad.addColorStop(0.65, "rgba(0,0,0,0)");
        bodyGrad.addColorStop(1, "rgba(0,0,0,0.3)");

        ctx.fillStyle = r.bodyColor;
        ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-rw / 2, -rh / 2, rw, rh);

        // Decorative wrapper paper band across middle with 3D sheen
        ctx.fillStyle = r.bandColor;
        ctx.fillRect(-rw / 2, -rh / 6, rw, rh / 3);
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-rw / 2, -rh / 6, rw, rh / 3);

        // White decorative trim lines on the wrapper
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-rw / 2, -rh / 6, rw, 1.5);
        ctx.fillRect(-rw / 2, rh / 6 - 1.5, rw, 1.5);

        // 3D bottom curvature ellipse for the cylinder
        ctx.beginPath();
        ctx.ellipse(0, rh / 2, rw / 2, 2.2, 0, 0, Math.PI);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();

        // Body outline
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);

        // 3. Pointed Nose Cone Cap (13px tall) with 3D light & shadow facets
        const coneHeight = 13;

        // Left lighted facet
        ctx.beginPath();
        ctx.moveTo(-rw / 2 - 1, -rh / 2);
        ctx.lineTo(0, -rh / 2 - coneHeight);
        ctx.lineTo(0, -rh / 2);
        ctx.closePath();
        ctx.fillStyle = r.capColor;
        ctx.fill();

        // Right shaded facet for 3D bevel
        ctx.beginPath();
        ctx.moveTo(0, -rh / 2 - coneHeight);
        ctx.lineTo(rw / 2 + 1, -rh / 2);
        ctx.lineTo(0, -rh / 2);
        ctx.closePath();
        ctx.fillStyle = r.capColor;
        ctx.fill();
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.fill();

        // Cone outline & center ridge line
        ctx.beginPath();
        ctx.moveTo(-rw / 2 - 1, -rh / 2);
        ctx.lineTo(0, -rh / 2 - coneHeight);
        ctx.lineTo(rw / 2 + 1, -rh / 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -rh / 2 - coneHeight);
        ctx.lineTo(0, -rh / 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // 4. Exhaust Nozzle Ring
        ctx.fillStyle = "#222222";
        ctx.fillRect(-rw / 2 + 1.5, rh / 2, rw - 3, 2.5);

        // 5. Blazing Exhaust Flame & Glow
        ctx.globalCompositeOperation = "lighter";

        // Outer vibrant orange flame
        const flameLength = 13 + Math.random() * 6;
        ctx.beginPath();
        ctx.moveTo(-rw / 2 + 1, rh / 2 + 2);
        ctx.quadraticCurveTo(0, rh / 2 + 2 + flameLength, rw / 2 - 1, rh / 2 + 2);
        ctx.fillStyle = "#ff6b00";
        ctx.globalAlpha = 0.85;
        ctx.fill();

        // Inner bright white/yellow core flame
        ctx.beginPath();
        ctx.moveTo(-rw / 2 + 2.5, rh / 2 + 2);
        ctx.quadraticCurveTo(0, rh / 2 + 2 + flameLength * 0.65, rw / 2 - 2.5, rh / 2 + 2);
        ctx.fillStyle = "#fff8db";
        ctx.globalAlpha = 1.0;
        ctx.fill();

        // If coming towards camera, extra blazing nozzle bloom!
        if (r.trajectoryType === "towards-camera") {
          ctx.beginPath();
          ctx.arc(0, rh / 2 + 3, rw * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 200, 50, 0.35)";
          ctx.fill();
        }

        ctx.restore();

        // Motion physics (smooth and measured)
        r.x += r.vx * dt;
        r.y += r.vy * dt;

        // Sky-Crosser vs Normal Apex Detonation
        if (r.mode === "sky-crosser") {
          // Crosses the entire screen past the top without bursting
          if (r.y <= -30) {
            rocketsRef.current.splice(i, 1);
            const targetDelay = 1000 + Math.random() * 800;
            if (
              nextAutoLaunchRef.current > now + targetDelay ||
              nextAutoLaunchRef.current < now
            ) {
              nextAutoLaunchRef.current = now + targetDelay;
            }
          }
        } else {
          // Standard apex detonation
          if (r.y <= r.targetY || r.vy >= 0) {
            handleApexDetonation(r);
            rocketsRef.current.splice(i, 1);

            const targetDelayAfterBurst = 1000 + Math.random() * 800;
            if (
              nextAutoLaunchRef.current > now + targetDelayAfterBurst ||
              nextAutoLaunchRef.current < now
            ) {
              nextAutoLaunchRef.current = now + targetDelayAfterBurst;
            }
          }
        }
      }

      // --- 2. DRAW CENTRAL BURST FLASHES ---
      for (let fIdx = flashesRef.current.length - 1; fIdx >= 0; fIdx--) {
        const fl = flashesRef.current[fIdx];
        if (!fl) continue;

        ctx.globalAlpha = fl.alpha;
        ctx.fillStyle = fl.color;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.radius, 0, Math.PI * 2);
        ctx.fill();

        fl.radius += (fl.maxRadius - fl.radius) * 0.35 * dt;
        fl.alpha -= 0.12 * dt;

        if (fl.alpha <= 0.05) {
          flashesRef.current.splice(fIdx, 1);
        }
      }

      // --- 3. DRAW SPARKLER FOUNTAIN PARTICLES ---
      for (let fIdx = fountainSparksRef.current.length - 1; fIdx >= 0; fIdx--) {
        const spk = fountainSparksRef.current[fIdx];
        if (!spk) continue;

        ctx.globalAlpha = spk.alpha;
        ctx.fillStyle = spk.color;
        ctx.beginPath();
        ctx.arc(spk.x, spk.y, spk.size, 0, Math.PI * 2);
        ctx.fill();

        spk.x += spk.vx * dt;
        spk.y += spk.vy * dt;
        spk.vy += spk.gravity * dt;
        spk.alpha -= spk.decay * dt;

        if (spk.alpha <= 0.02) {
          fountainSparksRef.current.splice(fIdx, 1);
        }
      }

      // --- 4. DRAW SECONDARY SUB-BURST SPARKLES ---
      for (let sIdx = subSparklesRef.current.length - 1; sIdx >= 0; sIdx--) {
        const sub = subSparklesRef.current[sIdx];
        if (!sub) continue;

        ctx.globalAlpha = sub.alpha;
        ctx.fillStyle = sub.color;
        ctx.beginPath();
        ctx.arc(sub.x, sub.y, sub.size, 0, Math.PI * 2);
        ctx.fill();

        sub.x += sub.vx * dt;
        sub.y += sub.vy * dt;
        sub.vy += 0.04 * dt;
        sub.alpha -= sub.decay * dt;

        if (sub.alpha <= 0.02) {
          subSparklesRef.current.splice(sIdx, 1);
        }
      }

      // --- 5. DRAW BURST BEADED RAYS & HANDLE SUB-BURST TIMERS ---
      for (let i = raysRef.current.length - 1; i >= 0; i--) {
        const ray = raysRef.current[i];
        if (!ray) continue;

        // Sub-burst countdown
        if (ray.hasSubBurst && ray.subBurstTimer !== undefined) {
          ray.subBurstTimer -= dt;
          if (ray.subBurstTimer <= 0) {
            triggerSubBurstAt(ray.x, ray.y, ray.color);
            raysRef.current.splice(i, 1);
            continue;
          }
        }

        ray.trail.push({
          x: ray.x,
          y: ray.y,
          size: ray.headSize,
          color: ray.color,
          alpha: ray.alpha,
        });

        if (ray.trail.length > ray.maxTrailLength) {
          ray.trail.shift();
        }

        const trailLen = ray.trail.length;
        for (let t = 0; t < trailLen - 1; t++) {
          const pt = ray.trail[t];
          if (!pt) continue;

          const progress = t / trailLen;
          const beadAlpha = ray.alpha * (0.3 + 0.7 * progress);
          const beadSize = pt.size * (0.6 + 0.4 * progress);

          // Outer soft glow (zero-cost shadow replacement)
          ctx.globalAlpha = beadAlpha * 0.35;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, beadSize * 1.6, 0, Math.PI * 2);
          ctx.fill();

          // Inner bright bead
          ctx.globalAlpha = beadAlpha;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, beadSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Leading pearl head
        ctx.globalAlpha = ray.alpha * 0.5;
        ctx.fillStyle = ray.color;
        ctx.beginPath();
        ctx.arc(ray.x, ray.y, ray.headSize * 2.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = ray.alpha;
        ctx.fillStyle = ray.headColor;
        ctx.beginPath();
        ctx.arc(ray.x, ray.y, ray.headSize * 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Streamer physics
        ray.x += ray.vx * dt;
        ray.y += ray.vy * dt;
        ray.vy += ray.gravity * dt;
        const dragFactor = Math.pow(ray.drag, dt);
        ray.vx *= dragFactor;
        ray.vy *= dragFactor;
        ray.alpha -= ray.decay * dt;

        if (ray.alpha <= 0.02) {
          raysRef.current.splice(i, 1);
        }
      }

      // Reset
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // Cap max particles for silky 60fps performance
      if (raysRef.current.length > 180) {
        raysRef.current.splice(0, raysRef.current.length - 180);
      }
      if (fountainSparksRef.current.length > 120) {
        fountainSparksRef.current.splice(0, fountainSparksRef.current.length - 120);
      }
      if (subSparklesRef.current.length > 80) {
        subSparklesRef.current.splice(0, subSparklesRef.current.length - 80);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      window.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastFrameTimeRef.current = 0;
    };
  }, [enabled]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-20 select-none"
      aria-hidden="true"
    />
  );
});
