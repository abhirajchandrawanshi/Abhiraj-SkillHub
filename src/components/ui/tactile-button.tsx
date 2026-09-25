import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

/* ─── WebGL Shader Sources ─── */

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_level;
uniform float u_tilt;
uniform float u_slosh;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}

float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);
}

float fbm(vec2 p){
  float v=0.0;float a=0.5;
  for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.04+vec2(11.3,7.1);a*=0.5;}
  return v;
}

void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float ar=u_res.x/u_res.y;
  float x=uv.x*ar;
  float t=u_time;
  float amp=0.012+u_slosh*0.045;
  float surf=u_level
    +u_tilt*(uv.x-0.5)*0.34
    +amp*sin(x*5.1+t*4.6)
    +amp*0.62*sin(x*9.7+t*(-6.8)+1.7)
    +amp*0.38*sin(x*14.3+t*8.9+4.2);
  float d=surf-uv.y;

  vec3 col=mix(vec3(0.03,0.06,0.1),vec3(0.05,0.09,0.15),uv.y);
  col+=vec3(0.02,0.05,0.1)*pow(max(0.0,1.0-abs(uv.y-0.88)*6.0),2.0);

  float inside=smoothstep(0.0,0.012,d);
  float depth=clamp(d/max(u_level,0.001),0.0,1.0);
  vec3 liq=mix(vec3(0.0,0.9,1.0),vec3(0.02,0.15,0.45),depth);

  float caust=fbm(vec2(x*4.2,(uv.y+t*0.14)*4.2));
  liq*=0.8+0.42*caust;
  liq+=vec3(0.02,0.25,0.35)*pow(max(0.0,d*3.0),1.5)*u_slosh;

  col=mix(col,liq,inside);
  col+=vec3(0.4,0.9,1.0)*exp(-abs(d)*80.0)*0.85;
  col+=vec3(0.8,0.98,1.0)*exp(-abs(d)*220.0)*0.5;

  vec2 e=uv*(1.0-uv);
  col*=0.55+0.45*pow(e.x*e.y*16.0,0.22);

  gl_FragColor=vec4(col,1.0);
}`;

/* ─── WebGL helpers ─── */

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function initGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;

  const prog = gl.createProgram()!;
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const locP = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(locP);
  gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);

  return {
    gl,
    uRes: gl.getUniformLocation(prog, "u_res"),
    uTime: gl.getUniformLocation(prog, "u_time"),
    uLevel: gl.getUniformLocation(prog, "u_level"),
    uTilt: gl.getUniformLocation(prog, "u_tilt"),
    uSlosh: gl.getUniformLocation(prog, "u_slosh"),
  };
}

/* ─── Component ─── */

export interface TactileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** WebGL liquid fill level 0-1 (default 0.56) */
  liquidLevel?: number;
}

export const TactileButton = React.forwardRef<HTMLButtonElement, TactileButtonProps>(
  ({ children, className, liquidLevel = 0.56, onClick, ...props }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef({
      slosh: 0.4,
      tilt: 0,
      tiltTarget: 0,
      gulp: 0,
      level: liquidLevel,
      lastX: null as number | null,
      lastTime: 0,
      raf: 0,
    });

    const glRef = useRef<ReturnType<typeof initGL>>(null);

    // Initialise WebGL
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      glRef.current = initGL(canvas);
      if (!glRef.current) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const state = stateRef.current;
      state.lastTime = performance.now();

      function resize() {
        if (!canvas || !glRef.current) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          glRef.current.gl.viewport(0, 0, w, h);
        }
      }

      function frame(now: number) {
        const ctx = glRef.current;
        if (!ctx || !canvas) return;
        const { gl, uRes, uTime, uLevel, uTilt, uSlosh } = ctx;
        const dt = Math.min(0.05, (now - state.lastTime) / 1000);
        state.lastTime = now;

        state.slosh *= Math.exp(-1.5 * dt);
        state.gulp *= Math.exp(-1.1 * dt);
        state.tilt += (state.tiltTarget - state.tilt) * Math.min(1, dt * 5);
        const levelTarget = liquidLevel - 0.36 * state.gulp;
        state.level += (levelTarget - state.level) * Math.min(1, dt * 5.5);

        resize();
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, reduced ? 2.0 : now / 1000);
        gl.uniform1f(uLevel, state.level);
        gl.uniform1f(uTilt, state.tilt);
        gl.uniform1f(uSlosh, reduced ? 0.25 : state.slosh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        state.raf = requestAnimationFrame(frame);
      }

      state.raf = requestAnimationFrame(frame);
      window.addEventListener("resize", resize);

      return () => {
        cancelAnimationFrame(state.raf);
        window.removeEventListener("resize", resize);
      };
    }, [liquidLevel]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      const state = stateRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(1, rect.width);
      if (state.lastX !== null) {
        state.slosh = Math.min(1.4, state.slosh + Math.abs(x - state.lastX) * 2.6);
      }
      state.lastX = x;
      state.tiltTarget = Math.max(-1, Math.min(1, (x - 0.5) * 2));
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLButtonElement>) => {
      const state = stateRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / Math.max(1, rect.width);
      if (state.lastX !== null) {
        state.slosh = Math.min(1.4, state.slosh + Math.abs(x - state.lastX) * 2.6);
      }
      state.lastX = x;
      state.tiltTarget = Math.max(-1, Math.min(1, (x - 0.5) * 2));
    }, []);

    const handleMouseLeave = useCallback(() => {
      stateRef.current.lastX = null;
      stateRef.current.tiltTarget = 0;
    }, []);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        stateRef.current.gulp = 1;
        stateRef.current.slosh = Math.min(1.4, stateRef.current.slosh + 0.7);
        onClick?.(e);
      },
      [onClick],
    );

    const handleFocus = useCallback(() => {
      stateRef.current.slosh = Math.min(1.4, stateRef.current.slosh + 0.5);
    }, []);

    return (
      <div className="p-[1px] rounded-[19px] bg-gradient-to-b from-cyan-500/30 via-neutral-800/20 to-cyan-950/40 shadow-2xl w-full sm:w-auto">
        <button
          ref={ref}
          type="button"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onTouchStart={() => {
            stateRef.current.slosh = Math.min(1.4, stateRef.current.slosh + 0.5);
          }}
          onMouseLeave={handleMouseLeave}
          onTouchEnd={handleMouseLeave}
          onClick={handleClick}
          onFocus={handleFocus}
          className={cn(
            "relative flex items-center justify-center border-0 p-0 rounded-[18px] overflow-hidden cursor-pointer bg-[#050b11] w-full",
            "transition-all duration-300 ease-out",
            "shadow-[0_22px_44px_rgba(4,24,36,0.35),0_3px_9px_rgba(5,10,15,0.4),inset_0_0_0_1px_rgba(255,255,255,0.05)]",
            "hover:-translate-y-[2px] hover:shadow-[0_28px_56px_rgba(6,182,212,0.25),0_4px_11px_rgba(5,10,15,0.45)]",
            "active:translate-y-[1px] active:scale-[0.985]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 focus-visible:outline-offset-[5px]",
            className,
          )}
          {...props}
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full block"
          />
          <span className="relative z-10 pointer-events-none font-medium text-sm sm:text-base tracking-[0.2em] indent-[0.2em] text-[#e0faff] drop-shadow-[0_1px_10px_rgba(0,18,25,0.85)] flex items-center gap-2 px-6 py-3">
            {children}
          </span>
        </button>
      </div>
    );
  },
);

TactileButton.displayName = "TactileButton";
export default TactileButton;
