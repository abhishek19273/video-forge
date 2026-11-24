import React from "react";
import { useCurrentFrame } from "remotion";
import { FONTS, Palette } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { Counter, Kicker, RichWords } from "../components/ui";
import { clamp, easeOut, rand, useEnter, useProgress } from "../lib/anim";
import { SceneProps, paletteFor } from "./common";

/* ---------------------------------- stat --------------------------------- */

const StatBar: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
  p: Palette;
  at: number;
  decimals: number;
}> = ({ label, value, max, color, p, at, decimals }) => {
  const e = useProgress(at, 32, (t) => 1 - Math.pow(1 - t, 3));
  const h = Math.max(10, (value / Math.max(0.0001, max)) * 340 * e);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        style={{
          fontFamily: FONTS.grotesk,
          fontSize: 30,
          fontWeight: 600,
          color: p.ink,
          opacity: e,
        }}
      >
        <Counter value={value} delay={at} duration={30} decimals={decimals} />
      </div>
      <div
        style={{
          width: 96,
          height: h,
          borderRadius: 12,
          background: color,
          boxShadow: p.mode === "dark" ? "0 12px 30px rgba(0,0,0,0.28)" : "0 12px 30px rgba(0,0,0,0.12)",
        }}
      />
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 18,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: p.soft,
          opacity: e,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Stat: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const value = Number(props.value ?? 0);
  const decimals = Number(props.decimals ?? 0);
  const label = useEnter(26, { stiffness: 90, damping: 20 });
  const detail = useEnter(36, { stiffness: 80, damping: 20 });
  const bar = useProgress(16, 46);
  const suffix = String(props.suffix ?? "");
  const prefix = String(props.prefix ?? "");
  const bars = (props.bars as { label: string; value: number; color?: string }[]) ?? [];
  const maxBar = Math.max(0.0001, ...bars.map((b) => Number(b.value)));
  const bigSize = Math.abs(value) >= 1000 ? 230 : 300;

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Kicker p={p} delay={2}>{String(props.kicker ?? "")}</Kicker>
        <div style={{ height: 18 }} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontFamily: FONTS.grotesk,
                fontWeight: 600,
                letterSpacing: "-0.05em",
                lineHeight: 0.9,
                color: p.ink,
              }}
            >
              {prefix ? <span style={{ fontSize: 100, color: p.accent, marginRight: 6 }}>{prefix}</span> : null}
              <span style={{ fontSize: bigSize, fontVariantNumeric: "tabular-nums" }}>
                <Counter value={value} delay={8} duration={42} decimals={decimals} group={Boolean(props.group)} />
              </span>
              {suffix ? <span style={{ fontSize: 110, color: p.accent, marginLeft: 8 }}>{suffix}</span> : null}
            </div>
            <div style={{ width: 640 * bar, height: 6, background: p.accent, borderRadius: 6, marginTop: 10 }} />
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 44,
                fontWeight: 560,
                letterSpacing: "-0.02em",
                marginTop: 32,
                opacity: label,
                transform: `translateY(${(1 - label) * 16}px)`,
                maxWidth: 1000,
              }}
            >
              {String(props.label ?? "")}
            </div>
            {props.detail ? (
              <div
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 26,
                  lineHeight: 1.45,
                  color: p.soft,
                  marginTop: 14,
                  maxWidth: 880,
                  opacity: detail,
                }}
              >
                {String(props.detail)}
              </div>
            ) : null}
          </div>

          {bars.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 34, paddingBottom: 6 }}>
              {bars.map((b, i) => (
                <StatBar
                  key={i}
                  label={b.label}
                  value={Number(b.value)}
                  max={maxBar}
                  color={b.color ?? (i === bars.length - 1 ? p.accent : "rgba(255,247,235,0.34)")}
                  p={p}
                  at={22 + i * 8}
                  decimals={Number(b.value) % 1 === 0 ? 0 : 1}
                />
              ))}
            </div>
          ) : null}
        </div>

        {props.source ? (
          <div
            style={{
              position: "absolute",
              bottom: 150,
              right: 120,
              fontFamily: FONTS.mono,
              fontSize: 17,
              color: p.faint,
              letterSpacing: "0.04em",
              maxWidth: 460,
              textAlign: "right",
              opacity: detail,
            }}
          >
            {String(props.source)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};

/* --------------------------------- charts -------------------------------- */

type Point = { x: number; y: number };

const smoothPath = (pts: Point[]): string => {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

const ChartBar: React.FC<{
  i: number;
  x: number;
  w: number;
  h: number;
  color: string;
  label: string;
  value: number;
  unit: string;
  p: ReturnType<typeof paletteFor>;
  baseY: number;
  delay: number;
}> = ({ i, x, w, h, color, label, value, unit, p, baseY, delay }) => {
  const e = useProgress(delay, 28, (t) => 1 - Math.pow(1 - t, 4));
  const height = Math.max(2, h * e);
  return (
    <g>
      <rect
        x={x}
        y={baseY - height}
        width={w}
        height={height}
        rx={8}
        fill={color}
        opacity={0.95}
      />
      <text
        x={x + w / 2}
        y={baseY - height - 22}
        textAnchor="middle"
        fill={p.ink}
        fontFamily={FONTS.grotesk}
        fontSize={34}
        fontWeight={600}
        opacity={clamp(e * 1.4)}
      >
        {value}
        {unit}
      </text>
      <text
        x={x + w / 2}
        y={baseY + 44}
        textAnchor="middle"
        fill={p.soft}
        fontFamily={FONTS.sans}
        fontSize={25}
        fontWeight={500}
        opacity={clamp(e * 1.2)}
      >
        {label}
      </text>
    </g>
  );
};

const ChartPoint: React.FC<{
  pt: Point;
  i: number;
  color: string;
  p: ReturnType<typeof paletteFor>;
  delay: number;
  value: number;
  label: string;
  unit: string;
}> = ({ pt, i, color, p, delay, value, label, unit }) => {
  const e = useProgress(delay, 20);
  return (
    <g opacity={e}>
      <circle cx={pt.x} cy={pt.y} r={11} fill={p.bg} stroke={color} strokeWidth={4} />
      <circle cx={pt.x} cy={pt.y} r={5} fill={color} />
      <text
        x={pt.x}
        y={pt.y - 30}
        textAnchor="middle"
        fill={p.ink}
        fontFamily={FONTS.grotesk}
        fontSize={30}
        fontWeight={600}
      >
        {value}
        {unit}
      </text>
      <text
        x={pt.x}
        y={520}
        textAnchor="middle"
        fill={p.soft}
        fontFamily={FONTS.sans}
        fontSize={24}
        fontWeight={500}
      >
        {label}
      </text>
    </g>
  );
};

export const Chart: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const data = (props.data as { label: string; value: number }[]) ?? [];
  const W = 1500;
  const baseY = 470;
  const topY = 40;
  const values = data.map((d) => Number(d.value));
  const max = Number(props.max ?? Math.max(1, ...values)) * 1.18;
  const variant = props.variant === "line" ? "line" : "bar";
  const highlight = Number(props.highlightIndex ?? -1);
  const unit = String(props.unit ?? "");
  const note = useEnter(46, { stiffness: 70, damping: 20 });
  const frame = useCurrentFrame();

  const slot = W / Math.max(1, data.length);
  const points: Point[] = data.map((d, i) => ({
    x: slot * (i + 0.5),
    y: baseY - (Number(d.value) / max) * (baseY - topY),
  }));

  const barW = Math.min(132, slot * 0.46);
  const lineColor = p.accent;
  const draw = useProgress(14, 52, easeOut);
  const path = smoothPath(points);

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <Kicker p={p} delay={2}>{String(props.kicker ?? "")}</Kicker>
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
          </div>
          {props.note ? (
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 17,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: p.faint,
                maxWidth: 380,
                textAlign: "right",
                paddingBottom: 6,
              }}
            >
              {String(props.note)}
            </div>
          ) : null}
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <svg viewBox={`0 0 ${W} 560`} style={{ width: "100%", overflow: "visible" }}>
            {[0.25, 0.5, 0.75, 1].map((g, i) => (
              <line
                key={i}
                x1={0}
                x2={W}
                y1={baseY - (baseY - topY) * g}
                y2={baseY - (baseY - topY) * g}
                stroke={p.line}
                strokeWidth={1}
              />
            ))}
            <line x1={0} x2={W} y1={baseY} y2={baseY} stroke={p.line} strokeWidth={2} />

            {variant === "bar"
              ? data.map((d, i) => {
                  const h = (Number(d.value) / max) * (baseY - topY);
                  const active = i === highlight;
                  return (
                    <ChartBar
                      key={i}
                      i={i}
                      x={slot * i + (slot - barW) / 2}
                      w={barW}
                      h={h}
                      color={active ? p.accent : p.accent2}
                      label={d.label}
                      value={Number(d.value)}
                      unit={unit}
                      p={p}
                      baseY={baseY}
                      delay={10 + i * 7}
                    />
                  );
                })
              : null}

            {variant === "line" ? (
              <g>
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path
                  d={`${path} L ${points[points.length - 1]?.x ?? 0} ${baseY} L ${points[0]?.x ?? 0} ${baseY} Z`}
                  fill="url(#area)"
                  opacity={draw}
                />
                <path
                  d={path}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={5}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - draw}
                />
                {points.map((pt, i) => (
                  <ChartPoint
                    key={i}
                    pt={pt}
                    i={i}
                    color={i === highlight ? p.accent : p.accent2}
                    p={p}
                    delay={24 + i * 6}
                    value={Number(data[i].value)}
                    label={data[i].label}
                    unit={unit}
                  />
                ))}
              </g>
            ) : null}
          </svg>
        </div>
        {props.footnote ? (
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 21,
              color: p.soft,
              opacity: note,
              marginTop: 2,
            }}
          >
            {String(props.footnote)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};

