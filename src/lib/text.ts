export type RichToken = {
  text: string;
  strong: boolean;
  em: boolean;
  /** Monospace / code styling. */
  code: boolean;
};

/**
 * Tiny inline markup:
 *   **strong**   → accent, underlined, animated wipe
 *   *em*         → italic serif accent
 *   `code`       → mono pill
 * Returns word tokens with trailing spaces preserved on the word itself.
 */
export function parseRich(text: string): RichToken[][] {
  const paragraphs = String(text ?? "").split("\n");
  return paragraphs.map((paragraph) => {
    const tokens: RichToken[] = [];
    let strong = false;
    let em = false;
    let code = false;

    const push = (chunk: string) => {
      if (!chunk) return;
      // Split into words but keep the whitespace attached to the word.
      const words = chunk.split(/(\s+)/).filter((w) => w.length > 0);
      for (const w of words) {
        if (/^\s+$/.test(w) && tokens.length > 0) {
          tokens[tokens.length - 1].text += w;
        } else if (/^\s+$/.test(w)) {
          continue;
        } else if (/^[.,;:!?%…'"”’)\]]+$/.test(w) && tokens.length > 0) {
          tokens[tokens.length - 1].text += w;
        } else {
          tokens.push({ text: w, strong, em, code });
        }
      }
    };

    let buffer = "";
    for (let i = 0; i < paragraph.length; i++) {
      const two = paragraph.slice(i, i + 2);
      const ch = paragraph[i];
      if (two === "**") {
        push(buffer);
        buffer = "";
        strong = !strong;
        i += 1;
      } else if (ch === "*" && paragraph[i + 1] !== "*") {
        push(buffer);
        buffer = "";
        em = !em;
      } else if (ch === "`") {
        push(buffer);
        buffer = "";
        code = !code;
      } else {
        buffer += ch;
      }
    }
    push(buffer);
    return tokens.filter((t) => t.text.trim().length > 0);
  });
}

/** Plain-text version, useful for captions and measuring. */
export const stripMarkup = (text: string) =>
  String(text ?? "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\n/g, " ")
    .trim();

export const wordCount = (text: string) => stripMarkup(text).split(/\s+/).filter(Boolean).length;
