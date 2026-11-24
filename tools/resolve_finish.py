#!/usr/bin/env python3
"""Create a Resolve Studio project/timeline and queue a render.

Requires DaVinci Resolve Studio (free 21.1+ has no Python API) and Resolve running.

    export RESOLVE_SCRIPT_LIB="/Applications/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"
    export RESOLVE_SCRIPT_API="/Applications/DaVinci Resolve.app/Contents/Resources/Developer/Scripting"
    export PYTHONPATH="$RESOLVE_SCRIPT_API/Modules"
    python3 video-forge/tools/resolve_finish.py --clip master.mp4 --project "Video Forge" --out out/
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path


def connect():
    api = os.environ.get("RESOLVE_SCRIPT_API")
    lib = os.environ.get("RESOLVE_SCRIPT_LIB")
    if api and api not in sys.path:
        sys.path.insert(0, str(Path(api) / "Modules"))
    if lib:
        os.environ.setdefault("RESOLVE_SCRIPT_LIB", lib)
    try:
        import DaVinciResolveScript as dvr  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"Could not import DaVinciResolveScript: {exc}") from exc
    resolve = dvr.scriptapp("Resolve")
    if not resolve:
        raise SystemExit(
            "Resolve API unavailable. The free edition has no Python API in 21.1+; "
            "use Resolve Studio, enable scripting, and keep Resolve running."
        )
    return resolve


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clip", required=True, help="Master MP4/ProRes to import")
    ap.add_argument("--project", default="Video Forge — Finish")
    ap.add_argument("--out", required=True, help="Render output directory")
    ap.add_argument("--name", default=None, help="Render filename")
    args = ap.parse_args()

    clip = Path(args.clip).resolve()
    out = Path(args.out).resolve()
    if not clip.exists():
        raise SystemExit(f"Clip not found: {clip}")
    out.mkdir(parents=True, exist_ok=True)

    resolve = connect()
    pm = resolve.GetProjectManager()
    project = pm.CreateProject(args.project)
    if not project:
        project = pm.LoadProject(args.project)
    if not project:
        raise SystemExit("Could not create or load project.")

    pool = project.GetMediaPool()
    items = pool.ImportMedia([str(clip)])
    if not items:
        raise SystemExit("Resolve could not import the clip.")
    timeline = pool.CreateTimelineFromClips("Master", items)
    if not timeline:
        raise SystemExit("Could not create timeline.")
    project.SetCurrentTimeline(timeline)

    project.SetCurrentRenderFormatAndCodec("mp4", "H264")
    project.SetRenderSettings({
        "SelectAllFrames": True,
        "TargetDir": str(out),
        "CustomName": args.name or clip.stem,
        "VideoQuality": "High",
    })
    job = project.AddRenderJob()
    if not job:
        raise SystemExit("Could not queue render job.")
    project.StartRendering()
    while project.GetRenderJobStatus(job).get("JobStatus") not in ("Complete", "Failed"):
        time.sleep(2)
    print("render:", project.GetRenderJobStatus(job))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
