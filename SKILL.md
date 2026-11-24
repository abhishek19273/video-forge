---
name: video-forge
description: Produce polished animated educational videos (20–30 minutes) from a YAML storyboard — neural voiceover, word-timed captions, 19 animated scene types, transitions, 1080p render, SRT, thumbnail and YouTube metadata. Use when asked to create an animated explainer, YouTube video, motion-graphics lesson, narrated slideshow, or to generate/select a voiceover.
---

# Video Forge

Turn a written lesson into a finished 1080p video: **storyboard → narration → timing → animation → MP4**.

Everything runs locally. Narration comes from Kokoro (offline, Apache-2.0), Microsoft Edge neural voices, Gemini TTS, or macOS `say`. Visuals are React/Remotion scenes rendered by headless Chromium.

All commands below run from the kit root (the folder containing `bin/vf`).

## When to use this skill

- "Make me an animated explainer / educational YouTube video."
- "Turn this script/topic into a narrated video with graphics."
- "Generate voice samples so I can pick a narrator."
- "I need 20–30 minutes of video with chapters, captions and transitions."

Do **not** use it for live-action editing, 360 video, or vertical shorts (only 16:9 1080p is supported).

## Non-negotiables

1. **Verify facts.** Never invent quotes, statistics, dates or sources. If a number is not known, omit it or say "roughly".
2. **Write for the ear.** 140–160 words per minute. Short sentences. Numbers written the way they are spoken inside `narration`.
3. **One scene = one beat.** 20–50 seconds each. A visual change every 15–25 seconds.
4. **Review before the expensive render.** Always build with `--skip-render`, inspect stills, then render a draft/preview.
5. **Never hand-edit `props.json`.** It is generated. Change the storyboard and rebuild.

## Length math (150 wpm)

| Target | Narration words | Scenes (≈28s avg) |
|--------|-----------------|-------------------|
| 20 min | ~3,000 | 40–50 |
| 25 min | ~3,750 | 50–60 |
| 30 min | ~4,500 | 60–70 |

Scene padding adds ~1.5 s per scene, so a 3,750-word script naturally lands near 25 minutes.

## Workflow

### 1. Check the machine

```bash
./bin/vf check
```

If the Kokoro model is missing: `./bin/vf setup`.

### 2. Plan the episode (5 minutes of thinking saves an hour of rendering)

- Hook (0:00–0:20): the surprising claim or question.
- Promise + roadmap (0:20–0:50).
- 3–6 chapters, each with a re-hook, one idea, one example, one visual metaphor.
- Recap + next-video CTA.
- Word budget per chapter from the table above.

### 3. Create a project

```bash
./bin/vf new why-the-sky-is-blue --title "Why Is the Sky Blue?"
```

This creates `../projects/why-the-sky-is-blue/storyboard.yaml`. Edit it.

### 4. Write the storyboard

Minimal shape:

```yaml
title: "Why Is the Sky Blue?"
slug: sky-blue
theme: paper                  # paper = warm editorial, midnight = cool tech
fps: 30
resolution: [1920, 1080]
voice: warm-female            # see ./bin/vf list-voices
captions: true
transition: { type: fade, duration: 0.45 }
brand: { name: "Curious Physics", handle: "@curiousphysics" }

scenes:
  - type: title
    tone: dark
    backdrop: sunset
    kicker: "Episode 01 · Light"
    title: "Why is the sky *blue*?"
    subtitle: "The three-minute answer hiding inside ordinary sunlight."
    narration: >
      Look up. On a clear day the sky is blue, but the air around you is
      completely invisible. So where does the colour come from?

  - type: statement
    tone: light
    text: "Sunlight looks white, but it is actually **every colour** at once."
    narration: >
      Sunlight looks white, but it is actually every colour at once.
```

Rules:

