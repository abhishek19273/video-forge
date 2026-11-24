export type Caption = {
  text: string;
  from: number;
  to: number;
};

export type SceneTransition = {
  type?: string;
  durationInFrames?: number;
};

export type SceneAudio = {
  src: string;
  /** Offset from the start of the scene, in frames. */
  startFrame: number;
  durationInFrames?: number;
  volume?: number;
};

export type Scene = {
  id: string;
  type: string;
  durationInFrames: number;
  /** Absolute start frame on the master timeline (computed by the builder). */
  startFrame?: number;
  tone?: "light" | "dark" | "accent";
  backdrop?: "plain" | "grid" | "sunset" | "aurora" | "glow" | "none";
  chrome?: boolean;
  chapter?: string;
  transition?: SceneTransition;
  audio?: SceneAudio;
  captions?: Caption[];
  props?: Record<string, unknown>;
};

export type Brand = {
  name: string;
  handle?: string;
};

export type VideoProps = {
  meta: {
    title: string;
    slug: string;
    fps: number;
    width: number;
    height: number;
    totalFrames: number;
  };
  theme: "paper" | "midnight";
  brand: Brand;
  captions: boolean;
  scenes: Scene[];
  music?: { src: string; volume: number; duck?: number };
  sfx?: { frame: number; src: string; volume: number }[];
  transition: { type: string; durationInFrames: number };
  /** Text shown in the top-right chrome, one per scene (usually the chapter name). */
  chapterLabels?: string[];
};
