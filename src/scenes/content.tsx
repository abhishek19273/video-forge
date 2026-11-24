import React from "react";
import { FONTS, Palette } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { Kicker, RichWords, Rule } from "../components/ui";
import { useEnter, useProgress } from "../lib/anim";
import { SceneProps, paletteFor } from "./common";

const revealPlan = (duration: number, count: number, start = 20) => {
  const usable = Math.max(40, duration * 0.58);
  const step = Math.max(8, usable / Math.max(1, count));
  return { start, step };
};

const BulletRow: React.FC<{
  item: { title: string; detail?: string };
  i: number;
  p: Palette;
  at: number;
}> = ({ item, i, p, at }) => {
  const e = useProgress(at, 22);
  return (
    <div
      style={{
        display: "flex",
        gap: 26,
        padding: "27px 0",
        borderTop: `1px solid ${p.line}`,
        opacity: e,
        transform: `translateX(${(1 - e) * 26}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 19,
          color: p.accent,
          paddingTop: 7,
          minWidth: 38,
          letterSpacing: "0.06em",
        }}
      >
        {String(i + 1).padStart(2, "0")}
      </div>
      <div>
        <div style={{ fontFamily: FONTS.sans, fontSize: 36, fontWeight: 600, letterSpacing: "-0.015em" }}>
          {item.title}
        </div>
        {item.detail ? (
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 25,
              lineHeight: 1.45,
              color: p.soft,
              marginTop: 8,
              maxWidth: 840,
            }}
          >
            {item.detail}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const Bullets: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const items = (props.items as { title: string; detail?: string }[]) ?? [];
  const { start, step } = revealPlan(scene.durationInFrames, items.length, 26);

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", gap: 92, flex: 1, alignItems: "center" }}>
        <div style={{ width: 560, flexShrink: 0 }}>
          <Kicker p={p} delay={2}>{String(props.kicker ?? "")}</Kicker>
          <div style={{ height: 22 }} />
          <RichWords
            text={String(props.title ?? "")}
            p={p}
            size={64}
            family={FONTS.display}
            weight={400}
            lineHeight={1.04}
            letterSpacing="-0.02em"
            delay={6}
            stagger={3}
          />
          <div style={{ marginTop: 30 }}>
            <Rule p={p} delay={18} width={96} />
          </div>
          {props.note ? (
            <div
              style={{
                marginTop: 26,
                fontFamily: FONTS.sans,
                fontSize: 22,
                color: p.soft,
                lineHeight: 1.5,
                maxWidth: 450,
              }}
            >
              {String(props.note)}
            </div>
          ) : null}
        </div>
        <div style={{ flex: 1, maxWidth: 1000 }}>
          {items.map((item, i) => (
            <BulletRow key={i} item={item} i={i} p={p} at={start + i * step} />
          ))}
          <div style={{ borderTop: `1px solid ${p.line}` }} />
        </div>
      </div>
    </SceneShell>
  );
};

const StepRow: React.FC<{
  step: { title: string; detail?: string };
  i: number;
  total: number;
  p: Palette;
  at: number;
}> = ({ step, i, total, p, at }) => {
  const e = useProgress(at, 24);
  const active = e > 0.35;
  return (
    <div style={{ display: "flex", gap: 34, opacity: e, transform: `translateY(${(1 - e) * 18}px)` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 64, flexShrink: 0 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 58,
            border: `1.5px solid ${active ? p.accent : p.line}`,
            background: active ? p.accent : "transparent",
            color: active ? p.accentInk : p.soft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.mono,
            fontSize: 21,
            fontWeight: 600,
          }}
        >
          {i + 1}
        </div>
        {i < total - 1 && (
          <div style={{ width: 1.5, flex: 1, background: p.line, marginTop: 8, minHeight: 46 }} />
        )}
      </div>
      <div style={{ paddingBottom: i < total - 1 ? 34 : 0, paddingTop: 2 }}>
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 35,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: active ? p.ink : p.soft,
          }}
        >
          {step.title}
        </div>
        {step.detail ? (
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 24,
              lineHeight: 1.45,
              color: p.soft,
              marginTop: 7,
              maxWidth: 900,
            }}
          >
            {step.detail}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const Steps: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const steps = (props.steps as { title: string; detail?: string }[]) ?? [];
  const { start, step } = revealPlan(scene.durationInFrames, steps.length, 24);

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Kicker p={p} delay={2}>{String(props.kicker ?? "")}</Kicker>
        <div style={{ height: 18 }} />
        <RichWords
          text={String(props.title ?? "")}
          p={p}
          size={62}
          family={FONTS.display}
          weight={400}
          lineHeight={1.05}
          delay={5}
          stagger={2.6}
        />
        <div style={{ height: 52 }} />
        {steps.map((s, i) => (
          <StepRow key={i} step={s} i={i} total={steps.length} p={p} at={start + i * step} />
        ))}
      </div>
    </SceneShell>
  );
};

const CompareSide: React.FC<{
  data: any;
  e: number;
  p: Palette;
  color: string;
  align: "left" | "right";
}> = ({ data, e, p, color, align }) => (
  <div
    style={{
      flex: 1,
      background: p.card,
      border: `1px solid ${p.cardLine}`,
      borderTop: `3px solid ${color}`,
      borderRadius: 22,
      padding: "40px 42px",
      opacity: e,
      transform: `translateY(${(1 - e) * 30}px)`,
      boxShadow: p.mode === "dark" ? "0 26px 60px rgba(0,0,0,0.32)" : "0 22px 54px rgba(60,40,20,0.08)",
    }}
  >
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 18,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
      }}
    >
      {data.label ?? ""}
    </div>
    <div
      style={{
        fontFamily: FONTS.sans,
        fontSize: 44,
        fontWeight: 640,
        letterSpacing: "-0.02em",
        marginTop: 14,
        lineHeight: 1.08,
      }}
    >
      {data.title ?? ""}
    </div>
    {data.subtitle ? (
      <div style={{ fontFamily: FONTS.sans, fontSize: 23, color: p.soft, marginTop: 10, lineHeight: 1.4 }}>
        {data.subtitle}
      </div>
    ) : null}
    <div style={{ height: 26 }} />
    {(data.points ?? []).map((pt: string, i: number) => (
      <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
        <span style={{ color, fontFamily: FONTS.mono, fontSize: 20, lineHeight: "30px" }}>
          {align === "left" ? "→" : "←"}
        </span>
        <span style={{ fontFamily: FONTS.sans, fontSize: 24, lineHeight: 1.38, color: p.ink, opacity: 0.9 }}>
          {pt}
        </span>
      </div>
    ))}
  </div>
);

export const Compare: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const left = (props.left as any) ?? {};
  const right = (props.right as any) ?? {};
  const l = useEnter(14, { stiffness: 90, damping: 19 });
  const r = useEnter(26, { stiffness: 90, damping: 19 });
  const vs = useEnter(40, { stiffness: 140, damping: 16 });
  const verdict = useEnter(50, { stiffness: 80, damping: 20 });

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 26, marginBottom: 34 }}>
          <Kicker p={p} delay={2}>{String(props.kicker ?? "")}</Kicker>
          <div style={{ fontFamily: FONTS.display, fontSize: 54, letterSpacing: "-0.02em" }}>
            {String(props.title ?? "")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 30, alignItems: "stretch", position: "relative" }}>
          <CompareSide data={left} e={l} p={p} color={p.accent} align="left" />
          <CompareSide data={right} e={r} p={p} color={p.accent2} align="right" />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%,-50%) scale(${0.7 + vs * 0.3})`,
              width: 74,
              height: 74,
              borderRadius: 74,
              background: p.bg,
              border: `1px solid ${p.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONTS.mono,
              fontSize: 19,
              letterSpacing: "0.08em",
              color: p.soft,
              opacity: vs,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            }}
          >
            VS
          </div>
        </div>
        {props.verdict ? (
          <div
            style={{
              marginTop: 34,
              alignSelf: "center",
              fontFamily: FONTS.sans,
              fontSize: 24,
              color: p.soft,
              opacity: verdict,
              textAlign: "center",
            }}
          >
            {String(props.verdict)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};

const RecapItem: React.FC<{ text: string; at: number; p: Palette }> = ({ text, at, p }) => {
  const e = useProgress(at, 20);
  return (
  <div
    style={{
      display: "flex",
      gap: 18,
      alignItems: "flex-start",
      opacity: e,
      transform: `translateY(${(1 - e) * 14}px)`,
    }}
  >
    <svg width={38} height={38} viewBox="0 0 40 40" style={{ flexShrink: 0, marginTop: 3 }}>
      <circle cx="20" cy="20" r="18" fill="none" stroke={p.accent} strokeWidth="1.6" opacity={0.55} />
      <path
        d="M12 20.5 L18 26.5 L28 14.5"
        fill="none"
        stroke={p.accent}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - e}
      />
    </svg>
    <div style={{ fontFamily: FONTS.sans, fontSize: 28, lineHeight: 1.38, color: p.ink, opacity: 0.92 }}>
      {text}
    </div>
  </div>
  );
};

export const Recap: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const items = (props.items as string[]) ?? [];
  const { start, step } = revealPlan(scene.durationInFrames, items.length, 24);
  const ctaDelay = Math.min(
    Math.max(24, scene.durationInFrames - 70),
    start + Math.max(0, items.length - 1) * step + 16,
  );
  const cta = useEnter(ctaDelay, { stiffness: 90, damping: 18 });

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Kicker p={p} delay={2}>{String(props.kicker ?? "Recap")}</Kicker>
        <div style={{ height: 18 }} />
        <RichWords
          text={String(props.title ?? "What we learned")}
          p={p}
          size={72}
          family={FONTS.display}
          weight={400}
          lineHeight={1.05}
          delay={5}
          stagger={2.8}
        />
        <div style={{ height: 44 }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: items.length > 3 ? "1fr 1fr" : "1fr",
            columnGap: 66,
            rowGap: 26,
          }}
        >
          {items.map((item, i) => (
            <RecapItem key={i} text={item} at={start + i * step} p={p} />
          ))}
        </div>
        {props.cta ? (
          <div
            style={{
              marginTop: 48,
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 14,
              background: p.accent,
              color: p.accentInk,
              borderRadius: 999,
              padding: "16px 30px",
              fontFamily: FONTS.sans,
              fontWeight: 650,
              fontSize: 23,
              opacity: cta,
              transform: `translateY(${(1 - cta) * 16}px)`,
            }}
          >
            {String(props.cta)}
            <span style={{ fontFamily: FONTS.mono, fontSize: 18 }}>→</span>
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