- `narration` is spoken. All other keys are visual text. Keep them different when phrasing matters.
- Inline markup in visual text: `**strong**` (accent + animated underline), `*emphasis*` (serif italic), `` `code` ``.
- `tone`: `light`, `dark`, or `accent` (full-bleed accent colour — use sparingly, once every 3–4 minutes).
- `backdrop`: `sunset`, `aurora`, `grid`, `glow`, `plain`, `none`. `sunset`/`aurora` expect `tone: dark`.
- `chapter:` controls the small label top-right. Chapter scenes set it automatically, but explicit labels are cleaner.
- `duration:` (seconds) is a **minimum** for narrated scenes and an **exact** length for silent scenes.
- `transition:` per scene, e.g. `{ type: fade, duration: 0.5 }`. Types: `fade`, `slide-left`, `slide-right`, `slide-up`, `wipe`, `wipe-up`, `clock`, `flip`, `none`.

### 5. Build everything except the render

```bash
./bin/vf build ../projects/sky-blue/storyboard.yaml --skip-render
```

This synthesises narration (cached by text hash), measures each clip, computes scene lengths, writes captions/SRT/YouTube metadata, and emits `build/props.json`.

Read:

- `../projects/<slug>/build/script.md` — scene-by-scene table.
- `../projects/<slug>/build/timeline.json` — exact starts/durations.
- `../projects/<slug>/build/captions.srt` — proofread the caption breaks.

Check the reported runtime. Adjust narration or scene counts until it matches the target.

### 6. Inspect frames (cheap, catches 90% of layout bugs)

```bash
./bin/vf still ../projects/sky-blue/storyboard.yaml --scene 1 --at 0.7
./bin/vf still ../projects/sky-blue/storyboard.yaml --scene 5 --at 0.5
```

Output goes to `../projects/<slug>/out/still-XX.jpg`. Look for: text overflows, awkward line breaks, empty dead space, low contrast, captions covering content.

Useful `--at` values: `0.15` (entrance), `0.5` (steady state), `0.9` (late reveal).

### 7. Preview motion and audio

```bash
./bin/vf build ../projects/sky-blue/storyboard.yaml --preview
```

Renders the first 30 seconds at half resolution (`out/<slug>.preview.mp4`). Watch it end-to-end. Listen for mispronunciations, pacing, loudness, captions drifting.

Full draft at half resolution:

```bash
./bin/vf build ../projects/sky-blue/storyboard.yaml --draft
```

### 8. Final render

```bash
./bin/vf build ../projects/sky-blue/storyboard.yaml --concurrency 2
```

Produces:

- `out/<slug>.mp4` — 1920×1080, H.264, AAC 192k, 30 fps.
- `out/thumbnail.jpg` — frame from the title scene.
- `build/captions.srt`, `build/youtube.md`, `build/script.md`.

## Scene types

| Type | Use it for | Key props |
|------|-----------|-----------|
| `title` | cold open / episode cover | `kicker`, `title`, `subtitle`, `season`, `runtime` |
| `chapter` | part break, re-hook | `number`, `kicker`, `title`, `subtitle` |
| `statement` | one big claim | `text`, `kicker`, `footnote`, `align`, `size` |
| `bullets` | 3–5 parallel points | `title`, `items[{title, detail}]`, `note` |
| `steps` | ordered process / recipe | `title`, `steps[{title, detail}]` |
| `compare` | A vs B, before/after | `left{label,title,subtitle,points}`, `right{...}`, `verdict` |
| `stat` | one number that lands | `value`, `decimals`, `prefix`, `suffix`, `label`, `detail`, `source`, `bars` |
| `chart` | bars or a line trend | `variant: bar\|line`, `data[{label,value}]`, `unit`, `highlightIndex`, `max`, `note`, `footnote` |
| `diagram` | mechanism, flow, system | `nodes[{id,label,sublabel}]`, `edges[{from,to,label}]`, `layout: row\|cycle\|stack` |
| `timeline` | history / sequence | `events[{when,title,detail}]`, `footnote` |
| `quote` | a real quotation | `text`, `author`, `role` |
| `image` | photo, map, screenshot | `src`, `caption`, `credit`, `variant: inset\|full`, `focus` |
| `code` | annotated code walkthrough | `code`, `language`, `filename`, `highlightLines` |
| `recap` | checklist summary | `title`, `items[]`, `cta` |
| `outro` | subscribe / next episode | `title`, `subtitle`, `pills[]`, `next` |
| `map` | route, flight path, journey | `points[{lat,lon,label,note,kind,leg}]`, `bounds`, `src` |
| `flight` | aircraft, jump, action beat | `title`, `tail`, `altitude`, `note` |
| `portrait` | suspect / historical person case file | `name`, `alias`, `image`, `facts[]`, `note` |
| `evidence` | objects, artefacts, documents | `items[{title,detail,tag,icon}]` |

