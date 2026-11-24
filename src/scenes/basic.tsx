import React from "react";
import { AbsoluteFill } from "remotion";
import { FONTS } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { Kicker, RichWords, Rule } from "../components/ui";
import { useEnter, useProgress } from "../lib/anim";
import { SceneProps, paletteFor } from "./common";

export const Title: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const meta = useEnter(44, { stiffness: 80, damping: 20 });
  const line = useProgress(36, 34);
  const title = String(props.title ?? "");
  const kicker = String(props.kicker ?? "");
  const subtitle = String(props.subtitle ?? "");

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions} chrome={false}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4,8,16,0.18) 0%, rgba(4,8,16,0.0) 38%, rgba(4,8,16,0.55) 82%, rgba(4,8,16,0.82) 100%)",
        }}
      />
      <div style={{ marginTop: "auto", position: "relative" }}>
        {kicker ? <Kicker p={p} delay={6} color="#FFD9A0">{kicker}</Kicker> : null}
        <div style={{ height: 26 }} />
        <div style={{ maxWidth: 1450 }}>
          <RichWords
            text={title}
            p={{ ...p, ink: "#FFF9EF", accent: "#FFC97A" }}
            size={132}
            family={FONTS.display}
            weight={400}
            lineHeight={0.98}
            letterSpacing="-0.028em"
            stagger={4}
            delay={14}
            strongColor="#FFC97A"
          />
        </div>
        <div
          style={{
            width: 180 * line,
            height: 3,
            background: "#FFC97A",
            marginTop: 34,
            marginBottom: 26,
            borderRadius: 3,
            opacity: 0.9,
          }}
        />
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 34,
            fontWeight: 420,
            color: "rgba(255,247,235,0.82)",
            maxWidth: 1000,
            lineHeight: 1.4,
            opacity: meta,
            transform: `translateY(${(1 - meta) * 18}px)`,
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 26,
          alignItems: "center",
          marginTop: 44,
          marginBottom: 92,
          opacity: meta,
          color: "rgba(255,247,235,0.7)",
          fontFamily: FONTS.mono,
          fontSize: 19,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span>{brand.name}</span>
        <span style={{ width: 4, height: 4, borderRadius: 4, background: "rgba(255,247,235,0.5)" }} />
        <span>{String(props.season ?? "Episode")}</span>
        {props.runtime ? (
          <>
            <span style={{ width: 4, height: 4, borderRadius: 4, background: "rgba(255,247,235,0.5)" }} />
            <span>{String(props.runtime)}</span>
          </>
        ) : null}
      </div>
    </SceneShell>
  );
};

export const Chapter: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const e = useEnter(4, { stiffness: 90, damping: 18 });
  const num = useProgress(8, 40);
  const rule = useProgress(26, 30);

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", alignItems: "center", gap: 84, flex: 1 }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 330,
            lineHeight: 0.8,
            color: "transparent",
            WebkitTextStroke: `2px ${p.accent}`,
            opacity: 0.55 + num * 0.45,
            transform: `translateX(${(1 - num) * -40}px)`,
            minWidth: 330,
            letterSpacing: "-0.04em",
          }}
        >
          {String(props.number ?? "01")}
        </div>
        <div style={{ maxWidth: 1080 }}>
          <Kicker p={p} delay={6}>{String(props.kicker ?? "Chapter")}</Kicker>
          <div style={{ height: 22 }} />
          <RichWords
            text={String(props.title ?? "")}
            p={p}
            size={92}
            family={FONTS.display}
            weight={400}
            lineHeight={1.02}
            letterSpacing="-0.02em"
            delay={12}
            stagger={3}
          />
          <div style={{ width: 120 * rule, height: 2, background: p.accent, margin: "30px 0 22px" }} />
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 32,
              lineHeight: 1.45,
              color: p.soft,
              maxWidth: 820,
              opacity: e,
            }}
          >
            {String(props.subtitle ?? "")}
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

