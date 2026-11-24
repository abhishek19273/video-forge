/**
 * Video Forge design system.
 * Two complete visual identities, each with a light and a dark surface.
 */
export type ThemeName = "paper" | "midnight";
export type Tone = "light" | "dark" | "accent";

export const FONTS = {
  display: "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
  sans: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  grotesk: "'Space Grotesk', 'Inter', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
} as const;

export type Palette = {
  mode: "light" | "dark";
  bg: string;
  bg2: string;
  ink: string;
  soft: string;
  faint: string;
  line: string;
  card: string;
  cardLine: string;
  accent: string;
  accent2: string;
  accentInk: string;
  glow: string;
  grain: number;
};

const PAPER_LIGHT: Palette = {
  mode: "light",
  bg: "#F3EDE2",
  bg2: "#E8DECC",
  ink: "#1A1510",
  soft: "#6A6053",
  faint: "rgba(26,21,16,0.42)",
  line: "rgba(26,21,16,0.14)",
  card: "#FBF7EF",
  cardLine: "rgba(26,21,16,0.10)",
  accent: "#C2410C",
  accent2: "#0F766E",
  accentInk: "#FFF8F0",
  glow: "rgba(194,65,12,0.14)",
  grain: 0.05,
};

const PAPER_DARK: Palette = {
  mode: "dark",
  bg: "#14100C",
  bg2: "#1F1913",
  ink: "#F7F1E6",
  soft: "#B3A794",
  faint: "rgba(247,241,230,0.44)",
  line: "rgba(247,241,230,0.15)",
  card: "#1D1711",
  cardLine: "rgba(247,241,230,0.12)",
  accent: "#F5A524",
  accent2: "#7DD3C7",
  accentInk: "#241703",
  glow: "rgba(245,165,36,0.16)",
  grain: 0.07,
};

const MIDNIGHT_LIGHT: Palette = {
  mode: "light",
  bg: "#EAF0F7",
  bg2: "#DCE6F2",
  ink: "#0A1220",
  soft: "#516075",
  faint: "rgba(10,18,32,0.42)",
  line: "rgba(10,18,32,0.13)",
  card: "#F7FAFE",
  cardLine: "rgba(10,18,32,0.09)",
  accent: "#1D4ED8",
  accent2: "#0E7490",
  accentInk: "#F8FBFF",
  glow: "rgba(29,78,216,0.14)",
  grain: 0.05,
};

const MIDNIGHT_DARK: Palette = {
  mode: "dark",
  bg: "#060B16",
  bg2: "#0C1527",
  ink: "#EDF4FF",
  soft: "#95A4BB",
  faint: "rgba(237,244,255,0.42)",
  line: "rgba(237,244,255,0.15)",
  card: "#0C1526",
  cardLine: "rgba(237,244,255,0.11)",
  accent: "#38BDF8",
  accent2: "#A78BFA",
  accentInk: "#04121F",
  glow: "rgba(56,189,248,0.16)",
  grain: 0.07,
};

const THEMES: Record<ThemeName, Record<"light" | "dark", Palette>> = {
  paper: { light: PAPER_LIGHT, dark: PAPER_DARK },
  midnight: { light: MIDNIGHT_LIGHT, dark: MIDNIGHT_DARK },
};

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function getPalette(theme: ThemeName, tone: Tone = "light", accent: string): Palette {
  const set = THEMES[theme] ?? THEMES.paper;
  if (tone === "light") return set.light;
  if (tone === "dark") return set.dark;
  // "accent": a deep, saturated surface built from the theme accent.
  // Bright accents (e.g. cyan) are darkened so cream text always passes contrast.
  const bright = luminance(accent) > 0.3;
  const surface = bright ? darken(accent, 0.55) : accent;
  return {
    ...set.dark,
    mode: "dark",
    bg: surface,
    bg2: surface,
    ink: "#FFF9F0",
    soft: "rgba(255,249,240,0.76)",
    faint: "rgba(255,249,240,0.46)",
    line: "rgba(255,249,240,0.2)",
    card: "rgba(0,0,0,0.16)",
    cardLine: "rgba(255,249,240,0.18)",
    accent: bright ? "#7DD3FC" : "#FFD9A0",
    accent2: bright ? "#F0ABFC" : "#0B1020",
    accentInk: "#1A1206",
    glow: "rgba(0,0,0,0.18)",
    grain: 0.07,
  };
}

/** Theme accent used for the global progress bar. */
export const themeAccent = (theme: ThemeName, tone: Tone = "light"): string => {
  const p = THEMES[theme] ?? THEMES.paper;
  return tone === "dark" ? p.dark.accent : p.light.accent;
};