Full prop reference with examples: `references/scene-reference.md`.

## History and true-crime episodes

The history scenes are built for exactly this channel:

- `map` animates a route with markers, times and a travelling aircraft. Generate the base map once:

```bash
PYTHONPATH=python .venv/bin/python -m videoforge.maps
# -> public/assets/maps/pnw-dark.svg and pnw-light.svg
```

- `flight` is a stylised 727 with a deploying aft airstair and a descending parachutist.
- `portrait` frames a case-file image (e.g. a public-domain FBI composite) with facts and an "UNSOLVED" stamp.
- `evidence` shows three artefacts with vector icons and tags.

Rules for historical work:

1. Write `facts.md` next to the storyboard with a source per claim. Do not render a claim you cannot source.
2. Keep documented facts and inference visually distinct. Use words like "may", "suggests", "the theory" on screen.
3. Never invent a quotation. If the exact line is unknown, use a `statement`, not a `quote`.
4. Use public-domain or licensed images. Credit them in `credit:`.
5. Map routes are approximate unless you have exact coordinates; say so in `footnote`.

If you have the optional Cooper reference project, it is a useful history example. It is not bundled in this repository; use `references/scene-reference.md` for the props.

## Choosing a voice

```bash
./bin/vf voices            # generates 16 samples + voices/audition.html
./bin/vf list-voices       # profiles and engines
```

Open `voices/audition.html` and listen. Use the id directly:

```bash
./bin/vf build ../projects/x/storyboard.yaml --voice edge-warm-male
```

Guidance:

- `warm-female` (Kokoro `af_heart`) — default, offline, commercial-clean. Good for warm explainers.
- `warm-male` / `deep-male` / `onyx-male` — Kokoro male options.
- `edge-warm-male` (Andrew) — most natural, but Microsoft's edge-tts is unofficial; check licensing before monetising.
- `gemini-*` — most expressive, but requires a Gemini API key **with billing credits**. A key without credits returns 402.
- `edge-indian-male` / `edge-indian-female` — Indian English.

Speed: set `speed: 0.96` (slower, weightier) or `1.05` (brisker) globally or per scene.

## Music and sound effects

The kit ships a generated, royalty-free pack: three ambient music beds (`curious`, `cinematic`, `playful`) and five SFX (`whoosh`, `pop`, `tick`, `impact`, `riser`).

```bash
./bin/vf soundpack        # regenerate the pack (idempotent)
open public/audio/soundpack.html   # audition the beds and effects
```

Enable per storyboard:

```yaml
music:
  mood: curious           # curious | cinematic | playful
  volume: 0.5             # 0.35–0.6 is the sweet spot
  duck: 0.55              # music level under narration (0.5–0.65)

sfx:
  enabled: true
  set: soft               # soft | cinematic | none
  volume: 0.6
```

- The builder places a soft whoosh at every transition, an impact on the title/chapter cards, and a pop on `stat` reveals.
- Ducking is automatic: music dips by `duck` while any narration is playing, then recovers in the gaps.
- Use your own licensed track with `music: { path: assets/bed.mp3, volume: 0.45 }`.
- Add manual cues inside a scene:

```yaml
- type: bullets
  sfx:
    - { at: 1.2, name: pop, volume: 0.5 }
    - { at: 4.8, name: tick, volume: 0.4 }
```

- `at` is seconds from the scene start. Keep SFX sparse — one every 10–20 seconds at most.
- If music fights the voice, lower `volume` before lowering `duck`.

