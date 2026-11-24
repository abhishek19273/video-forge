# DaVinci Resolve finishing

Resolve is the **finishing stage**, not the assembly tool.

```
Blender / Gemini / Remotion  →  master MP4 or ProRes  →  Resolve  →  grade + mix + deliver
```

## Installed version

- App: `/Applications/DaVinci Resolve.app`
- Free edition.
- **Resolve 21.1+ moved Python scripting to Studio.**
- **MCP integration is Studio-only.** The free app does not expose an MCP server.

So on this machine:

- **Free:** manual grading only.
- **Studio:** Python API and MCP are available.

## Free-Resolve workflow

1. Open Resolve → **New Project** → `Video Forge — Cooper 60s`.
2. Import `../projects/<slug>/out/<slug>.mp4`.
3. Drop it on a 1920×1080 / 30 fps timeline.
4. **Color page** → LUT → `video-forge/assets/luts/videoforge_noir.cube` → intensity 0.5–0.7.
5. Balance: lift shadows slightly teal, warm the highlights, add a soft vignette; keep skin/clouds neutral.
6. **Fairlight:** confirm dialogue around −18 LUFS integrated; music under the voice; no clipping.
7. **Deliver:** H.264, 1080p, 30 fps, 16:9, 256 kbps audio.

The LUT is a starting point, not a finished grade. It is deliberately subtle.

## Studio automation

If you upgrade to Resolve Studio, the Python API can create the project, import the master, build a timeline and queue a render.

```bash
export RESOLVE_SCRIPT_LIB="/Applications/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"
export RESOLVE_SCRIPT_API="/Applications/DaVinci Resolve.app/Contents/Resources/Developer/Scripting"
export PYTHONPATH="$RESOLVE_SCRIPT_API/Modules"

python3 video-forge/tools/resolve_finish.py \
  --clip ../projects/<slug>/out/<slug>.mp4 \
  --project "Video Forge — Cooper 60s" \
  --out ../projects/<slug>/out
```

Notes:

- Resolve must be running.
- Free edition: `scriptapp("Resolve")` returns `None`.
- Studio only: scripting preference must be enabled in Resolve preferences.
- The script builds the timeline and queues a render; the **grade is still a creative step**.

## What not to do

- Do not use Resolve as the assembly engine for 100+ generated shots.
- Do not use EffectCraft while it is alpha.
- Do not claim a Resolve grade was applied when only the LUT preview was rendered.
