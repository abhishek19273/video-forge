"""Video Forge command line."""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from . import media, storyboard
from .builder import PROJECTS, BuildOptions, build, find_chrome, log, render_still
from .tts import KOKORO_MODEL, KOKORO_VOICES, load_env
from .voices import ROOT, load_registry

KOKORO_URLS = {
    KOKORO_MODEL: "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
    KOKORO_VOICES: "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
}


def cmd_build(args: argparse.Namespace) -> int:
    path = Path(args.storyboard).expanduser()
    if path.is_dir():
        path = path / "storyboard.yaml"
    path = path.resolve()
    opts = BuildOptions(
        voice=args.voice,
        force=args.force,
        skip_tts=args.skip_tts,
        skip_render=args.skip_render,
        draft=args.draft,
        concurrency=args.concurrency,
        out=Path(args.out).expanduser().resolve() if args.out else None,
        thumbnail=not args.no_thumbnail,
        preview=args.preview,
    )
    build(path, opts)
    return 0


def cmd_voices(args: argparse.Namespace) -> int:
    from .voicelab import DEFAULT_OUT, generate

    engines = [e.strip() for e in args.engines.split(",")] if args.engines else None
    manifest = generate(
        out_dir=Path(args.out) if args.out else DEFAULT_OUT,
        engines=engines,
        force=args.force,
    )
    log(f"\n{len(manifest['samples'])} samples ready.")
    log(f"Open: {Path(args.out or DEFAULT_OUT) / 'audition.html'}")
    if manifest["unavailable"]:
        log(f"{len(manifest['unavailable'])} voices were unavailable (see manifest.json).")
    return 0


SAMPLE_STORYBOARD = """\
# Video Forge storyboard — edit freely, then run:
#   ../bin/vf build storyboard.yaml
title: "{title}"
slug: "{slug}"
theme: paper
fps: 30
resolution: [1920, 1080]
voice: warm-female
captions: true
transition: {{ type: fade, duration: 0.45 }}

brand:
  name: "Your Channel"
  handle: "@yourchannel"

scenes:
  - type: title
    tone: dark
    backdrop: sunset
    kicker: "Episode 01"
    title: "A question worth {title_words} minutes"
    subtitle: "The one idea that changes how you see it."
    season: "Episode 01"
    narration: >
      Some questions look simple, until you look closely. Today we are going to
      take one of them apart, piece by piece, and rebuild it.

  - type: statement
    tone: light
    kicker: "Start here"
    text: "The answer is hidden in **one small detail** most of us never notice."
    narration: >
      The answer is hidden in one small detail that most of us never notice.

  - type: bullets
    tone: light
    kicker: "Three things to know"
    title: "What is really going on"
    items:
      - title: "First idea"
        detail: "One clear sentence that explains it."
      - title: "Second idea"
        detail: "A concrete example the viewer can picture."
      - title: "Third idea"
        detail: "The consequence that makes it matter."
    narration: >
      There are three things to know. First, the basic mechanism. Second, a
      concrete example. And third, why it matters to you.

  - type: outro
    tone: dark
    backdrop: aurora
    kicker: "That's the idea"
    title: "Now you know."
    subtitle: "If this changed how you see it, subscribe for the next one."
    pills: ["Subscribe", "Next episode"]
    narration: >
      That is the idea. If it changed how you see things, subscribe — there is
      another one waiting for you.
"""


def cmd_new(args: argparse.Namespace) -> int:
    title = args.title or args.slug.replace("-", " ").title()
    slug = storyboard.slugify(args.slug)
    project = PROJECTS / slug
    if project.exists() and not args.force:
        log(f"Project already exists: {project} (use --force to overwrite storyboard.yaml)")
        return 1
    project.mkdir(parents=True, exist_ok=True)
    story = SAMPLE_STORYBOARD.format(title=title, slug=slug, title_words="three")
    (project / "storyboard.yaml").write_text(story, encoding="utf-8")
    log(f"Created {project / 'storyboard.yaml'}")
    log(f"Next: bin/vf build {project / 'storyboard.yaml'}")
    return 0


def _project_for(path_arg: str) -> Path:
    path = Path(path_arg).expanduser()
    if path.is_dir():
        path = path / "storyboard.yaml"
    return path.resolve()