## Writing narration that sounds human

- Read every line aloud. If you run out of breath, split it.
- Prefer concrete nouns and active verbs. "Air scatters blue light" beats "blue light is scattered by air".
- Signpost: "First… Second… Here's the part that surprised me."
- Numbers: write `five and a half times` in `narration`, `5.5×` in visual props.
- Avoid markdown in narration. It is stripped, but pronunciations can break.
- Keep caption chunks under ~68 characters; the builder splits on punctuation automatically.
- Don't start a scene with "So," unless the previous scene earned it.

## Visual rhythm

- Alternate `tone` light/dark, but keep 2–3 light scenes in a row for readability; reserve `accent` for one hero stat.
- Use `chapter` every 4–7 minutes.
- Vary types: after two text scenes, use a `chart`, `diagram`, or `image`.
- Motion is already built in; do not add more than one new element per beat.
- Keep text inside the 120 px safe margin; the builder's scene shells already do this.
- Captions sit at the bottom. Avoid putting critical content under them.

## Finishing in DaVinci Resolve

Resolve is the **grade/finish** stage, not the assembly engine.

- Free Resolve 21.1+ has **no Python API** and **no MCP**; both are Studio-only.
- Free workflow: import the master, apply `assets/luts/videoforge_noir.cube` on the Color page, balance, mix in Fairlight, deliver H.264.
- Studio workflow: run `tools/resolve_finish.py` after exporting a master.
- Full notes: `RESOLVE.md`.

Do not put Resolve in the automated assembly loop. Remotion builds the cut; Resolve finishes it.

## Rendering performance (Apple Silicon reference)

- 1080p, 2 workers: ~10–14 rendered fps on an M-series Mac → a 4½ min episode in ~8–10 min. A 25 min video is roughly 1–1.5 h.
- `--draft` (540p): roughly 3–4× faster.
- `--preview`: 30 s in about a minute.
- Narration (Kokoro): a 25-min script in ~2–4 min, cached per scene.
- Re-rendering after changing only visuals still re-encodes everything. Change narration first, visuals second.

## QC checklist before delivering

```bash
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/<slug>.mp4
ffmpeg -i out/<slug>.mp4 -filter:a ebur128 -f null - 2>&1 | tail -20   # integrated loudness ≈ -16 LUFS
```

- [ ] Runtime matches the brief.
- [ ] First 15 seconds have a hook and motion.
- [ ] No scene is silent for more than ~2 s without a visual reason.
- [ ] Captions match the audio and do not overflow.
- [ ] Numbers, names and claims are correct.
- [ ] Audio peaks below -1 dBTP; no clipping.
- [ ] Music sits under the voice and swells in the gaps (listen on headphones and phone speakers).
- [ ] Thumbnail is legible at 320×180.
- [ ] `build/youtube.md` description and chapters are accurate.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `TTS failed … 402` | Gemini key has no credits. Use `--voice warm-female` (Kokoro) or top up. |
| Kokoro model missing | `./bin/vf setup` |
| Remotion hangs downloading Chrome | `./bin/vf chrome` should print a path; rerun build. If it prints nothing, install Chrome or run `npx remotion browser ensure`. |
| npm EPERM on cache | use the bundled local cache: `npm i --cache .npm-cache` from the kit root. |
| Render is too slow | use `--draft` / lower `--concurrency` if memory-bound / shorten scenes. |
| Captions drift | narration changed after captions were built: rerun without `--skip-tts`. |
| Text overflows | shorten visual text or reduce `size`; check with `vf still`. |
| Edge TTS network error | retry, or switch to a Kokoro profile. |

## Files agents should read

- `references/scene-reference.md` — every prop, defaults, copy limits.
- `references/voice-guide.md` — engines, licensing, pronunciation, cloning notes.
- `references/production-playbook.md` — 25-minute episode structure and QA.
- `storyboard.schema.json` — machine-readable schema.
- `../projects/<slug>/storyboard.yaml` — your own episode (create with `vf new`).
- `../projects/<slug>/facts.md` — sources for a history/true-crime episode.
