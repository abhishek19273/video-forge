import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { flip } from "@remotion/transitions/flip";
import { VideoProps } from "./types";
import { Title, Chapter, Statement, Quote, Outro } from "./scenes/basic";
import { Bullets, Steps, Compare, Recap } from "./scenes/content";
import { Stat, Chart, Diagram, Timeline } from "./scenes/data";
import { ImageScene, Code } from "./scenes/media";
import { MapScene, Flight, Portrait, Evidence } from "./scenes/history";
import { SceneProps } from "./scenes/common";

const SceneRenderer: React.FC<SceneProps> = (props) => {
  switch (props.scene.type) {
    case "title":
      return <Title {...props} />;
    case "chapter":
      return <Chapter {...props} />;
    case "statement":
      return <Statement {...props} />;
    case "bullets":
      return <Bullets {...props} />;
    case "steps":
      return <Steps {...props} />;
    case "compare":
      return <Compare {...props} />;
    case "stat":
      return <Stat {...props} />;
    case "chart":
      return <Chart {...props} />;
    case "diagram":
      return <Diagram {...props} />;
    case "timeline":
      return <Timeline {...props} />;
    case "quote":
      return <Quote {...props} />;
    case "image":
      return <ImageScene {...props} />;
    case "code":
      return <Code {...props} />;
    case "recap":
      return <Recap {...props} />;
    case "outro":
      return <Outro {...props} />;
    case "map":
      return <MapScene {...props} />;
    case "flight":
      return <Flight {...props} />;
    case "portrait":
      return <Portrait {...props} />;
    case "evidence":
      return <Evidence {...props} />;
    default:
      return <Statement {...props} />;
  }
};

const transitionDuration = (props: VideoProps, index: number) => {
  if (index === 0) return 0;
  const scene = props.scenes[index];
  return Math.max(0, scene.transition?.durationInFrames ?? props.transition.durationInFrames);
};

export const sceneStarts = (props: VideoProps) => {
  let cursor = 0;
  return props.scenes.map((scene, i) => {
    cursor -= transitionDuration(props, i);
    const start = cursor;
    cursor += scene.durationInFrames;
    return start;
  });
};

const ProgressBar: React.FC<{ total: number; color: string }> = ({ total, color }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, Math.max(1, total)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, zIndex: 50 }}>
      <div style={{ height: 5, width: `${p * 100}%`, background: color, opacity: 0.9 }} />
    </div>
  );
};

const getPresentation = (type: string, width: number, height: number): any => {
  switch (type) {
    case "slide-left":
      return slide({ direction: "from-right" });
    case "slide-right":
      return slide({ direction: "from-left" });
    case "slide-up":
      return slide({ direction: "from-bottom" });
    case "wipe":
      return wipe({ direction: "from-left" });
    case "wipe-up":
      return wipe({ direction: "from-bottom" });
    case "clock":
      return clockWipe({ width, height });
    case "flip":
      return flip();
    case "none":
      return null;
    case "fade":
    default:
      return fade();
  }
};

export const Video: React.FC<VideoProps> = (props) => {
  const { width, height } = useVideoConfig();
  const total = props.meta.totalFrames;
  const starts = sceneStarts(props);
  const accent = props.theme === "paper" ? "#C2410C" : "#38BDF8";
  const narrationRanges = props.scenes
    .map((scene, i) =>
      scene.audio?.src
        ? ([
            starts[i] + (scene.audio.startFrame ?? 0),
            starts[i] + (scene.audio.startFrame ?? 0) + (scene.audio.durationInFrames ?? 0),
          ] as [number, number])
        : null,
    )
    .filter((r): r is [number, number] => r !== null);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {props.scenes.map((scene, i) => {
          const dur = transitionDuration(props, i);
          const presentation = getPresentation(scene.transition?.type ?? props.transition.type, width, height);
          return (
            <React.Fragment key={scene.id ?? i}>
              {i > 0 && presentation && dur > 0 ? (
                <TransitionSeries.Transition presentation={presentation} timing={linearTiming({ durationInFrames: dur })} />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={scene.durationInFrames}>
                <SceneRenderer scene={scene} theme={props.theme} brand={props.brand} captions={props.captions} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {props.scenes.map((scene, i) => {
        if (!scene.audio?.src) return null;
        const abs = starts[i] + (scene.audio.startFrame ?? 0);
        return (
          <Sequence key={`a-${scene.id ?? i}`} from={abs} durationInFrames={scene.durationInFrames}>
            <Audio src={staticFile(scene.audio.src)} volume={scene.audio.volume ?? 1} />
          </Sequence>
        );
      })}

      {props.music?.src ? (
        <Audio
          src={staticFile(props.music.src)}
          loop
          volume={(f) => {
            const base = props.music!.volume;
            const duck = props.music!.duck ?? 0.55;
            const fade = interpolate(
              f,
              [0, 45, Math.max(46, total - 90), total],
              [0, base, base, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            let level = 1;
            for (const [a, b] of narrationRanges) {
              if (f >= a - 10 && f <= b + 16) {
                const d = interpolate(
                  f,
                  [a - 10, a + 6, Math.max(a + 7, b - 2), b + 16],
                  [1, duck, duck, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                level = Math.min(level, d);
              }
            }
            return fade * level;
          }}
        />
      ) : null}

      {props.sfx?.map((cue, i) => (
        <Sequence key={`sfx-${i}`} from={Math.max(0, cue.frame)} durationInFrames={150}>
          <Audio src={staticFile(cue.src)} volume={cue.volume} />
        </Sequence>
      ))}

      <ProgressBar total={total} color={accent} />
    </AbsoluteFill>
  );
};
