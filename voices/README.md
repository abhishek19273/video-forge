# Voice Lab

Open `audition.html` in a browser and listen. Pick an id, then:

```bash
vf build projects/my-video/storyboard.yaml --voice warm-female
```

| ID | Voice | Engine | Length | Commercial |
|----|-------|--------|--------|------------|
| `edge-warm-male` | Andrew - warm, natural (Edge) | edge | 17.6s | check-license |
| `warm-female` | Ava - warm, clear, trusted | kokoro | 15.6s | clean |
| `edge-clear-female` | Ava - clear, engaging (Edge) | edge | 16.9s | check-license |
| `edge-storyteller` | Brian - storyteller (Edge) | edge | 16.9s | check-license |
| `edge-indian-female` | Neerja - Indian English (Edge) | edge | 19.3s | check-license |
| `edge-indian-male` | Prabhat - Indian English (Edge) | edge | 20.6s | check-license |
| `edge-british-male` | Ryan - British, documentary (Edge) | edge | 17.2s | check-license |
| `warm-female-fast` | Ava - brisker, brighter (1.08×) | kokoro | 14.8s | clean |
| `warm-female-slow` | Ava - slower, weightier (0.94×) | kokoro | 16.0s | clean |
| `bright-female` | Bella - bright, energetic | kokoro | 16.1s | clean |
| `british-female` | Emma - British, poised | kokoro | 13.9s | clean |
| `deep-male` | Fenrir - deep, cinematic | kokoro | 15.6s | clean |
| `british-male` | George - British, narrator | kokoro | 16.3s | clean |
| `warm-male` | Michael - warm, conversational | kokoro | 17.0s | clean |
| `calm-female` | Nicole - soft, intimate | kokoro | 24.0s | clean |
| `onyx-male` | Onyx - measured, authoritative | kokoro | 13.7s | clean |

Set the chosen id as `voice:` in the storyboard to make it the default.

Samples are generated from: “Here's the thing about light. It travels in waves, and every colour has its own wavelength. When sunlight hits our atmosphere, the short blue waves scatter far more than the long red ones. That is why the sky glows blue, and why sunsets burn orange.”
