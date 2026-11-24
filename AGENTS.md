# AGENTS.md — Video Forge

This repository turns a YAML storyboard into a narrated 1080p explainer.

## Start here

1. Read `SKILL.md` and `README.md`.
2. Run `./bin/vf check`.
3. Work from the kit root (`video-forge/`).
4. Put projects beside the kit: `../projects/<slug>/`.

## Hard rules

- Never commit `.env`, API keys, `models/`, `node_modules/`, `.venv/`, `out/`, or generated media.
- Never hand-edit `projects/*/build/props.json`; edit `storyboard.yaml` and rebuild.
- Use `--skip-render` and `vf still` before an expensive render.
- Verify facts and dates; keep a `facts.md` for history/true-crime work.
- Do not claim a Resolve grade was applied when only the LUT preview was rendered.

## Folder map

| Folder | Purpose |
|--------|---------|
| `bin/` | `vf` launcher |
| `python/videoforge/` | builder, TTS, maps, sound, CLI |
| `src/` | Remotion compositions and scene components |
| `src/scenes/` | reusable scene vocabulary |
| `voices/` | voice registry (samples are generated) |
| `references/` | scene and production docs |
| `public/` | committed runtime assets only (fonts, grain, maps) |
| `assets/` | LUT and US state data |
| `tools/` | finishing helpers |

## Finishing

DaVinci Resolve is a finishing stage, not the assembler.
Free Resolve 21.1+ has no Python API and no MCP; both are Studio-only.
See `RESOLVE.md`.
