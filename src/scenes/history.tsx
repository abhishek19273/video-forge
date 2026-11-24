import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { FONTS } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { Kicker, RichWords, Panel } from "../components/ui";
import { clamp, rand, useEnter, useProgress } from "../lib/anim";
import { SceneProps, paletteFor } from "./common";

const resolve = (src: string) => (/^(https?:|data:|\/)/.test(src) ? src : staticFile(src));

/* ---------------------------------- map ---------------------------------- */

const MAP_W = 1000;
const MAP_H = 900;
const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

type MapPoint = {
  lat: number;
  lon: number;
  label: string;
  note?: string;
  kind?: "origin" | "stop" | "jump" | "end";
  leg?: number;
  hideLabel?: boolean;
  hideDot?: boolean;
  dx?: number;
  dy?: number;
};

const project = (pt: MapPoint, bounds: number[]) => {
  const [west, south, east, north] = bounds;
  const x = ((pt.lon - west) / (east - west)) * MAP_W;
  const y = ((merc(north) - merc(pt.lat)) / (merc(north) - merc(south))) * MAP_H;
  return { x, y };
};

const pointAt = (pts: { x: number; y: number }[], t: number) => {
  if (pts.length < 2) return { x: pts[0]?.x ?? 0, y: pts[0]?.y ?? 0, angle: 0 };
  const total = pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
  let target = clamp(t) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (target <= len) {
      const k = len === 0 ? 0 : target / len;
      return {
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }
    target -= len;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
};

export const MapScene: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const points = (props.points as MapPoint[]) ?? [];
  const bounds = (props.bounds as number[]) ?? [-131, 33, -109, 50];
  const projected = points.map((pt) => ({ ...pt, ...project(pt, bounds) }));
  const edges = projected.slice(1).map((pt, i) => ({ a: projected[i], b: pt, leg: pt.leg ?? 1 }));
  const pathFor = (leg: number) =>
    edges
      .filter((e) => e.leg === leg)
      .map((e, i) => `${i === 0 ? "M" : "L"} ${e.a.x} ${e.a.y} L ${e.b.x} ${e.b.y}`)
      .join(" ");
  const leg1 = pathFor(1);
  const leg2 = pathFor(2);
  const draw = useProgress(10, 54, (t) => 1 - Math.pow(1 - t, 2));
  const planeT = useProgress(18, 52);
  const plane = pointAt(projected, planeT);
  const frame = useCurrentFrame();
  const src = String(props.src ?? props.image ?? "");

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions} padded={false}>
      <AbsoluteFill style={{ background: "#050B14" }}>
        {src ? (
          <Img
            src={resolve(src)}
            style={{ position: "absolute", right: 0, top: 0, width: 1200, height: 1080, objectFit: "fill" }}
          />
        ) : null}
        {/* left legibility wash */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(90deg, #050B14 0%, #050B14 34%, rgba(5,11,20,0.92) 45%, rgba(5,11,20,0.35) 60%, rgba(5,11,20,0) 72%)",
          }}
        />
        {/* route overlay, aligned to the 1000x900 map scaled to 1200x1080 */}
        <div style={{ position: "absolute", right: 0, top: 0, width: 1200, height: 1080 }}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path d={leg1} fill="none" stroke="rgba(255,246,230,0.3)" strokeWidth={2.5} strokeDasharray="7 9" />
            <path d={leg2} fill="none" stroke="#F5A524" strokeWidth={6} opacity={0.16} filter="url(#routeGlow)" />
            <path
              d={leg2}
              fill="none"
              stroke="#F5A524"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - draw}
            />
            {projected.filter((pt) => !pt.hideDot).map((pt, i) => {
              const e = useProgress(16 + i * 8, 18);
              return (
                <g key={i} opacity={e}>
                  {pt.kind === "jump" ? (
                    <>
                      <circle cx={pt.x} cy={pt.y} r={26} fill="none" stroke="#FF6B5A" strokeWidth={1.5} opacity={0.5} />
                      <circle cx={pt.x} cy={pt.y} r={10 + Math.sin(frame / 14) * 2} fill="#FF6B5A" />
                    </>
                  ) : (
                    <circle cx={pt.x} cy={pt.y} r={8} fill={pt.kind === "origin" ? "#F5A524" : "#FFF6E6"} stroke="#07101C" strokeWidth={2} />
                  )}
                </g>
              );
            })}
            <g transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle})`} opacity={planeT > 0.02 ? 1 : 0}>
              <path d="M18 0 L-10 7 L-4 0 L-10 -7 Z" fill="#FFF6E6" />
              <path d="M-2 0 L-14 5 L-14 -5 Z" fill="#F5A524" />
            </g>
          </svg>
          {projected.filter((pt) => !pt.hideLabel).map((pt, i) => {
            const e = useProgress(20 + i * 8, 18);
            const leftPct = (pt.x / MAP_W) * 100;
            const topPct = (pt.y / MAP_H) * 100;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: `translate(${pt.dx ?? 20}px, ${pt.dy ?? -18}px)${
                    (pt.dx ?? 20) < 0 ? " translateX(-100%)" : ""
                  }`,
                  opacity: e,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: (pt.dx ?? 20) < 0 ? "flex-end" : "flex-start",
                  gap: 3,
                  pointerEvents: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {pt.kind === "jump" ? (
                    <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: "#FF8A7A", border: "1px solid #FF6B5A", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.1em" }}>
                      JUMP
                    </span>
                  ) : null}
                  <span style={{ fontFamily: FONTS.sans, fontWeight: 650, fontSize: 22, color: "#FFF6E6", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                    {pt.label}
                  </span>
                </div>
                {pt.note ? (
                  <span style={{ fontFamily: FONTS.mono, fontSize: 14, color: "rgba(255,246,230,0.62)", letterSpacing: "0.04em" }}>
                    {pt.note}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* left editorial column */}
      <div style={{ position: "absolute", left: 120, top: 96, width: 660, paddingRight: 30 }}>
        <Kicker p={{ ...p, accent: "#F5A524" }} delay={2} color="#F5A524">{String(props.kicker ?? "")}</Kicker>
        <div style={{ height: 16 }} />
        <RichWords
          text={String(props.title ?? "")}
          p={{ ...p, ink: "#FFF6E6", accent: "#FFC97A" }}
          size={64}
          family={FONTS.display}
          weight={400}
          lineHeight={1.03}
          delay={5}
          stagger={2.6}
        />
        <div style={{ height: 40 }} />
        {projected.map((pt, i) => {
          const e = useProgress(24 + i * 8, 18);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                padding: "13px 0",
                borderTop: "1px solid rgba(255,246,230,0.12)",
                opacity: e,
                transform: `translateX(${(1 - e) * 12}px)`,
              }}
            >
              <span style={{ fontFamily: FONTS.mono, fontSize: 16, color: "#F5A524", minWidth: 74, letterSpacing: "0.04em" }}>
                {pt.note ?? ""}
              </span>
              <span style={{ fontFamily: FONTS.sans, fontSize: 23, fontWeight: 560, color: "rgba(255,246,230,0.92)" }}>
                {pt.label}
              </span>
            </div>
          );
        })}
        {props.footnote ? (
          <div style={{ marginTop: 26, fontFamily: FONTS.mono, fontSize: 15, lineHeight: 1.6, color: "rgba(255,246,230,0.42)", letterSpacing: "0.03em" }}>
            {String(props.footnote)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};

/* -------------------------------- flight --------------------------------- */

const Stars: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 70 }).map((_, i) => {
        const x = rand(i + 3) * 100;
        const y = rand(i + 41) * 62;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(frame / (22 + (i % 7) * 5) + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: i % 13 === 0 ? 3 : 2,
              height: i % 13 === 0 ? 3 : 2,
              borderRadius: "50%",
              background: "#FFF4DA",
              opacity: tw * 0.7,
            }}
          />
        );
      })}
    </>
  );
};

export const Plane727: React.FC<{ stairs: number; glow: number }> = ({ stairs, glow }) => (
  <svg viewBox="0 0 1200 520" style={{ width: "100%", height: "auto", overflow: "visible" }}>
    <defs>
      <linearGradient id="fus" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#EEF3F9" />
        <stop offset="58%" stopColor="#C9D6E6" />
        <stop offset="100%" stopColor="#8EA1B8" />
      </linearGradient>
      <linearGradient id="wing" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#B9C7D8" />
        <stop offset="100%" stopColor="#7E91A8" />
      </linearGradient>
      <radialGradient id="engineGlow">
        <stop offset="0%" stopColor="#FFC97A" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#FFC97A" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* tail fin + T tail */}
    <path d="M300 205 L228 205 L242 92 L302 92 Z" fill="#DCE6F1" stroke="#7E91A8" strokeWidth="2" />
    <path d="M248 96 L118 78 L116 100 L250 118 Z" fill="#C9D6E6" stroke="#7E91A8" strokeWidth="2" />
    {/* fuselage */}
    <path
      d="M1108 266 C1108 222 1068 202 1004 202 L304 202 C252 202 228 220 216 254 L199 284 C194 303 210 321 242 325 L1004 325 C1068 325 1108 306 1108 266 Z"
      fill="url(#fus)"
      stroke="#7E91A8"
      strokeWidth="2"
    />
    {/* belly shadow */}
    <path d="M220 300 L1080 300 C1060 320 1020 325 1000 325 L250 325 C225 325 212 314 220 300 Z" fill="#6C7F96" opacity="0.55" />
    {/* livery stripe */}
    <path d="M232 292 L1084 292" stroke="#C2410C" strokeWidth="7" opacity="0.9" />
    <path d="M232 303 L1084 303" stroke="#1F3A5F" strokeWidth="4" opacity="0.9" />

    {/* windows */}
    {Array.from({ length: 21 }).map((_, i) => (
      <rect key={i} x={352 + i * 30} y={236} width={15} height={20} rx={4} fill="#0A1524" opacity={i % 5 === 3 ? 0.45 : 0.9} />
    ))}
    {/* cockpit windows */}
    <path d="M1012 224 L1062 241 L1057 258 L1005 247 Z" fill="#0A1524" />
    <path d="M1012 224 L1030 229 L1026 241 L1008 237 Z" fill="#5DA9C9" opacity="0.5" />
    {/* door */}
    <rect x={318} y={224} width={34} height={78} rx={6} fill="#AFC0D2" stroke="#7E91A8" strokeWidth="2" />
    <circle cx={344} cy={264} r={3} fill="#33465C" />

    {/* wing */}
    <path d="M792 316 L604 404 L690 420 L900 344 Z" fill="url(#wing)" stroke="#687C93" strokeWidth="2" />
    <path d="M640 392 L700 404" stroke="#5B6F86" strokeWidth="3" opacity="0.7" />

    {/* engines under wing */}
    {[
      { x: 700, y: 362, s: 1 },
      { x: 606, y: 398, s: 0.86 },
    ].map((e, i) => (
      <g key={i} transform={`translate(${e.x} ${e.y}) scale(${e.s})`}>
        <path d="M-48 0 C-48 -15 -38 -22 -18 -22 L38 -22 C54 -22 62 -12 62 0 C62 12 54 22 38 22 L-18 22 C-38 22 -48 15 -48 0 Z" fill="#D5E0EC" stroke="#6C7F96" strokeWidth="2" />
        <ellipse cx={-44} cy={0} rx={9} ry={17} fill="#22303F" />
        <path d="M20 -22 L30 22" stroke="#8FA2B8" strokeWidth="2" />
      </g>
    ))}
    {/* tail engine */}
    <g transform="translate(287 168) scale(0.8)">
      <path d="M-44 0 C-44 -14 -35 -21 -16 -21 L34 -21 C50 -21 58 -11 58 0 C58 11 50 21 34 21 L-16 21 C-35 21 -44 14 -44 0 Z" fill="#D5E0EC" stroke="#6C7F96" strokeWidth="2" />
      <ellipse cx={-40} cy={0} rx={8} ry={16} fill="#22303F" />
    </g>

    {/* aft airstairs */}
    <g opacity={stairs > 0.02 ? 1 : 0.99}>
      <path
        d="M318 300 L246 432 L286 446 L360 306 Z"
        fill="#22303F"
        stroke="#8FA2B8"
        strokeWidth="2"
        opacity={stairs}
        transform={`translate(0 ${(1 - stairs) * -20})`}
      />
      {Array.from({ length: 7 }).map((_, i) => {
        const y = 308 + i * 19;
        const x = 316 - i * 10;
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x + 42}
            y2={y + 4}
            stroke="#9FB2C7"
            strokeWidth="2"
            opacity={stairs}
            transform={`translate(0 ${(1 - stairs) * -20})`}
          />
        );
      })}
      {/* open door */}
      <rect x={318} y={224} width={34} height={78} rx={4} fill="#0A1524" opacity={0.55} />
      {stairs > 0.25 ? (
        <g opacity={clamp((stairs - 0.25) * 3)}>
          <circle cx={333} cy={246} r={8} fill="#111A28" stroke="#FFD9A0" strokeWidth={1.4} />
          <path d="M326 254 L340 254 L344 288 L322 288 Z" fill="#111A28" stroke="#FFD9A0" strokeWidth={1.2} />
          <path d="M326 288 L318 306 M340 288 L348 306" stroke="#111A28" strokeWidth={6} strokeLinecap="round" />
        </g>
      ) : null}
    </g>

    {/* exhaust glow */}
    <ellipse cx={252} cy={168} rx={60 * glow} ry={26 * glow} fill="url(#engineGlow)" />
  </svg>
);

export const Parachute: React.FC<{ p: number; x: number; y: number }> = ({ p, x, y }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 22) * 12;
  const descend = 520 + p * 160;
  return (
    <g transform={`translate(${x + sway} ${descend})`} opacity={p > 0.01 ? 1 : 0}>
      <path d="M-120 0 Q0 -118 120 0 Q0 34 -120 0 Z" fill="#F1E4CE" stroke="#C9BBA2" strokeWidth="2" />
      <path d="M-120 0 Q0 -118 120 0" fill="none" stroke="#C2410C" strokeWidth="3" />
      <path d="M-60 -78 Q0 -20 60 -78" fill="none" stroke="#C2410C" strokeWidth="2" opacity="0.6" />
      {[-110, -72, -36, 0, 36, 72, 110].map((lx, i) => (
        <line key={i} x1={lx} y1={2} x2={0} y2={150} stroke="rgba(255,246,230,0.55)" strokeWidth="1.2" />
      ))}
      {/* figure */}
      <g transform="translate(0 150)">
        <circle cx={0} cy={0} r={10} fill="#D9B48A" stroke="#FFD9A0" strokeWidth={1.4} />
        <path d="M-8 10 L8 10 L12 44 L-12 44 Z" fill="#16202E" stroke="#FFD9A0" strokeWidth={1.4} />
        <path d="M-10 44 L-18 68 M10 44 L16 70" stroke="#16202E" strokeWidth="7" strokeLinecap="round" />
        <path d="M-9 18 L-22 8 M9 18 L22 8" stroke="#16202E" strokeWidth="6" strokeLinecap="round" />
        <rect x={-30} y={30} width={22} height={28} rx={4} fill="#7A5A32" stroke="#3D2C16" strokeWidth="2" />
        <text x={-19} y={50} fontSize={16} textAnchor="middle" fill="#FFE9B0" fontFamily="monospace">$</text>
      </g>
    </g>
  );
};

export const Flight: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const frame = useCurrentFrame();
  const enter = useProgress(0, 24);
  const stairs = useProgress(24, 22);
  const jump = useProgress(48, 46);
  const planeX = (1 - enter) * 220 - jump * 30;
  const planeY = 210 + Math.sin(frame / 34) * 6;
  const tilt = -3 + Math.sin(frame / 40) * 0.6;

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions} padded={false}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #03070F 0%, #0A1526 46%, #101C2E 72%, #050A12 100%)" }}>
        <Stars />
        {/* clouds */}
        {[
          { y: 740, o: 0.22, w: 1000, x: -200, s: 0.35 },
          { y: 860, o: 0.3, w: 1400, x: -300, s: 0.22 },
          { y: 640, o: 0.12, w: 800, x: 900, s: 0.28 },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: c.y,
              left: c.x + Math.sin(frame / (90 + i * 20) + i) * 60,
              width: c.w,
              height: 220,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(190,210,235,0.8) 0%, rgba(120,145,175,0.18) 55%, transparent 72%)",
              opacity: c.o,
              filter: "blur(18px)",
            }}
          />
        ))}
        {/* searchlights */}
        <div style={{ position: "absolute", left: -220, bottom: -260, width: 900, height: 1100, background: "linear-gradient(70deg, rgba(160,200,255,0.10), transparent 55%)", transform: `rotate(${Math.sin(frame / 80) * 4}deg)`, transformOrigin: "bottom left" }} />
        <div style={{ position: "absolute", right: -260, bottom: -300, width: 900, height: 1100, background: "linear-gradient(-70deg, rgba(160,200,255,0.08), transparent 55%)", transform: `rotate(${Math.sin(frame / 90 + 2) * 4}deg)`, transformOrigin: "bottom right" }} />

        <div
          style={{
            position: "absolute",
            left: 360 + planeX,
            top: planeY,
            width: 1000,
            transform: `rotate(${tilt}deg)`,
            filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.55))",
          }}
        >
          <Plane727 stairs={stairs} glow={0.8} />
        </div>

        <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <Parachute p={jump} x={1560} y={0} />
          {/* jump trajectory */}
          <path
            d="M 700 500 Q 1140 380 1548 604"
            fill="none"
            stroke="rgba(255,201,122,0.34)"
            strokeWidth={2}
            strokeDasharray="4 10"
            opacity={clamp((stairs - 0.3) * 2)}
          />
        </svg>
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 120, top: 96, width: 760 }}>
        <Kicker p={{ ...p, accent: "#FFC97A" }} delay={2} color="#FFC97A">{String(props.kicker ?? "")}</Kicker>
        <div style={{ height: 16 }} />
        <RichWords
          text={String(props.title ?? "")}
          p={{ ...p, ink: "#FFF6E6", accent: "#FFC97A" }}
          size={62}
          family={FONTS.display}
          weight={400}
          lineHeight={1.04}
          delay={5}
          stagger={2.6}
        />
      </div>

      <div style={{ position: "absolute", right: 120, top: 120, textAlign: "right", fontFamily: FONTS.mono, fontSize: 17, letterSpacing: "0.1em", color: "rgba(255,246,230,0.62)", lineHeight: 2 }}>
        <div>{String(props.tail ?? "BOEING 727-51 · N467US")}</div>
        <div style={{ color: "#FFC97A" }}>{String(props.altitude ?? "10,000 FT · 8:13 PM")}</div>
      </div>

      {props.note ? (
        <div style={{ position: "absolute", left: 120, bottom: 150, fontFamily: FONTS.mono, fontSize: 16, letterSpacing: "0.05em", color: "rgba(255,246,230,0.5)", maxWidth: 700, lineHeight: 1.6 }}>
          {String(props.note)}
        </div>
      ) : null}
    </SceneShell>
  );
};

/* -------------------------------- portrait -------------------------------- */

export const Portrait: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const frame = useCurrentFrame();
  const imgIn = useProgress(4, 28);
  const facts = (props.facts as { label: string; value: string }[]) ?? [];
  const scan = (frame % 150) / 150;
  const stamp = useEnter(46, { stiffness: 160, damping: 14 });

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", gap: 78, flex: 1, alignItems: "center" }}>
        <div
          style={{
            width: 640,
            flexShrink: 0,
            background: "#EFE7D8",
            borderRadius: 10,
            padding: "18px 18px 14px",
            boxShadow: "0 40px 90px rgba(0,0,0,0.38)",
            transform: `rotate(${-1.4 + (1 - imgIn) * 1.5}deg)`,
            opacity: imgIn,
            color: "#1A1510",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.12em", color: "#6B5B47", borderBottom: "1px solid rgba(26,21,16,0.2)", paddingBottom: 10 }}>
            <span>FEDERAL BUREAU OF INVESTIGATION</span>
            <span>NORJAK · 302</span>
          </div>
          <div style={{ position: "relative", height: 620, marginTop: 14, overflow: "hidden", background: "#DED4C2" }}>
            <Img
              src={staticFile(String(props.image ?? ""))}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "50% 18%",
                filter: "grayscale(1) contrast(1.12) sepia(0.16)",
                transform: `scale(${1.04 + imgIn * 0.02})`,
              }}
            />
            <div style={{ position: "absolute", left: 0, right: 0, top: `${scan * 100}%`, height: 2, background: "rgba(194,65,12,0.7)", boxShadow: "0 0 18px 6px rgba(194,65,12,0.25)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,15,10,0.06), transparent 30%, rgba(20,15,10,0.22))" }} />
            <div
              style={{
                position: "absolute",
                right: 18,
                bottom: 22,
                border: "3px solid #B23A18",
                color: "#B23A18",
                fontFamily: FONTS.mono,
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: "0.18em",
                padding: "8px 14px",
                transform: `rotate(-11deg) scale(${0.8 + stamp * 0.2})`,
                opacity: stamp * 0.85,
                mixBlendMode: "multiply",
              }}
            >
              UNSOLVED
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.mono, fontSize: 11, letterSpacing: "0.1em", color: "#6B5B47", paddingTop: 10 }}>
            <span>{String(props.credit ?? "FBI composite · 1972")}</span>
            <span>EXHIBIT A</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <Kicker p={p} delay={2}>{String(props.kicker ?? "The suspect")}</Kicker>
          <div style={{ height: 18 }} />
          <div style={{ fontFamily: FONTS.display, fontSize: 96, lineHeight: 0.98, letterSpacing: "-0.03em" }}>
            {String(props.name ?? "Dan Cooper")}
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 18, letterSpacing: "0.1em", color: p.accent, marginTop: 14, textTransform: "uppercase" }}>
            {String(props.alias ?? "The press called him D. B. Cooper")}
          </div>
          <div style={{ height: 34 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 44px" }}>
            {facts.map((f, i) => {
              const e = useProgress(18 + i * 5, 18);
              return (
                <div key={i} style={{ borderTop: `1px solid ${p.line}`, padding: "12px 0", opacity: e }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 13, letterSpacing: "0.14em", color: p.soft, textTransform: "uppercase" }}>
                    {f.label}
                  </div>
                  <div style={{ fontFamily: FONTS.sans, fontSize: 24, fontWeight: 560, marginTop: 4 }}>{f.value}</div>
                </div>
              );
            })}
          </div>
          {props.note ? (
            <div style={{ marginTop: 26, fontFamily: FONTS.sans, fontSize: 21, lineHeight: 1.55, color: p.soft, maxWidth: 760 }}>
              {String(props.note)}
            </div>
          ) : null}
        </div>
      </div>
    </SceneShell>
  );
};

/* -------------------------------- evidence -------------------------------- */

const EvidenceIcon: React.FC<{ kind: string; color: string }> = ({ kind, color }) => {
  if (kind === "money") {
    return (
      <svg viewBox="0 0 200 160" style={{ width: 180, height: 150 }}>
        <path d="M58 64 L58 44 L142 44 L142 64" fill="none" stroke={color} strokeWidth="3" />
        <path d="M48 62 L152 62 L142 132 L58 132 Z" fill="rgba(245,165,36,0.12)" stroke={color} strokeWidth="3" />
        <text x="100" y="108" textAnchor="middle" fontFamily="monospace" fontSize="46" fill={color}>$</text>
        <path d="M48 62 L58 44 M152 62 L142 44" stroke={color} strokeWidth="3" />
      </svg>
    );
  }
  if (kind === "parachute") {
    return (
      <svg viewBox="0 0 200 160" style={{ width: 180, height: 150 }}>
        <path d="M30 66 Q100 4 170 66 Q100 88 30 66 Z" fill="rgba(255,201,122,0.12)" stroke={color} strokeWidth="3" />
        <path d="M52 58 Q100 20 148 58" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
        {[38, 62, 86, 112, 138, 162].map((x, i) => (
          <line key={i} x1={x} y1={68} x2={100} y2={128} stroke={color} strokeWidth="1.6" opacity="0.7" />
        ))}
        <circle cx="100" cy="134" r="7" fill={color} />
        <path d="M100 141 L100 152" stroke={color} strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 160" style={{ width: 180, height: 150 }}>
      <path d="M86 18 L100 32 L114 18 L108 40 L92 40 Z" fill={color} />
      <path d="M92 42 L108 42 L116 118 L100 142 L84 118 Z" fill={color} opacity="0.85" />
      <rect x="92" y="52" width="16" height="6" rx="2" fill="#0B1220" opacity="0.55" />
      <circle cx="100" cy="62" r="4" fill="#0B1220" opacity="0.55" />
    </svg>
  );
};

export const Evidence: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const items = (props.items as { title: string; detail: string; tag?: string; icon?: string }[]) ?? [];
  const line = useProgress(10, 40);

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Kicker p={p} delay={2}>{String(props.kicker ?? "What was left behind")}</Kicker>
        <div style={{ height: 14 }} />
        <RichWords
          text={String(props.title ?? "")}
          p={p}
          size={58}
          family={FONTS.display}
          weight={400}
          lineHeight={1.05}
          delay={4}
          stagger={2.4}
        />
        <div style={{ height: 44 }} />
        <div style={{ position: "relative", display: "flex", gap: 26 }}>
          <div style={{ position: "absolute", left: 40, right: 40, top: 84, height: 2, background: p.line }} />
          <div style={{ position: "absolute", left: 40, top: 83, height: 2, width: `calc((100% - 80px) * ${line})`, background: p.accent, opacity: 0.8 }} />
          {items.map((item, i) => {
            const e = useEnter(14 + i * 10, { stiffness: 100, damping: 18 });
            return (
              <Panel
                key={i}
                p={p}
                style={{
                  flex: 1,
                  padding: "26px 28px 24px",
                  opacity: e,
                  transform: `translateY(${(1 - e) * 26}px)`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.16em", color: p.soft }}>{String(i + 1).padStart(2, "0")}</span>
                  {item.tag ? (
                    <span style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.08em", color: p.accent, border: `1px solid ${p.line}`, borderRadius: 999, padding: "4px 9px" }}>
                      {item.tag}
                    </span>
                  ) : null}
                </div>
                <div style={{ height: 136, display: "flex", alignItems: "center" }}>
                  <EvidenceIcon kind={String(item.icon ?? "tie")} color={p.accent} />
                </div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 29, fontWeight: 620, letterSpacing: "-0.015em" }}>{item.title}</div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 19, lineHeight: 1.45, color: p.soft, marginTop: 8 }}>{item.detail}</div>
              </Panel>
            );
          })}
        </div>
        {props.footnote ? (
          <div style={{ marginTop: 26, fontFamily: FONTS.mono, fontSize: 15, letterSpacing: "0.05em", color: p.faint }}>
            {String(props.footnote)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
