import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Palette } from "../theme";
import { rand } from "../lib/anim";

type Props = {
  p: Palette;
  variant?: string;
  /** Seed so two scenes of the same variant don't look identical. */
  seed?: number;
};

const Grain: React.FC<{ p: Palette }> = ({ p }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: `url(${staticFile("assets/grain.png")})`,
        backgroundSize: "256px 256px",
        backgroundPosition: `${(frame * 37) % 256}px ${(frame * 17) % 256}px`,
        opacity: p.grain,
        mixBlendMode: p.mode === "dark" ? "screen" : "multiply",
      }}
    />
  );
};

const Vignette: React.FC<{ p: Palette }> = ({ p }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        p.mode === "dark"
          ? "radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(0,0,0,0.42) 100%)"
          : "radial-gradient(ellipse at 50% 42%, transparent 48%, rgba(74,48,24,0.14) 100%)",
    }}
  />
);

const Blobs: React.FC<{ p: Palette; seed: number }> = ({ p, seed }) => {
  const frame = useCurrentFrame();
  const drift = (speed: number, phase: number, amp: number) =>
    Math.sin(frame / speed + phase) * amp;
  const blobs = [
    { x: 18, y: 22, size: 1100, color: p.accent, o: 0.35, s: 170, ph: seed },
    { x: 82, y: 28, size: 900, color: p.accent2, o: 0.25, s: 210, ph: seed + 2 },
    { x: 62, y: 88, size: 1200, color: p.accent, o: 0.16, s: 260, ph: seed + 4 },
  ];
  return (
    <>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.size,
            height: b.size,
            marginLeft: -b.size / 2,
            marginTop: -b.size / 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b.color} 0%, transparent 66%)`,
            opacity: p.mode === "dark" ? b.o * 0.72 : b.o * 0.5,
            transform: `translate(${drift(b.s, b.ph, 46)}px, ${drift(
              b.s * 1.2,
              b.ph + 1,
              34,
            )}px)`,
            filter: "blur(10px)",
          }}
        />
      ))}
    </>
  );
};

const Grid: React.FC<{ p: Palette }> = ({ p }) => {
  const frame = useCurrentFrame();
  const size = 88;
  return (
    <AbsoluteFill
      style={{
        opacity: p.mode === "dark" ? 0.5 : 0.55,
        backgroundImage: `repeating-linear-gradient(0deg, ${p.line} 0px, ${p.line} 1px, transparent 1px, transparent ${size}px), repeating-linear-gradient(90deg, ${p.line} 0px, ${p.line} 1px, transparent 1px, transparent ${size}px)`,
        backgroundPosition: `0px ${(frame * 0.18) % size}px`,
        maskImage:
          "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 55%, transparent 82%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 55%, transparent 82%)",
      }}
    />
  );
};

const Sunset: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const sunY = 60 - Math.min(5, frame / 240);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #060C1C 0%, #0B1D3E 26%, #243A66 46%, #7A4A63 63%, #C9683C 78%, #F0A356 91%, #F7C987 100%)",
        }}
      />
      {/* sun glow */}
      <div
        style={{
          position: "absolute",
          left: "63%",
          top: `${sunY}%`,
          width: 1300,
          height: 1300,
          marginLeft: -650,
          marginTop: -650,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,214,150,0.55) 0%, rgba(255,166,92,0.22) 30%, rgba(255,140,70,0.06) 52%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "63%",
          top: `${sunY}%`,
          width: 156,
          height: 156,
          marginLeft: -78,
          marginTop: -78,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%, #FFF6DA, #FFD48A 60%, #FFAE63 100%)",
          boxShadow: "0 0 90px 34px rgba(255,183,104,0.42)",
        }}
      />
      {/* haze bands */}
      <AbsoluteFill
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,236,205,0.05) 0px, rgba(255,236,205,0.05) 2px, transparent 2px, transparent 9px)",
          maskImage: "linear-gradient(180deg, transparent 35%, black 70%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 35%, black 70%, black 92%, transparent 100%)",
        }}
      />
      {/* stars */}
      {Array.from({ length: 46 }).map((_, i) => {
        const x = rand(i + seed) * 100;
        const y = rand(i + seed + 40) * 30;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / (26 + (i % 9) * 7) + i));
        return (
          <div
            key={`star-${i}`}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: i % 11 === 0 ? 3 : 2,
              height: i % 11 === 0 ? 3 : 2,
              borderRadius: "50%",
              background: "#FFF4DA",
              opacity: tw * 0.75,
            }}
          />
        );
      })}
      {/* drifting motes */}
      {Array.from({ length: 16 }).map((_, i) => {
        const baseX = rand(i + seed + 90) * 100;
        const baseY = 55 + rand(i + seed + 130) * 40;
        const x = baseX + Math.sin(frame / (70 + i * 9) + i) * 1.6;
        const y = baseY - ((frame / 26 + i * 13) % 24);
        return (
          <div
            key={`mote-${i}`}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: 4 + (i % 2) * 3,
              height: 4 + (i % 2) * 3,
              borderRadius: "50%",
              background: "rgba(255,222,176,0.55)",
              filter: "blur(0.5px)",
            }}
          />
        );
      })}
      {/* hills */}
      <svg
        viewBox="0 0 1920 320"
        preserveAspectRatio="none"
        style={{ position: "absolute", bottom: 0, width: "100%", height: 300 }}
      >
        <path
          d="M0,196 C210,128 360,206 600,172 C840,138 980,198 1210,164 C1460,126 1660,192 1920,154 L1920,320 L0,320 Z"
          fill="#0A1424"
          opacity="0.9"
        />
        <path
          d="M0,246 C300,206 520,256 780,228 C1040,200 1300,252 1600,224 C1740,210 1850,232 1920,222 L1920,320 L0,320 Z"
          fill="#050A12"
        />
      </svg>
    </AbsoluteFill>
  );
};

const Aurora: React.FC<{ p: Palette; seed: number }> = ({ p, seed }) => {
  const frame = useCurrentFrame();
  const shift = (s: number, ph: number) => Math.sin(frame / s + ph);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 118%, #10233F 0%, #081324 46%, #04070E 100%)",
        }}
      />
      {[
        { c: p.accent, x: 28, y: 32, w: 1200, h: 660, r: -18, o: 0.5, s: 210 },
        { c: p.accent2, x: 72, y: 42, w: 1100, h: 600, r: 14, o: 0.42, s: 260 },
        { c: "#FFE9C7", x: 52, y: 74, w: 1500, h: 520, r: 0, o: 0.12, s: 320 },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.w,
            height: b.h,
            marginLeft: -b.w / 2,
            marginTop: -b.h / 2,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${b.c} 0%, transparent 68%)`,
            opacity: b.o,
            transform: `rotate(${b.r + shift(b.s, seed + i) * 6}deg) translateX(${
              shift(b.s * 0.8, seed + i) * 40
            }px)`,
            filter: "blur(24px)",
          }}
        />
      ))}
      <Grid p={{ ...p, line: "rgba(255,255,255,0.08)" }} />
    </AbsoluteFill>
  );
};

export const Backdrop: React.FC<Props> = ({ p, variant = "plain", seed = 0 }) => {
  const v = variant ?? "plain";
  if (v === "sunset") {
    return (
      <AbsoluteFill style={{ background: p.bg }}>
        <Sunset seed={seed} />
        <Grain p={{ ...p, mode: "dark" }} />
      </AbsoluteFill>
    );
  }
  if (v === "aurora") {
    return (
      <AbsoluteFill style={{ background: "#060B16" }}>
        <Aurora p={p} seed={seed} />
        <Grain p={{ ...p, mode: "dark" }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${p.bg} 0%, ${p.bg} 42%, ${p.bg2} 100%)`,
      }}
    >
      <Blobs p={p} seed={seed} />
      {v === "grid" && <Grid p={p} />}
      {v === "glow" && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            width: 1500,
            height: 900,
            marginLeft: -750,
            marginTop: -450,
            background: `radial-gradient(ellipse, ${p.glow} 0%, transparent 62%)`,
          }}
        />
      )}
      <Grain p={p} />
      <Vignette p={p} />
    </AbsoluteFill>
  );
};
