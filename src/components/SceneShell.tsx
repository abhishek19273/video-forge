import React from "react";
import { AbsoluteFill } from "remotion";
import { FONTS, Palette } from "../theme";
import { Brand, Scene } from "../types";
import { Backdrop } from "./Backdrop";
import { Captions } from "./Captions";
import { getPalette } from "../theme";

export const SceneShell: React.FC<{
  scene: Scene;
  theme: "paper" | "midnight";
  brand: Brand;
  captions: boolean;
  chapter?: string;
  children: React.ReactNode;
  padded?: boolean;
  /** Set false for title/outro where chrome would clutter the frame. */
  chrome?: boolean;
}> = ({ scene, theme, brand, captions, chapter, children, padded = true, chrome }) => {
  const accent = theme === "paper" ? "#C2410C" : "#38BDF8";
  const p: Palette = getPalette(theme, scene.tone ?? "light", accent);
  const showChrome = chrome ?? scene.chrome ?? true;
  const chapterLabel = chapter ?? scene.chapter ?? "";

  return (
    <AbsoluteFill
      style={{
        background: p.bg,
        color: p.ink,
        fontFamily: FONTS.sans,
        overflow: "hidden",
      }}
    >
      <Backdrop p={p} variant={scene.backdrop ?? "plain"} seed={(scene.id?.charCodeAt(1) ?? 3) + 7} />
      <AbsoluteFill
        style={{
          padding: padded ? "88px 120px 168px" : 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </AbsoluteFill>

      {showChrome && (
        <>
          <div
            style={{
              position: "absolute",
              top: 52,
              right: 120,
              fontFamily: FONTS.mono,
              fontSize: 18,
              letterSpacing: "0.14em",
              color: p.soft,
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            {chapterLabel}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 48,
              right: 120,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: FONTS.sans,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: p.soft,
              opacity: 0.6,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 9,
                background: p.accent,
                display: "inline-block",
              }}
            />
            {brand.name}
            {brand.handle ? (
              <span style={{ opacity: 0.65, fontWeight: 450 }}>{brand.handle}</span>
            ) : null}
          </div>
        </>
      )}

      {captions && <Captions items={scene.captions ?? []} p={p} />}
    </AbsoluteFill>
  );
};
