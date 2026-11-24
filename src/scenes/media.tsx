import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONTS } from "../theme";
import { SceneShell } from "../components/SceneShell";
import { Kicker, RichWords } from "../components/ui";
import { useEnter, useProgress } from "../lib/anim";
import { SceneProps, paletteFor } from "./common";

const resolveSrc = (src: string) => {
  if (!src) return "";
  if (/^(https?:|data:|file:|\/)/.test(src)) return src;
  return staticFile(src);
};

/* --------------------------------- image --------------------------------- */

export const ImageScene: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const full = props.variant === "full";
  const e = useEnter(4, { stiffness: 70, damping: 20 });
  const cap = useEnter(26, { stiffness: 70, damping: 20 });
  const src = resolveSrc(String(props.src ?? ""));
  const focus = props.focus === "left" ? "0% 50%" : props.focus === "right" ? "100% 50%" : "50% 50%";

  const Ken: React.FC = () => (
    <Img
      src={src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: focus,
        transform: `scale(${1.06 + 0.07 * e})`,
      }}
    />
  );

  if (full) {
    return (
      <SceneShell scene={scene} theme={theme} brand={brand} captions={captions} padded={false}>
        <AbsoluteFill>
          <Ken />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(4,7,12,0.35) 0%, rgba(4,7,12,0.0) 35%, rgba(4,7,12,0.78) 100%)",
            }}
          />
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 120, right: 120, bottom: 150, opacity: cap }}>
          {props.caption ? (
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 66,
                color: "#FFF9EF",
                lineHeight: 1.1,
                maxWidth: 1200,
              }}
            >
              {String(props.caption)}
            </div>
          ) : null}
          {props.credit ? (
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 16,
                color: "rgba(255,249,239,0.55)",
                marginTop: 16,
                letterSpacing: "0.04em",
              }}
            >
              {String(props.credit)}
            </div>
          ) : null}
        </div>
      </SceneShell>
    );
  }

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {props.kicker ? <Kicker p={p} delay={2}>{String(props.kicker)}</Kicker> : null}
        <div style={{ height: 16 }} />
        <div
          style={{
            width: "100%",
            height: 660,
            borderRadius: 26,
            overflow: "hidden",
            position: "relative",
            border: `1px solid ${p.cardLine}`,
            boxShadow: p.mode === "dark" ? "0 36px 80px rgba(0,0,0,0.45)" : "0 30px 70px rgba(60,40,20,0.16)",
            opacity: e,
            transform: `translateY(${(1 - e) * 22}px)`,
            background: p.card,
          }}
        >
          <Ken />
          {props.caption ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "70px 38px 30px",
                background: "linear-gradient(180deg, transparent, rgba(4,7,12,0.82))",
                color: "#FFF9EF",
                fontFamily: FONTS.sans,
                fontSize: 27,
                fontWeight: 500,
                opacity: cap,
              }}
            >
              {String(props.caption)}
            </div>
          ) : null}
        </div>
        {props.credit ? (
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 16,
              color: p.faint,
              marginTop: 16,
              letterSpacing: "0.04em",
              opacity: cap,
            }}
          >
            {String(props.credit)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};

/* ---------------------------------- code --------------------------------- */

const KEYWORDS: Record<string, string[]> = {
  python: ["def", "return", "import", "from", "for", "in", "if", "else", "elif", "while", "class", "with", "as", "try", "except", "lambda", "not", "and", "or", "None", "True", "False", "yield", "pass", "raise", "async", "await"],
  javascript: ["const", "let", "var", "function", "return", "import", "from", "export", "default", "if", "else", "for", "while", "class", "new", "await", "async", "try", "catch", "throw", "typeof", "null", "undefined", "true", "false", "=>"],
  typescript: ["const", "let", "var", "function", "return", "import", "from", "export", "default", "interface", "type", "if", "else", "for", "while", "class", "new", "await", "async", "try", "catch", "throw", "null", "undefined", "true", "false", "as", "extends", "implements"],
  bash: ["if", "then", "else", "fi", "for", "do", "done", "while", "echo", "export", "cd", "ls", "cat", "grep", "sed", "awk"],
};