def cmd_still(args: argparse.Namespace) -> int:
    import json

    story = _project_for(args.storyboard)
    project_dir = story.parent
    props_path = project_dir / "build" / "props.json"
    if not props_path.exists():
        log(f"No build found at {props_path}. Run: bin/vf build {story} --skip-render")
        return 1
    props = json.loads(props_path.read_text(encoding="utf-8"))
    scenes = props["scenes"]
    if args.scene < 1 or args.scene > len(scenes):
        log(f"Scene must be between 1 and {len(scenes)}.")
        return 1
    scene = scenes[args.scene - 1]
    frame = int(scene["startFrame"] + scene["durationInFrames"] * max(0.0, min(1.0, args.at)))
    out = Path(args.out).expanduser() if args.out else project_dir / "out" / f"still-{args.scene:02d}.jpg"
    log(f"Scene {args.scene} ({scene['type']}) · frame {frame} -> {out}")
    render_still(props_path, out, frame)
    return 0 if out.exists() else 1


def cmd_soundpack(args: argparse.Namespace) -> int:
    from .sound import generate

    made = generate(force=args.force)
    log(f"\nMusic: {len(made['music'])} generated · SFX: {len(made['sfx'])} generated")
    log(f"Location: {ROOT / 'public' / 'audio'}")
    log("Use in a storyboard:  music: { mood: curious, volume: 0.5 }")
    return 0


def cmd_thumbnail(args: argparse.Namespace) -> int:
    import json

    story = _project_for(args.storyboard)
    project_dir = story.parent
    props_path = project_dir / "build" / "props.json"
    if not props_path.exists():
        log(f"No build found at {props_path}. Run: bin/vf build {story} --skip-render")
        return 1
    props = json.loads(props_path.read_text(encoding="utf-8"))
    scenes = props["scenes"]
    title = next((s for s in scenes if s["type"] == "title"), scenes[0])
    frame = int(title["startFrame"] + title["durationInFrames"] * 0.72)
    props["captions"] = False
    tmp = project_dir / "build" / "props-thumbnail.json"
    tmp.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    out = project_dir / "out" / "thumbnail.jpg"
    log(f"Thumbnail frame {frame} -> {out}")
    render_still(tmp, out, frame)
    tmp.unlink(missing_ok=True)
    return 0 if out.exists() else 1


def cmd_chrome(args: argparse.Namespace) -> int:
    chrome = find_chrome()
    log(chrome or "No local Chromium found; Remotion will download one.")
    return 0 if chrome else 1


def cmd_list(args: argparse.Namespace) -> int:
    registry = load_registry()
    profiles = registry.get("profiles", {})
    if not profiles:
        log("No voice profiles found.")
        return 1
    log(f"{'ID':<24} {'ENGINE':<8} {'VOICE':<40} LABEL")
    for key, p in profiles.items():
        log(f"{key:<24} {p.get('engine',''):<8} {p.get('voice',''):<40} {p.get('label','')}")
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    ok = True

    def check(label: str, passed: bool, detail: str = "") -> None:
        nonlocal ok
        mark = "ok  " if passed else "FAIL"
        log(f"  [{mark}] {label}{(' — ' + detail) if detail else ''}")
        ok = ok and passed

    log("Video Forge environment\n")
    check("ffmpeg", shutil.which("ffmpeg") is not None, shutil.which("ffmpeg") or "")
    check("ffprobe", shutil.which("ffprobe") is not None)
    check("node", shutil.which("node") is not None, subprocess.run(["node", "-v"], capture_output=True, text=True).stdout.strip() if shutil.which("node") else "")
    check("remotion", (ROOT / "node_modules" / "remotion").exists())
    check("@remotion/cli", (ROOT / "node_modules" / "@remotion" / "cli").exists())
    check("chromium", find_chrome() is not None, find_chrome() or "Remotion will download one")
    check("kokoro model", KOKORO_MODEL.exists(), f"{KOKORO_MODEL.stat().st_size / 1e6:.0f} MB" if KOKORO_MODEL.exists() else "run: vf setup")
    check("kokoro voices", KOKORO_VOICES.exists())
    load_env()
    import os

    check("GEMINI_API_KEY", bool(os.environ.get("GEMINI_API_KEY")), "set (TTS may still need billing credits)" if os.environ.get("GEMINI_API_KEY") else "not set - local voices still work")
    check("fonts", (ROOT / "public" / "fonts" / "Inter.ttf").exists())
    check("storyboard schema", (ROOT / "storyboard.schema.json").exists())
    check("music pack", (ROOT / "public" / "audio" / "music" / "curious.wav").exists(), "run: vf soundpack")
    check("sfx pack", (ROOT / "public" / "audio" / "sfx" / "whoosh.wav").exists(), "run: vf soundpack")
    log("")
    log("Ready." if ok else "Some checks failed; see messages above.")
    return 0 if ok else 1


