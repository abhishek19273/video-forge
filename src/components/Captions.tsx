import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONTS, Palette } from "../theme";
import { Caption } from "../types";

export const Captions: React.FC<{ items: Caption[]; p: Palette }> = ({ items, p }) => {
  const frame = useCurrentFrame();
  if (!items || items.length === 0) return null;

  const active = items.find((c) => frame >= c.from && frame < c.to);
  if (!active) return null;

  const local = frame - active.from;
  const inP = Math.min(1, Math.max(0, local / 6));
  const outP = Math.min(1, Math.max(0, (active.to - frame) / 5));
  const alpha = Math.min(inP, outP);
  const y = (1 - inP) * 12;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: 46,
          maxWidth: 1380,
          display: "flex",
          alignItems: "stretch",
          gap: 18,
          padding: "18px 30px 19px 24px",
          borderRadius: 16,
          background: "rgba(8,11,17,0.80)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
          backdropFilter: "blur(10px)",
          opacity: alpha,
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            width: 4,
            borderRadius: 3,
            background: p.accent,
            opacity: 0.95,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            color: "#FFF8ED",
            fontFamily: FONTS.sans,
            fontSize: 33,
            lineHeight: 1.34,
            fontWeight: 480,
            letterSpacing: "-0.005em",
          }}
        >
          {active.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
