# python/videoforge/

Core pipeline.

| Module | Responsibility |
|--------|----------------|
| `storyboard.py` | parse/validate YAML |
| `builder.py` | voice, timings, captions, props.json |
| `tts.py` | Kokoro, Edge, Gemini, macOS say |
| `voices.py` | registry/resolve |
| `media.py` | FFmpeg helpers |
| `sound.py` | generated music/SFX |
| `maps.py` | base map SVGs |
| `cli.py` | `vf` commands |

Adding a scene type touches **all** of:

1. `storyboard.schema.json`
2. `builder.py` (duration/assets)
3. `src/scenes/<name>.tsx`
4. `src/Video.tsx` dispatch

Never hand-edit generated `props.json`.
