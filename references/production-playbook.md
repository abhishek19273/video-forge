# Production playbook: 20–30 minute explainers

This is the process that keeps a long video coherent, cheap to iterate, and fast to render.

## 1. One sentence before anything else

Write the promise:

> "By the end of this video you will understand **why the sky is blue**, and you will never see a sunset the same way again."

If the sentence is weak, the video is weak. Every scene must serve it.

## 2. Blueprint a 25-minute episode

At 150 wpm, 25 minutes ≈ 3,750 spoken words. Budget by chapter, not by minute.

| Section | Time | Words | Scenes | Job |
|---------|------|-------|--------|-----|
| Cold open | 0:00–0:35 | 85 | 1 `title` | Provoke curiosity |
| Promise + roadmap | 0:35–1:15 | 100 | 1 `statement` + 1 `bullets` | Tell them what they'll get |
| Chapter 1 | 1:15–5:30 | 620 | 6–8 | Establish the mechanism |
| Chapter 2 | 5:30–10:00 | 670 | 7–9 | The surprising consequence |
| Chapter 3 | 10:00–14:30 | 670 | 7–9 | Evidence, history, or example |
| Chapter 4 | 14:30–19:00 | 670 | 7–9 | The bigger implication |
| Chapter 5 | 19:00–22:30 | 520 | 5–7 | Common mistakes / edge cases |
| Recap | 22:30–24:00 | 220 | 3–4 | Consolidate |
| Outro | 24:00–24:40 | 90 | 1 | CTA + next video |

- 4–6 chapters is the sweet spot.
- Each chapter gets a `chapter` card, a re-hook, one core idea, one concrete example, and one visual metaphor.
- If a chapter needs more than 9 scenes, split it.

## 3. Script first, visuals second

Write the narration as plain prose, read it aloud, then split it into scene-sized beats (50–110 words each).

For each beat, choose the visual **after** the words:

- Claim → `statement`
- List of causes → `bullets`
- Ordered process → `steps`
- One number → `stat`
- Comparison → `compare`
- Mechanism → `diagram`
- Trend → `chart`
- History → `timeline`
- A real quotation → `quote`
- Concrete place/photo → `image`
- Technical walkthrough → `code`
- Summary → `recap`

A 25-minute video should use **at least 8 different scene types** and change tone every 3–5 scenes.

## 4. The cold open formula

1. A familiar observation ("Look up.")
2. A contradiction ("The air is invisible.")
3. A question ("So where does the colour come from?")
4. A promise ("By the end, you'll see sunsets differently.")

Do not open with a logo, a long intro animation, or "In this video we will…". Start with the question.

## 5. Retention mechanics

- **Re-hook every 90 seconds.** A question, a number, or a "but here's the strange part".
- **Visual change every 15–25 seconds.** New scene or a major reveal within the scene.
- **One idea per scene.** If the viewer looks away for 5 seconds, they should not be lost.
- **Signpost.** "There are three reasons. The third one is the one nobody expects."
- **Pay off the promise.** The answer must arrive before the recap, not in the last 20 seconds.
- **No dead air.** Narration should cover 85–95% of the runtime.

## 6. From script to storyboard

```bash
./bin/vf new my-episode --title "My Episode"
```

Then, per beat:

```yaml
- type: statement
  tone: light
  kicker: "Chapter 2 · The turn"
  text: "The effect is **five and a half times** stronger than we expected."
  narration: >
    The effect is five and a half times stronger than anyone expected.
```

Use `--skip-render` after every 5–8 scenes to check duration drift. The builder prints total runtime and words per minute.

A useful sanity check: `words / (runtime_minutes)` should be **140–160**. If it is above 170, the voice is too fast or captions will lag. If below 130, you have dead air.

## 7. Iteration ladder (cheapest first)

1. **Build only** (`--skip-render`): catches timing, missing fields, TTS errors.
2. **Stills** (`./bin/vf still ... --scene N`): catches overflow, contrast, awkward line breaks.
3. **Preview** (`--preview`): first 30 s at 540p; catches pacing and audio.
4. **Draft** (`--draft`): full video at 540p; catches transitions and scene order.
5. **Final** (1080p): only after 1–4 pass.

Never jump straight to final on a 25-minute video.

## 8. Render budget

On an M-series Mac with 6 Remotion workers:

| Output | Frames | Approx. time |
|--------|--------|--------------|
| 30 s preview (540p) | 900 | 1–2 min |
| 5 min draft (540p) | 9,000 | 8–12 min |
| 25 min final (1080p) | 45,000 | 1.5–2.5 h |

Run final renders overnight or while writing the next script. Rendering is CPU-bound; do not run two Remotion renders at once.

## 9. Audio and music

- Narration is normalised per scene to -16 LUFS, so levels stay consistent.
- Generated beds (royalty-free) are built in:

```yaml
music:
  mood: curious      # curious | cinematic | playful
  volume: 0.5
  duck: 0.55
```

- Or bring a licensed track: `music: { path: assets/bed.mp3, volume: 0.45 }`.
- The player loops the bed, fades it in/out, and ducks it under every narration range automatically.
- SFX: `sfx: { set: soft }` adds transition whooshes, chapter impacts and stat pops. For manual cues, add `sfx: [{ at: 2.4, name: pop }]` to a scene.
- If music competes with narration, lower `volume` before touching the voice. If the ducking is too obvious, raise `duck` toward 0.7.

## 10. Publishing package

Every build writes:

- `out/<slug>.mp4` — upload to YouTube.
- `out/thumbnail.jpg` — 16:9 still from the title scene. Check it at 320×180; oversize the title text rather than adding more elements.
- `build/captions.srt` — upload as subtitles (or let YouTube auto-caption and use this as the corrected track).
- `build/youtube.md` — description with chapter timestamps and tags.
- `build/script.md` — the full transcript, useful for show notes.

Set the video's language and captions explicitly. Educational channels get a meaningful watch-time lift from accurate captions.

## 11. Common failure modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Video feels like slides | Every scene is text on a flat background | Add `chart` / `diagram` / `stat` / `image`; change tone; use chapter cards |
| Narration feels rushed | >165 wpm or long sentences | Cut 10–15% of words; add `pause_after` |
| Viewer confusion | Two ideas in one scene | Split into two scenes |
| Pretty but hollow | Visuals chosen before the argument | Rewrite the script first |
| Timing drift | Hand-edited `props.json` | Rebuild from the storyboard |
| Captions out of sync | Narration changed without re-synth | Rebuild without `--skip-tts` |
| Render too slow | 1080p iteration | Use `--preview` and `--draft` |
| Repetitive look | Same tone and scene type | Alternate `tone`, use `accent` once, vary backdrops |

## 12. Scaling to a series

- Keep `brand`, `theme`, `voice` and `transition` identical across episodes.
- Save a reusable chapter skeleton in `templates/` (copy an existing storyboard and replace scenes).
- Keep a `facts.md` next to each storyboard with sources and verification notes. It is not rendered, but it keeps agents honest.
- Series consistency beats per-episode novelty: same intro rhythm, same caption style, same narrator.
