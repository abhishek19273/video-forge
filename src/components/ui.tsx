import React from "react";
import { useCurrentFrame } from "remotion";
import { FONTS, Palette } from "../theme";
import { fadeUp, useEnter, useProgress } from "../lib/anim";
import { parseRich, RichToken } from "../lib/text";

export const Kicker: React.FC<{
  children: React.ReactNode;
  p: Palette;
  delay?: number;
  color?: string;
}> = ({ children, p, delay = 0, color }) => {
  const e = useEnter(delay, { stiffness: 90, damping: 18 });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: e,
        transform: `translateY(${(1 - e) * 12}px)`,
        color: color ?? p.accent,
        fontFamily: FONTS.sans,
        fontWeight: 650,
        fontSize: 22,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 46 * e,
          height: 2,
          background: color ?? p.accent,
          opacity: 0.9,
        }}
      />
      <span>{children}</span>
    </div>
  );
};

const Word: React.FC<{
  token: RichToken;
  p: Palette;
  delay: number;
  stagger: number;
  strongColor?: string;
}> = ({ token, p, delay, stagger, strongColor }) => {
  const e = useEnter(delay, { stiffness: 160, damping: 22, mass: 0.55 });
  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        marginRight: "0.26em",
        opacity: e,
        transform: `translateY(${(1 - e) * 34}px)`,
        filter: e < 0.98 ? `blur(${(1 - e) * 6}px)` : undefined,
        color: token.strong ? strongColor ?? p.accent : token.em ? p.accent : undefined,
        fontFamily: token.code ? FONTS.mono : token.em ? FONTS.display : undefined,
        fontStyle: token.em ? "italic" : undefined,
        fontSize: token.code ? "0.78em" : undefined,
        fontWeight: token.code ? 500 : undefined,
      }}
    >
      {token.text.trimEnd()}
      {token.strong && (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "0.02em",
            height: "0.075em",
            background: strongColor ?? p.accent,
            transform: `scaleX(${e})`,
            transformOrigin: "left center",
            borderRadius: 4,
          }}
        />
      )}
    </span>
  );
};

export const RichWords: React.FC<{
  text: string;
  p: Palette;
  delay?: number;
  stagger?: number;
  size?: number;
  lineHeight?: number;
  weight?: number;
  family?: string;
  align?: "left" | "center";
  maxWidth?: number;
  strongColor?: string;
  letterSpacing?: string;
}> = ({
  text,
  p,
  delay = 0,
  stagger = 3,
  size = 76,
  lineHeight = 1.12,
  weight = 500,
  family = FONTS.sans,
  align = "left",
  maxWidth,
  strongColor,
  letterSpacing = "-0.02em",
}) => {
  const paragraphs = parseRich(text);
  let idx = 0;
  return (
    <div
      style={{
        fontFamily: family,
        fontSize: size,
        lineHeight,
        fontWeight: weight,
        letterSpacing,
        color: p.ink,
        textAlign: align,
        maxWidth,
        marginLeft: align === "center" ? "auto" : undefined,
        marginRight: align === "center" ? "auto" : undefined,
      }}
    >
      {paragraphs.map((tokens, pi) => (
        <div key={pi} style={{ marginBottom: pi < paragraphs.length - 1 ? "0.42em" : 0 }}>
          {tokens.map((t, ti) => {
            const d = delay + idx * stagger;
            idx += 1;
            return (
              <Word
                key={`${pi}-${ti}`}
                token={t}
                p={p}
                delay={d}
                stagger={stagger}
                strongColor={strongColor}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Rule: React.FC<{ p: Palette; delay?: number; width?: number }> = ({
  p,
  delay = 0,
  width = 120,
}) => {
  const e = useProgress(delay, 26);
  return (
    <div
      style={{
        width: width * e,
        height: 2,
        background: p.accent,
        opacity: 0.85,
        borderRadius: 2,
      }}
    />
  );
};

/** A soft card surface used by most data/content scenes. */
export const Panel: React.FC<{
  children: React.ReactNode;
  p: Palette;
  style?: React.CSSProperties;
}> = ({ children, p, style }) => (
  <div
    style={{
      background: p.card,
      border: `1px solid ${p.cardLine}`,
      borderRadius: 26,
      boxShadow:
        p.mode === "dark"
          ? "0 28px 70px rgba(0,0,0,0.36)"
          : "0 24px 60px rgba(60,40,20,0.10)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Fade: React.FC<{
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, distance = 26, style }) => {
  const e = useEnter(delay, { stiffness: 110, damping: 20 });
  return <div style={{ ...fadeUp(e, distance), ...style }}>{children}</div>;
};

export const Counter: React.FC<{
  value: number;
  delay?: number;
  duration?: number;
  decimals?: number;
  group?: boolean;
}> = ({ value, delay = 0, duration = 34, decimals = 0, group = false }) => {
  const frame = useCurrentFrame();
  const e = useProgress(delay, duration, (t) => 1 - Math.pow(1 - t, 3));
  const v = value * e;
  if (group) {
    return (
      <>
        {v.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
      </>
    );
  }
  return <>{v.toFixed(decimals)}</>;
};