def cmd_setup(args: argparse.Namespace) -> int:
    log("Video Forge setup\n")
    missing = [p for p in KOKORO_URLS if not p.exists()]
    if missing and not args.skip_kokoro:
        log("Downloading Kokoro TTS model (~330 MB, one time)...")
        for path in missing:
            url = KOKORO_URLS[path]
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(path.suffix + ".part")

            def hook(count: int, block: int, total: int) -> None:
                if total:
                    pct = min(100, count * block * 100 / total)
                    print(f"\r  {path.name}: {pct:5.1f}%", end="", flush=True)

            urllib.request.urlretrieve(url, tmp, reporthook=hook)
            tmp.replace(path)
            print()
        log("Model downloaded.")
    else:
        log("Kokoro model already present.")

    if not args.skip_kokoro:
        from .sound import generate

        log("\nGenerating music and SFX (idempotent)...")
        generate(quiet=args.quiet)

    log("\nChecking tools...")
    return cmd_check(args)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="vf",
        description="Video Forge — storyboard-driven animated explainer videos.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("build", help="Generate voiceover, timing, captions and render the video.")
    p.add_argument("storyboard", help="Path to storyboard.yaml (or its folder).")
    p.add_argument("--voice", "-v", help="Voice profile id (see: vf voices) or engine:voice.")
    p.add_argument("--force", action="store_true", help="Re-synthesise audio even if cached.")
    p.add_argument("--skip-tts", action="store_true", help="Use cached audio only.")
    p.add_argument("--skip-render", action="store_true", help="Build props and audio but do not render.")
    p.add_argument("--draft", action="store_true", help="Half resolution, faster render.")
    p.add_argument("--concurrency", type=int, default=2, help="Remotion render workers (default 2).")
    p.add_argument("--out", help="Output MP4 path.")
    p.add_argument("--no-thumbnail", action="store_true", help="Skip the YouTube thumbnail still.")
    p.add_argument("--preview", action="store_true", help="Render only the first 30s at half resolution.")
    p.set_defaults(func=cmd_build)

    p = sub.add_parser("voices", help="Generate voice samples + audition.html.")
    p.add_argument("--out", help="Output folder (default: voices/).")
    p.add_argument("--engines", help="Comma separated: kokoro,edge,gemini,say")
    p.add_argument("--force", action="store_true", help="Regenerate existing samples.")
    p.set_defaults(func=cmd_voices)

    p = sub.add_parser("new", help="Create a starter project.")
    p.add_argument("slug")
    p.add_argument("--title")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_new)

    p = sub.add_parser("still", help="Render a single frame from a built project for review.")
    p.add_argument("storyboard", help="Path to storyboard.yaml (or its folder).")
    p.add_argument("--scene", type=int, default=1, help="Scene number, 1-based.")
    p.add_argument("--at", type=float, default=0.6, help="Point inside the scene, 0..1 (default 0.6).")
    p.add_argument("--out", help="Output image path.")
    p.set_defaults(func=cmd_still)

    p = sub.add_parser("soundpack", help="Generate the royalty-free music + SFX pack.")
    p.add_argument("--force", action="store_true", help="Regenerate existing files.")
    p.set_defaults(func=cmd_soundpack)

    p = sub.add_parser("thumbnail", help="Re-render the YouTube thumbnail from the title scene.")
    p.add_argument("storyboard", help="Path to storyboard.yaml (or its folder).")
    p.set_defaults(func=cmd_thumbnail)

    p = sub.add_parser("chrome", help="Print the Chromium path used for rendering.")
    p.set_defaults(func=cmd_chrome)

    p = sub.add_parser("list-voices", help="List voice profiles.")
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("check", help="Verify the local toolchain.")
    p.set_defaults(func=cmd_check)

    p = sub.add_parser("setup", help="Download models and verify tools.")
    p.add_argument("--skip-kokoro", action="store_true")
    p.add_argument("--quiet", action="store_true")
    p.set_defaults(func=cmd_setup)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 130
    except (storyboard.StoryboardError, media.MediaError) as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