const CodeLine: React.FC<{
  line: string;
  i: number;
  at: number;
  p: ReturnType<typeof paletteFor>;
  hot: boolean;
  language: string;
}> = ({ line, i, at, p, hot, language }) => {
  const e = useProgress(at, 12);
  const keywords = KEYWORDS[language] ?? KEYWORDS.typescript;
  const parts = line.split(/(".*?"|'.*?'|`.*?`|#.*$|\/\/.*$|\b\d+(\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g);

  return (
    <div
      style={{
        display: "flex",
        gap: 22,
        padding: "3px 26px",
        background: hot ? "rgba(255,201,122,0.10)" : "transparent",
        borderLeft: hot ? "2px solid #FFC97A" : "2px solid transparent",
        opacity: e,
        transform: `translateX(${(1 - e) * 8}px)`,
      }}
    >
      <div
        style={{
          width: 38,
          textAlign: "right",
          color: "rgba(237,244,255,0.26)",
          fontSize: 20,
          lineHeight: "42px",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {i + 1}
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 24,
          lineHeight: "42px",
          whiteSpace: "pre",
          color: "rgba(237,244,255,0.88)",
        }}
      >
        {parts.map((part, k) => {
          if (!part) return null;
          let color = "rgba(237,244,255,0.88)";
          if (/^(".*"|'.*'|`.*`)$/.test(part)) color = "#A5E8C0";
          else if (/^(#|\/\/)/.test(part)) color = "rgba(237,244,255,0.34)";
          else if (/^\d+(\.\d+)?$/.test(part)) color = "#FFC97A";
          else if (keywords.includes(part)) color = "#7DD3FC";
          else if (part === "self" || part === "this") color = "#F0A6CA";
          return (
            <span key={k} style={{ color }}>
              {part}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Code: React.FC<SceneProps> = ({ scene, theme, brand, captions }) => {
  const props = scene.props ?? {};
  const p = paletteFor(theme, scene);
  const code = String(props.code ?? "").replace(/\n$/, "");
  const lines = code.split("\n");
  const file = useEnter(4, { stiffness: 80, damping: 20 });
  const hot = new Set(((props.highlightLines as number[]) ?? []).map((n) => n - 1));
  const language = String(props.language ?? "python").toLowerCase();
  const lineStep = Math.min(10, Math.max(4, (scene.durationInFrames * 0.45) / Math.max(1, lines.length)));

  return (
    <SceneShell scene={scene} theme={theme} brand={brand} captions={captions}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {props.kicker ? <Kicker p={p} delay={2}>{String(props.kicker)}</Kicker> : null}
        <div style={{ height: 12 }} />
        <RichWords
          text={String(props.title ?? "")}
          p={p}
          size={54}
          family={FONTS.display}
          weight={400}
          lineHeight={1.05}
          delay={4}
          stagger={2.2}
        />
        <div style={{ height: 28 }} />
        <div
          style={{
            background: "#080C14",
            border: "1px solid rgba(237,244,255,0.12)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 40px 90px rgba(0,0,0,0.45)",
            opacity: file,
            transform: `translateY(${(1 - file) * 18}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "15px 22px",
              borderBottom: "1px solid rgba(237,244,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ display: "flex", gap: 7 }}>
              {["#FF6B5A", "#FFC24B", "#4ADE80"].map((c, i) => (
                <div key={i} style={{ width: 11, height: 11, borderRadius: 11, background: c, opacity: 0.85 }} />
              ))}
            </div>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 16,
                color: "rgba(237,244,255,0.55)",
                marginLeft: 10,
                letterSpacing: "0.04em",
              }}
            >
              {String(props.filename ?? "example.py")}
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontFamily: FONTS.mono,
                fontSize: 14,
                color: "rgba(237,244,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {language}
            </div>
          </div>
          <div style={{ padding: "22px 0 26px" }}>
            {lines.map((line, i) => (
              <CodeLine
                key={i}
                line={line}
                i={i}
                at={14 + i * lineStep}
                p={p}
                hot={hot.has(i)}
                language={language}
              />
            ))}
          </div>
        </div>
        {props.footnote ? (
          <div style={{ fontFamily: FONTS.sans, fontSize: 21, color: p.soft, marginTop: 18 }}>
            {String(props.footnote)}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
};
