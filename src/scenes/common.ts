import { getPalette } from "../theme";
import { Scene } from "../types";

export type SceneProps = {
  scene: Scene;
  theme: "paper" | "midnight";
  brand: { name: string; handle?: string };
  captions: boolean;
};

export const paletteFor = (theme: "paper" | "midnight", scene: Scene) =>
  getPalette(theme, scene.tone ?? "light", theme === "paper" ? "#C2410C" : "#38BDF8");
