import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * Fonts are bundled locally so renders are deterministic and work offline.
 * Variable fonts use a weight range so one file serves every weight.
 */
let loaded = false;

export const ensureFonts = () => {
  if (loaded) return;
  loaded = true;
  loadFont({
    family: "Inter",
    url: staticFile("fonts/Inter.ttf"),
    weight: "100 900",
    style: "normal",
    display: "block",
  }).catch(() => undefined);
  loadFont({
    family: "Instrument Serif",
    url: staticFile("fonts/InstrumentSerif-Regular.ttf"),
    weight: "400",
    style: "normal",
    display: "block",
  }).catch(() => undefined);
  loadFont({
    family: "Instrument Serif",
    url: staticFile("fonts/InstrumentSerif-Italic.ttf"),
    weight: "400",
    style: "italic",
    display: "block",
  }).catch(() => undefined);
  loadFont({
    family: "Space Grotesk",
    url: staticFile("fonts/SpaceGrotesk.ttf"),
    weight: "300 700",
    style: "normal",
    display: "block",
  }).catch(() => undefined);
  loadFont({
    family: "JetBrains Mono",
    url: staticFile("fonts/JetBrainsMono.ttf"),
    weight: "100 800",
    style: "normal",
    display: "block",
  }).catch(() => undefined);
};
