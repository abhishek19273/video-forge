# Voice guide

Video Forge supports four TTS engines and pre-recorded narration. The same storyboard can be re-rendered with a different voice at any time; only the audio stage repeats (cached per scene).

## Engines at a glance

| Engine | Quality | Speed | Cost | Offline | Commercial |
|--------|---------|-------|------|---------|------------|
| **Kokoro** (`kokoro`) | Very good, natural, slightly even | Very fast | Free | Yes | Apache-2.0 — clean |
| **Edge** (`edge`) | Excellent, most human-like | Fast | Free | No | Unofficial endpoint — check Microsoft terms |
| **Gemini** (`gemini`) | Best expressiveness and prosody | Medium | Paid API | No | Gemini API terms |
| **macOS say** (`say`) | Robotic | Instant | Free | Yes | macOS voice licences |
| **Recorded / cloned** (`audio:` per scene) | Whatever you supply | N/A | N/A | Yes | Yours to clear |

Default: **Kokoro `warm-female`** — the safest choice for a monetised channel.

## Kokoro (recommended default)

Local 82M-parameter model, 24 kHz, Apache-2.0. No network, no per-word cost, stable across re-renders.

```bash
./bin/vf build ../projects/x/storyboard.yaml --voice warm-female
```

| Profile | Voice | Character |
|---------|-------|-----------|
| `warm-female` | af_heart | Warm, clear, trusted — the default |
| `bright-female` | af_bella | Brighter, more energetic |
| `calm-female` | af_nicole | Softer, intimate, slower |
| `warm-male` | am_michael | Conversational, friendly |
| `deep-male` | am_fenrir | Deep, cinematic |
| `onyx-male` | am_onyx | Measured, authoritative |
| `british-female` | bf_emma | Poised, editorial |
| `british-male` | bm_george | Classic narrator |

Speed is the main expressive control: `0.96` feels weightier, `1.05` brisker. Kokoro does not support emotion tags or zero-shot cloning.

## Edge neural voices

Microsoft's Edge read-aloud voices via the unofficial `edge-tts` package. The most natural free option, including excellent Indian English voices.

| Profile | Voice | Notes |
|---------|-------|-------|
| `edge-warm-male` | en-US-AndrewMultilingualNeural | Warm, documentary — best male |
| `edge-clear-female` | en-US-AvaMultilingualNeural | Clear, engaging |
| `edge-storyteller` | en-US-BrianMultilingualNeural | Casual storyteller |
| `edge-british-male` | en-GB-RyanNeural | British documentary |
| `edge-indian-male` | en-IN-PrabhatNeural | Indian English, warm |
| `edge-indian-female` | en-IN-NeerjaNeural | Indian English, clear |

**Licensing:** `edge-tts` is not an official Microsoft API. Microsoft's terms for the read-aloud voices are not written for commercial publishing. Treat these samples as auditions; before monetising, use Kokoro, Gemini, or a licensed voice actor/clone you have rights to.

## Gemini TTS

Most expressive option: natural pauses, emphasis, and style instructions.

- Requires `GEMINI_API_KEY` in `.env` at the workspace root.
- The key must have **billing credits**. A free key returns `402 RESOURCE_EXHAUSTED` with "prepayment credits are depleted" — this is an account/billing issue, not a code issue.
- Current models: `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts`, `gemini-3.8-flash-tts`.
- Voices tried by the kit: `Kore` (warm female), `Charon` (deep male), `Fola` (warm global English). The full Gemini voice set also includes Puck, Aoede, Leda, Orus, Zephyr, Fenrir, Callirhoe, and others.

Add a profile in `voices/registry.json` to use any voice:

```json
"gemini-puck": {
  "label": "Puck - bright, youthful (Gemini)",
  "engine": "gemini",
  "voice": "Puck",
  "speed": 1.0,
  "commercial": "clean",
  "style": "Read in a bright, energetic, curious voice"
}
```

The `style` string is prepended to each chunk as a natural-language direction. Keep it consistent across scenes.

## macOS `say` (fallback)

Useful for scratch tracks only. Add a profile with `"engine": "say", "voice": "Ava"`. Quality is below the neural engines.

## Pre-recorded or cloned narration

Any scene can point at an audio file instead of using TTS:

```yaml
- type: statement
  narration: "The text used for captions."
  audio: assets/my-voice/scene-03.wav   # relative to the storyboard
  text: "The text shown on screen."
```

The builder converts it to 48 kHz mono, measures it, and times the scene exactly. This is the cleanest path for:

- your own recorded voice,
- a cloned voice from a local model (Chatterbox, F5-TTS, NeuTTS, XTTS, etc.),
- a human voice actor.

**Cloning notes**

- Kokoro cannot clone. It is a fixed voice bank.
- Qwen TTS, Chatterbox, F5-TTS and similar can do zero-shot cloning, but are separate models with their own installs and licences. Keep them outside this kit and feed the resulting WAVs through `audio:`.
- Only clone voices you have written permission to use. YouTube's impersonation and privacy policies apply.
- Generate one WAV per scene so timing stays exact, or split a long recording at sentence boundaries.

## Auditioning voices

```bash
./bin/vf voices --engines kokoro,edge
open voices/audition.html
```

The page has filters, one-click playback, and copyable profile ids. To make a voice the project default, set `voice:` in the storyboard. Per-scene overrides enable two-narrator dialogues (host + expert) without extra tooling.

## Pronunciation and pacing

- Write numbers the way they should be spoken in `narration`: "five point five", "four hundred and fifty nanometres".
- Expand abbreviations that TTS might spell out: "for example", not "e.g.".
- Acronyms: "N A S A" if the engine says "nasa" wrong; test with a preview.
- Keep sentences under ~25 words. Long sentences flatten prosody.
- Use `tts_text:` when the on-screen text is punchy but the spoken version needs grammar:
  ```yaml
  text: "5.5× more scattering"
  tts_text: "Five and a half times more scattering"
  narration: "Five and a half times more scattering."
  ```
- Leave a beat between scenes: the builder adds ~0.6 s, and `pause_after` adds more.

## Loudness

Every scene is normalised to **-16 LUFS integrated, -1.5 dBTP** with FFmpeg `loudnorm`. This matches YouTube's normalisation target closely, so the final mix should not need gain changes. If you add music, start at `music.volume: 0.5` with `duck: 0.55`; narration stays dominant and the bed recovers in the gaps.

## Choosing for an educational channel

- **Trust + warmth:** `warm-female` or `edge-warm-male`.
- **Authority:** `onyx-male` or `edge-british-male`.
- **Energy for younger audiences:** `bright-female` or `edge-storyteller`.
- **Indian audience:** `edge-indian-male` / `edge-indian-female`.

Pick one voice for the channel and keep it. Voice consistency is a bigger retention factor than micro-improvements in prosody.
