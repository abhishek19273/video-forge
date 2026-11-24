# Video Forge

**Turn a YAML lesson into a finished animated explainer — narration, captions, transitions, 1080p MP4.**

Built for a YouTube channel that wants 20–30 minute educational videos without a motion-design team. Agents write a storyboard; Video Forge handles voice, timing, animation, rendering, thumbnails and publishing metadata.


---

## What you get

| Output | Where |
|--------|-------|
| Finished 1080p video | `projects/<slug>/out/<slug>.mp4` |
| Vertical-free 16:9 thumbnail | `projects/<slug>/out/thumbnail.jpg` |
| Captions | `projects/<slug>/build/captions.srt` |
| Transcript / scene table | `projects/<slug>/build/script.md` |
| YouTube description + chapters | `projects/<slug>/build/youtube.md` |
| Voice audition page | `voices/audition.html` |
| Music + SFX pack | `public/audio/` |
| Sound audition page | `public/audio/soundpack.html` |
| Agent skill | `SKILL.md` |

No episodes or demo renders are bundled. Create your own project with `vf new`; outputs stay beside the kit in `../projects/`.

## History / true-crime workflow

History episodes need illustrations, not just typography. Four scenes cover the genre:

- **`map`** — an animated route with markers, times and a moving aircraft.
- **`flight`** — a stylised 727 with deploying aft airstairs and a descending parachutist.
- **`portrait`** — a case-file frame around a public-domain image, with facts and an "UNSOLVED" stamp.
- **`evidence`** — three artefact cards with vector icons and tags.

Generate the base map once:

```bash
PYTHONPATH=python .venv/bin/python -m videoforge.maps
```

Then keep a `facts.md` beside the storyboard with a source for every claim. The Cooper episode does this and deliberately separates documented facts from theories. Never invent a quote or name a suspect as the culprit.

---

## Quickstart

```bash
cd video-forge

./bin/vf check          # verify ffmpeg, node, chromium, models, API key
./bin/vf voices         # generate voice samples + open voices/audition.html
./bin/vf new my-episode --title "My Episode"

# edit ../projects/my-episode/storyboard.yaml

./bin/vf build ../projects/my-episode/storyboard.yaml --skip-render
./bin/vf still ../projects/my-episode/storyboard.yaml --scene 1 --at 0.7
./bin/vf build ../projects/my-episode/storyboard.yaml --preview
./bin/vf build ../projects/my-episode/storyboard.yaml --concurrency 2
```

Full agent workflow: [`SKILL.md`](SKILL.md).

---

## Storyboard in 20 lines

```yaml
title: "Why Is the Sky Blue?"
slug: sky-blue
theme: paper                 # paper | midnight
voice: warm-female
captions: true
brand: { name: "Curious Physics", handle: "@curiousphysics" }
transition: { type: fade, duration: 0.45 }

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
```

Every other key is either a timing control (`tone`, `duration`, `transition`, `pause_after`) or a visual prop for the scene type (`text`, `items`, `data`, `nodes`, …). See [`references/scene-reference.md`](references/scene-reference.md).

---

## 19 scene types

`title` · `chapter` · `statement` · `bullets` · `steps` · `compare` · `stat` · `chart` · `diagram` · `timeline` · `quote` · `image` · `code` · `recap` · `outro` · `map` · `flight` · `portrait` · `evidence`

All scenes share the same layout system: 1920×1080, safe margins, film grain, vignette, animated gradient backdrop, optional grid, per-scene brand chrome and a global progress bar.

Transitions: fade, slide, wipe, clock wipe, flip — per scene, automatically cross-faded with the audio timeline.

---

## Voices

| Engine | Character | Commercial |
|--------|-----------|------------|
| **Kokoro** (local, Apache-2.0) | Warm and clear; 8 curated profiles | Clean |
| **Edge neural** | Most natural free voices, incl. Indian English | Check Microsoft terms |
| **Gemini TTS** | Most expressive; needs billing credits | Gemini terms |
| **Recorded / cloned** | Any WAV per scene via `audio:` | Yours |

```bash
./bin/vf voices                 # 16 samples + audition.html
./bin/vf list-voices
./bin/vf build ... --voice edge-warm-male
```

Gemini keys without credits return `402`; the kit reports this clearly and falls back is manual (`--voice warm-female`). See [`references/voice-guide.md`](references/voice-guide.md).

---

## How it works

```
storyboard.yaml
      │
      ▼
Python builder ── TTS (Kokoro / Edge / Gemini / file) ── loudnorm ── durations
      │                                                            │
      │        scene timing, captions, SRT, YouTube metadata ◄─────┘
      ▼
build/props.json
      │
      ▼
Remotion (React + Chromium) ── TransitionSeries ── audio timeline
      │
      ▼
out/<slug>.mp4  +  thumbnail.jpg  +  captions.srt
```