export const Statement: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const align = props.align === "left" ? "left" : "center";
  const foot = useEnter(60, { stiffness: 70, damping: 20 });

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {props.kicker ? (
          <div style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start", marginBottom: 30 }}>
            <Kicker p={p} delay={2}>{String(props.kicker)}</Kicker>
          </div>
        ) : null}
        <RichWords
          text={String(props.text ?? "")}
          p={p}
          size={Number(props.size ?? 82)}
          lineHeight={1.14}
          weight={480}
          align={align}
          maxWidth={1480}
          delay={6}
          stagger={2.6}
          letterSpacing="-0.028em"
          strongColor={p.accent}
        />
        {props.footnote ? (
          <div
            style={{
              marginTop: 42,
              fontFamily: FONTS.mono,
              fontSize: 20,
              letterSpacing: "0.06em",
              color: p.soft,
              textTransform: "uppercase",
              textAlign: align,
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

export const Quote: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const mark = useProgress(2, 34);
  const author = useEnter(52, { stiffness: 70, damping: 20 });

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 200,
            lineHeight: 0.5,
            color: p.accent,
            opacity: mark * 0.85,
            height: 74,
            transform: `translateY(${(1 - mark) * 18}px)`,
          }}
        >
          &ldquo;
        </div>
        <RichWords
          text={String(props.text ?? "")}
          p={p}
          size={Number(props.size ?? 66)}
          family={FONTS.display}
          weight={400}
          lineHeight={1.16}
          letterSpacing="-0.015em"
          delay={10}
          stagger={2.4}
          maxWidth={1460}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 46, opacity: author }}>
          <div style={{ width: 44, height: 2, background: p.accent }} />
          <div>
            <div style={{ fontFamily: FONTS.sans, fontWeight: 650, fontSize: 26 }}>
              {String(props.author ?? "")}
            </div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 21, color: p.soft, marginTop: 4 }}>
              {String(props.role ?? "")}
            </div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
};

export const Outro: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const cta = useEnter(34, { stiffness: 110, damping: 18 });
  const next = useEnter(46, { stiffness: 90, damping: 20 });

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions} chrome={false}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4,8,16,0.30) 0%, rgba(4,8,16,0.05) 40%, rgba(4,8,16,0.75) 100%)",
        }}
      />
      <div style={{ marginTop: "auto", position: "relative" }}>
        <Kicker p={p} delay={4} color="#FFD9A0">{String(props.kicker ?? "One last thing")}</Kicker>
        <div style={{ height: 24 }} />
        <RichWords
          text={String(props.title ?? "Thanks for watching")}
          p={{ ...p, ink: "#FFF9EF", accent: "#FFC97A" }}
          size={118}
          family={FONTS.display}
          weight={400}
          lineHeight={1.0}
          letterSpacing="-0.025em"
          delay={8}
          stagger={3.4}
        />
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 32,
            color: "rgba(255,247,235,0.82)",
            marginTop: 26,
            maxWidth: 1080,
            lineHeight: 1.4,
            opacity: cta,
          }}
        >
          {String(props.subtitle ?? "")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 44, opacity: cta }}>
          {Array.isArray(props.pills) &&
            (props.pills as string[]).map((pill, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid rgba(255,247,235,0.28)",
                  background: i === 0 ? "#FFC97A" : "rgba(255,247,235,0.06)",
                  color: i === 0 ? "#241304" : "rgba(255,247,235,0.92)",
                  borderRadius: 999,
                  padding: "14px 26px",
                  fontFamily: FONTS.sans,
                  fontWeight: 650,
                  fontSize: 21,
                }}
              >
                {pill}
              </div>
            ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginTop: 40,
          marginBottom: 64,
          opacity: next,
          color: "rgba(255,247,235,0.72)",
          fontFamily: FONTS.mono,
          fontSize: 18,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span>{brand.name}</span>
        <span style={{ opacity: 0.5 }}>{brand.handle ?? ""}</span>
        {props.next ? (
          <span style={{ marginLeft: "auto", opacity: 0.75 }}>Next · {String(props.next)}</span>
        ) : null}
      </div>
    </SceneShell>
  );
};
