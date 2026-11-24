import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { VideoProps } from "./types";
import { ensureFonts } from "./fonts";

ensureFonts();

const FALLBACK: VideoProps = {
  meta: { title: "Preview", slug: "preview", fps: 30, width: 1920, height: 1080, totalFrames: 180 },
  theme: "paper",
  brand: { name: "Your Channel", handle: "@yourchannel" },
  captions: false,
  transition: { type: "fade", durationInFrames: 12 },
  scenes: [
    {
      id: "s1",
      type: "statement",
      durationInFrames: 180,
      tone: "light",
      props: {
        kicker: "Preview",
        text: "Run **video-forge build** to render your storyboard.",
      },
    },
  ],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Explainer"
    component={Video}
    durationInFrames={FALLBACK.meta.totalFrames}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={FALLBACK}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, props.meta?.totalFrames ?? 1),
      fps: props.meta?.fps ?? 30,
      width: props.meta?.width ?? 1920,
      height: props.meta?.height ?? 1080,
    })}
  />
);