- **Python** owns text, voice, timing, and files. Audio is cached by content hash, so re-renders are cheap.
- **Remotion** owns pixels. Every scene is deterministic from the frame number, so renders are reproducible.
- **Scene duration = lead-in + narration + tail**, clamped to a per-type minimum. Captions are split on punctuation and distributed proportionally across the audio.

---

## Commands

| Command | Purpose |
|---------|---------|
| `vf check` | Verify the toolchain |
| `vf setup` | Download Kokoro models, then check |
| `vf new <slug>` | Scaffold a project |
| `vf voices` | Generate voice samples and audition page |
| `vf soundpack` | Generate the royalty-free music + SFX pack |
| `vf soundpack --force` | Regenerate audio beds/effects |
| `vf list-voices` | Print profiles, engines and voice ids |
| `vf build <storyboard>` | Audio + timing + render |
| `vf build ... --skip-render` | Build props/audio/captions only |
| `vf build ... --preview` | First 30 s at 540p |
| `vf build ... --draft` | Full video at 540p |
| `vf build ... --concurrency 4` | More render workers (if stable) |
| `vf still <storyboard> --scene 3 --at 0.6` | QA frame |
| `vf chrome` | Print the Chromium path |

---

## Requirements

- macOS (tested on macOS 26, Apple Silicon). Linux should work with Chromium and the bundled fonts.
- Node.js 20+ (tested on 26) and npm.
- FFmpeg + ffprobe on PATH.
- Python 3.11+ (tested on 3.13).
- Chromium: `npx remotion browser ensure` downloads it if needed.

Fresh install from the kit root:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm install --cache .npm-cache
./bin/vf setup          # downloads the Kokoro model + voices
./bin/vf check
```

`vf setup` downloads the Kokoro model/voices into `models/`; they are not committed. The npm cache is deliberately local (`.npm-cache`) so the install does not depend on a global cache.

Optional Gemini TTS/image: copy `.env.example` to the workspace root as `.env` and fill `GEMINI_API_KEY`. Never commit `.env`.

---

## Performance and limits

- 1080p, 2 workers: ~10–14 fps → **a 4½ min episode in ~8–10 min; 25 minutes in ~1–1.5 hours**.
- Draft (540p) is ~3–4× faster; preview is ~1 minute.
- Voice generation: a 25-minute Kokoro script in ~2–4 minutes, cached per scene.
- 16:9 1080p only. No vertical, no 4K, no live-action editing.
- English-optimised. Kokoro has other language voices, but captions and fonts assume English.
- Music: three generated ambient beds and five SFX are bundled. Custom licensed tracks are supported via `music: { path: ... }`.

---

## Music and sound

`music: { mood: curious, volume: 0.5, duck: 0.55 }` adds a generated ambient bed that automatically ducks under narration. `sfx: { set: soft }` adds whooshes at transitions, impacts on chapter cards and pops on stats. All eight audio files are synthesised locally by `python/videoforge/sound.py`, so there are no licensing questions. Bring your own track with `music: { path: assets/bed.mp3 }` when you have one.

---

## Design system

- **Paper** — warm cream, ink, terracotta; Instrument Serif display, Inter UI, JetBrains Mono labels.
- **Midnight** — navy, cyan and violet; same type system, cooler palette.
- `tone: light | dark | accent` changes the surface without changing the brand.
- Fonts are bundled in `public/fonts/` (all open-source) so renders are deterministic and offline.

---

## Licensing

- **Your code and videos:** yours.
- **Kokoro:** Apache-2.0 — commercial use permitted.
- **Remotion:** free for individuals and companies up to 3 employees; larger teams need a Remotion company licence.
- **Edge TTS:** unofficial endpoint; do not assume commercial rights. Use for auditions and switch to Kokoro/Gemini for monetised uploads.
- **Gemini TTS:** subject to Google's Gemini API terms and billing.
- **Music/images:** you must supply and clear them.

This is guidance, not legal advice.

---

## Repository map

```
video-forge/
├── SKILL.md                     # agent instructions (the "skill")
├── storyboard.schema.json       # machine-readable storyboard schema
├── references/                  # scene reference, voice guide, production playbook
├── src/                         # Remotion scenes + design system
│   ├── Video.tsx                # timeline, transitions, audio
│   ├── scenes/                  # 19 scene components
│   └── components/              # backdrop, chrome, captions, UI primitives
├── python/videoforge/           # builder, TTS, timing, CLI
├── voices/                      # registry, samples, audition.html
├── models/                      # Kokoro ONNX model (downloaded)
├── public/                      # fonts, grain, project audio (served by Remotion)
└── bin/vf                       # CLI entrypoint
```
