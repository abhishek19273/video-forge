import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.4, 0, 1, 1);

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Springy 0→1 reveal that starts at `delay` frames. */
export const useEnter = (
  delay = 0,
  config: { stiffness?: number; damping?: number; mass?: number } = {},
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { stiffness = 130, damping = 20, mass = 0.7 } = config;
  return spring({
    frame: frame - delay,
    fps,
    config: { stiffness, damping, mass },
  });
};

/** Eased 0→1 progress that starts at `delay` and takes `duration` frames. */
export const useProgress = (delay = 0, duration = 30, easing = easeOut) => {
  const frame = useCurrentFrame();
  return interpolate(frame - delay, [0, Math.max(1, duration)], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/** 0→1→0 pulse, looping with `period` frames. */
export const usePulse = (period = 90, phase = 0) => {
  const frame = useCurrentFrame();
  return 0.5 + 0.5 * Math.sin(((frame + phase) / period) * Math.PI * 2);
};

export const fadeUp = (p: number, distance = 26, scaleFrom = 1) => ({
  opacity: clamp(p),
  transform: `translateY(${(1 - p) * distance}px) scale(${
    scaleFrom + (1 - scaleFrom) * p
  })`,
});

export const fadeIn = (p: number) => ({ opacity: clamp(p) });

export const pop = (p: number, from = 0.92) => ({
  opacity: clamp(p),
  transform: `scale(${from + (1 - from) * p})`,
});

/** Deterministic pseudo-random in [0,1) — safe across render workers. */
export const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Stagger helper: i-th item starts at base + i*step. */
export const at = (i: number, base = 0, step = 4) => base + i * step;