/* -------------------------------- diagram -------------------------------- */

type NodeDef = { id: string; label: string; sublabel?: string; kind?: string };
type EdgeDef = { from: string; to: string; label?: string };

const layoutNodes = (nodes: NodeDef[], layout: string) => {
  const pos: Record<string, Point> = {};
  const n = nodes.length;
  if (layout === "cycle") {
    nodes.forEach((node, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      pos[node.id] = { x: 840 + Math.cos(a) * 300, y: 330 + Math.sin(a) * 225 };
    });
  } else if (layout === "stack") {
    nodes.forEach((node, i) => {
      pos[node.id] = { x: 840, y: 110 + i * 190 };
    });
  } else {
    const left = 250;
    const right = 1430;
    nodes.forEach((node, i) => {
      pos[node.id] = { x: left + (n === 1 ? (right - left) / 2 : ((right - left) * i) / (n - 1)), y: 330 };
    });
  }
  return pos;
};

const DiagramNode: React.FC<{
  node: NodeDef;
  pt: Point;
  i: number;
  p: ReturnType<typeof paletteFor>;
  delay: number;
}> = ({ node, pt, i, p, delay }) => {
  const e = useEnter(delay, { stiffness: 120, damping: 18 });
  return (
    <div
      style={{
        position: "absolute",
        left: pt.x - 145,
        top: pt.y - 66,
        width: 290,
        height: 132,
        borderRadius: 18,
        background: p.card,
        border: `1px solid ${p.cardLine}`,
        borderLeft: `3px solid ${p.accent}`,
        boxShadow: p.mode === "dark" ? "0 18px 40px rgba(0,0,0,0.32)" : "0 16px 36px rgba(60,40,20,0.10)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 24px 0 26px",
        opacity: e,
        transform: `scale(${0.9 + e * 0.1})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 15,
            color: p.accent,
            border: `1px solid ${p.accent}`,
            borderRadius: 5,
            padding: "1px 6px",
            opacity: 0.8,
          }}
        >
          {String(i + 1).padStart(2, "0")}
        </div>
        <div style={{ fontFamily: FONTS.sans, fontSize: 28, fontWeight: 620, letterSpacing: "-0.01em" }}>
          {node.label}
        </div>
      </div>
      {node.sublabel ? (
        <div style={{ fontFamily: FONTS.sans, fontSize: 19, color: p.soft, marginTop: 7, lineHeight: 1.3 }}>
          {node.sublabel}
        </div>
      ) : null}
    </div>
  );
};

const DiagramEdge: React.FC<{
  a: Point;
  b: Point;
  label?: string;
  at: number;
  p: ReturnType<typeof paletteFor>;
}> = ({ a, b, label, at, p }) => {
  const e = useProgress(at, 24);
  const clip = (from: Point, to: Point) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const tx = dx === 0 ? Infinity : 150 / Math.abs(dx);
    const ty = dy === 0 ? Infinity : 72 / Math.abs(dy);
    const t = Math.min(tx, ty);
    return { x: from.x + dx * t, y: from.y + dy * t };
  };
  const start = clip(a, b);
  const end = clip(b, a);
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2 - 46;
  const d = `M ${start.x} ${start.y} Q ${mx} ${my} ${end.x} ${end.y}`;
  return (
    <g opacity={e}>
      <path
        d={d}
        fill="none"
        stroke={p.soft}
        strokeWidth={2}
        strokeDasharray="7 7"
        markerEnd="url(#arrow)"
        opacity={0.65}
        pathLength={1}
        strokeDashoffset={1 - e}
      />
      {label ? (
        <g opacity={clamp((e - 0.4) * 2)}>
          <rect
            x={mx - label.length * 6.4 - 10}
            y={my - 15}
            width={label.length * 12.8 + 20}
            height={30}
            rx={7}
            fill={p.bg}
            opacity={0.9}
          />
          <text
            x={mx}
            y={my + 6}
            textAnchor="middle"
            fill={p.soft}
            fontFamily={FONTS.mono}
            fontSize={17}
            letterSpacing="0.04em"
          >
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
};

export const Diagram: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const nodes = (props.nodes as NodeDef[]) ?? [];
  const edges = (props.edges as EdgeDef[]) ?? [];
  const layout = String(props.layout ?? "row");
  const pos = layoutNodes(nodes, layout);
  const frame = useCurrentFrame();
  const edgeStart = 24;

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <Kicker p={p} delay={2}>{String(props.kicker ?? "")}</Kicker>
        <div style={{ height: 12 }} />
        <RichWords
          text={String(props.title ?? "")}
          p={p}
          size={54}
          family={FONTS.display}
          weight={400}
          lineHeight={1.05}
          delay={4}
          stagger={2.2}
        />
        <div style={{ position: "relative", flex: 1, marginTop: 10 }}>
          <svg
            viewBox="0 0 1680 660"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={p.soft} opacity={0.8} />
              </marker>
            </defs>
            {edges.map((edge, i) => {
              const a = pos[edge.from];
              const b = pos[edge.to];
              if (!a || !b) return null;
              return (
                <DiagramEdge
                  key={i}
                  a={a}
                  b={b}
                  label={edge.label}
                  at={edgeStart + i * 6}
                  p={p}
                />
              );
            })}
          </svg>
          {nodes.map((node, i) => (
            <DiagramNode key={node.id} node={node} pt={pos[node.id]} i={i} p={p} delay={6 + i * 7} />
          ))}
        </div>
        {props.footnote ? (
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 17,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: p.faint,
              paddingBottom: 6,
            }}
          >
            {String(props.footnote)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};

/* -------------------------------- timeline ------------------------------- */

const TimelineEvent: React.FC<{
  ev: { when: string; title: string; detail?: string };
  x: number;
  p: ReturnType<typeof paletteFor>;
  at: number;
}> = ({ ev, x, p, at }) => {
  const e = useProgress(at, 24);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: 26,
          width: 340,
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: e,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 36,
            letterSpacing: "-0.02em",
            color: p.accent,
          }}
        >
          {ev.when}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          top: 170,
          width: 340,
          transform: `translateX(-50%) translateY(${(1 - e) * 10}px)`,
          textAlign: "center",
          opacity: e,
        }}
      >
        <div style={{ fontFamily: FONTS.sans, fontSize: 27, fontWeight: 620, letterSpacing: "-0.01em" }}>
          {ev.title}
        </div>
        {ev.detail ? (
          <div style={{ fontFamily: FONTS.sans, fontSize: 21, color: p.soft, marginTop: 8, lineHeight: 1.42 }}>
            {ev.detail}
          </div>
        ) : null}
      </div>
    </>
  );
};

const TimelineDot: React.FC<{ x: number; at: number; p: ReturnType<typeof paletteFor> }> = ({
  x,
  at,
  p,
}) => {
  const e = useProgress(at, 18);
  return (
    <div
      style={{
        position: "absolute",
        top: 111,
        left: x - 10,
        width: 20,
        height: 20,
        borderRadius: 20,
        background: e > 0.2 ? p.accent : p.bg,
        border: `2px solid ${p.accent}`,
        opacity: e,
        transform: `scale(${e})`,
      }}
    />
  );
};

export const Timeline: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const events = (props.events as { when: string; title: string; detail?: string }[]) ?? [];
  const n = Math.max(1, events.length);
  const W = 1680;
  const line = useProgress(18, 46, easeOut);
  const foot = useProgress(48, 24);
  const pad = 180;

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Kicker p={p} delay={2}>{String(props.kicker ?? "")}</Kicker>
        <div style={{ height: 12 }} />
        <RichWords
          text={String(props.title ?? "")}
          p={p}
          size={54}
          family={FONTS.display}
          weight={400}
          lineHeight={1.05}
          delay={4}
          stagger={2.2}
        />
        <div style={{ position: "relative", height: 300, marginTop: 10 }}>
          <div
            style={{
              position: "absolute",
              top: 120,
              left: pad,
              width: W - pad * 2,
              height: 1,
              background: p.line,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 119.5,
              left: pad,
              width: (W - pad * 2) * line,
              height: 2,
              background: p.accent,
              opacity: 0.85,
            }}
          />
          {events.map((ev, i) => {
            const x = pad + ((W - pad * 2) * i) / Math.max(1, n - 1);
            return (
              <TimelineEvent key={i} ev={ev} x={x} p={p} at={16 + i * 9} />
            );
          })}
          {events.map((_, i) => {
            const x = pad + ((W - pad * 2) * i) / Math.max(1, n - 1);
            return <TimelineDot key={i} x={x} at={16 + i * 9} p={p} />;
          })}
        </div>
        {props.footnote ? (
          <div
            style={{
              marginTop: 8,
              fontFamily: FONTS.mono,
              fontSize: 17,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: p.faint,
              opacity: foot,
            }}
          >
            {String(props.footnote)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
