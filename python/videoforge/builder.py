"""Build a video from a storyboard: voice -> timing -> captions -> Remotion render."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import media, storyboard
from .tts import TTSError, clean_for_speech, load_env, synthesize
from .voices import ROOT, load_registry, resolve

PROJECTS = ROOT.parent / "projects"
PUBLIC = ROOT / "public"

MIN_SECONDS = {
    "title": 4.2,
    "chapter": 3.2,
    "statement": 3.8,
    "bullets": 4.2,
    "steps": 4.2,
    "compare": 4.6,
    "stat": 4.0,
    "chart": 5.0,
    "diagram": 5.0,
    "timeline": 5.0,
    "quote": 4.6,
    "image": 4.0,
    "code": 5.0,
    "recap": 4.2,
    "outro": 4.6,
}


@dataclass
class BuildOptions:
    voice: str | None = None
    force: bool = False
    skip_tts: bool = False
    skip_render: bool = False
    draft: bool = False
    concurrency: int = 2
    out: Path | None = None
    thumbnail: bool = True
    preview: bool = False
    quiet: bool = False


def log(message: str) -> None:
    print(message, flush=True)


def sfx_enabled(project: dict) -> bool:
    cfg = project.get("sfx")
    if cfg is None:
        return True
    if isinstance(cfg, bool):
        return cfg
    if isinstance(cfg, str):
        return cfg != "none"
    return bool(cfg.get("enabled", True)) and str(cfg.get("set", "soft")) != "none"


def ensure_soundpack() -> None:
    """Generate the local music/SFX pack on first use."""
    sfx = PUBLIC / "audio" / "sfx" / "whoosh.wav"
    music = PUBLIC / "audio" / "music" / "curious.wav"
    if sfx.exists() and music.exists():
        return
    try:
        from .sound import generate

        log("  audio  generating the local music + SFX pack (one time)…")
        generate(quiet=True)
    except Exception as exc:  # noqa: BLE001
        log(f"  warning: could not generate the sound pack: {exc}")


def find_chrome() -> str | None:
    candidates: list[Path] = []
    cache = Path.home() / "Library" / "Caches" / "ms-playwright"
    if cache.exists():
        candidates += sorted(cache.glob("chromium-*/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"))
        candidates += sorted(cache.glob("chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium"))
    candidates += [
        Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
    ]
    for path in candidates:
        if path.exists():
            return str(path)
    return None


def caption_chunks(text: str, max_chars: int = 68) -> list[str]:
    text = clean_for_speech(text)
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    pieces: list[str] = []
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) <= max_chars:
            pieces.append(sentence)
            continue
        clauses = re.split(r"(?<=[,;:])\s+", sentence)
        for clause in clauses:
            clause = clause.strip()
            if not clause:
                continue
            if len(clause) <= max_chars:
                pieces.append(clause)
            else:
                words = clause.split()
                current = ""
                for word in words:
                    if len(current) + len(word) + 1 > max_chars and current:
                        pieces.append(current)
                        current = word
                    else:
                        current = f"{current} {word}".strip()
                if current:
                    pieces.append(current)
    merged: list[str] = []
    for piece in pieces:
        short = len(piece.split()) < 3 or len(piece) <= 16
        if merged and short and len(merged[-1]) + len(piece) + 1 <= max_chars + 20:
            merged[-1] = f"{merged[-1]} {piece}"
        elif merged and len(merged[-1]) + len(piece) + 1 <= max_chars and not merged[-1].endswith((".", "?", "!")):
            merged[-1] = f"{merged[-1]} {piece}"
        else:
            merged.append(piece)
    return merged


def captions_for(text: str, start_frame: int, audio_frames: int) -> list[dict[str, Any]]:
    chunks = caption_chunks(text)
    if not chunks:
        return []
    weights = [max(6, len(c) + 4) for c in chunks]
    total = sum(weights)
    out = []
    cursor = 0.0
    for chunk, weight in zip(chunks, weights):
        share = audio_frames * (weight / total)
        start = start_frame + int(round(cursor))
        end = start_frame + int(round(cursor + share))
        cursor += share
        if end <= start:
            end = start + 1
        out.append({"text": chunk, "from": start, "to": end})
    out[-1]["to"] = start_frame + audio_frames
    return out


def hash_audio(text: str, profile: dict, speed: float) -> str:
    raw = f"{profile.get('engine')}|{profile.get('voice')}|{speed}|{text}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]


def link_or_copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        dst.unlink()
    try:
        os.link(src, dst)
    except OSError:
        shutil.copyfile(src, dst)


def copy_asset(src: Path, project_dir: Path, public_dir: Path, slug: str) -> str:
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", src.name)
    rel = f"projects/{slug}/assets/{name}"
    dst = public_dir / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or dst.stat().st_size != src.stat().st_size:
        shutil.copyfile(src, dst)
    return rel


def remotion_cmd(extra: list[str]) -> list[str]:
    return ["npx", "remotion", *extra]


def run_render(props_path: Path, out: Path, opts: BuildOptions, fps: int = 30, total_frames: int = 0) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = remotion_cmd(
        [
            "render",
            "src/index.ts",
            "Explainer",
            str(out),
            f"--props={props_path}",
            "--codec=h264",
            f"--concurrency={max(1, opts.concurrency)}",
            "--audio-codec=aac",
            "--audio-bitrate=192k",
            "--overwrite",
            "--log=info",
            f"--port={os.environ.get('VF_REMOTION_PORT', '3100')}",
        ]
    )
    if opts.draft or opts.preview:
        cmd.append("--crf=26")
    else:
        cmd.append(f"--video-bitrate={os.environ.get('VF_VIDEO_BITRATE', '9M')}")
    if opts.preview:
        frames = min(total_frames or 30 * fps, 30 * fps)
        cmd.append(f"--frames=0-{max(1, frames)}")
    if opts.draft or opts.preview:
        cmd.append("--scale=0.5")
    chrome = find_chrome()
    if chrome:
        cmd.append(f"--browser-executable={chrome}")
    log(f"\nRendering -> {out}")
    log(f"  {' '.join(cmd[:8])} ...\n")
    started = time.time()
    proc = subprocess.run(cmd, cwd=str(ROOT))
    if proc.returncode != 0:
        raise RuntimeError(f"Remotion render failed with exit code {proc.returncode}.")
    elapsed = time.time() - started
    size = out.stat().st_size / (1024 * 1024) if out.exists() else 0
    log(f"Render finished in {elapsed / 60:.1f} min ({size:.1f} MB)")


def render_still(props_path: Path, out: Path, frame: int) -> None:
    cmd = remotion_cmd(
        [
            "still",
            "src/index.ts",
            "Explainer",
            str(out),
            f"--props={props_path}",
            f"--frame={frame}",
            "--image-format=jpeg",
            "--overwrite",
            "--log=error",
        ]
    )
    chrome = find_chrome()
    if chrome:
        cmd.append(f"--browser-executable={chrome}")
    subprocess.run(cmd, cwd=str(ROOT), check=False)


def youtube_timestamp(seconds: float) -> str:
    seconds = max(0, int(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def build(storyboard_path: Path, opts: BuildOptions) -> dict[str, Any]:
    load_env()
    raw = storyboard.load(storyboard_path)
    project = storyboard.normalise(raw, opts.voice)
    slug = project["slug"]
    fps = project["fps"]
    project_dir = storyboard_path.parent if storyboard_path.parent.name == slug else PROJECTS / slug
    project_dir.mkdir(parents=True, exist_ok=True)
    build_dir = project_dir / "build"
    audio_dir = build_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    public_dir = PUBLIC
    public_audio = public_dir / "projects" / slug / "audio"
    public_audio.mkdir(parents=True, exist_ok=True)

    scenes = project["scenes"]
    log(f"\n{project['title']}")
    log(f"{len(scenes)} scenes · {fps} fps · {project['width']}x{project['height']} · theme {project['theme']}")

    # ---------------------------------------------------------------- voice + timing
    total_words = 0
    for i, scene in enumerate(scenes):
        narration = scene["narration"]
        voice_spec = scene["voice"] or project["voice"]
        profile = resolve(voice_spec)
        scene["profile"] = profile
        lead = 0.30 + (scene["transition"]["seconds"] if i > 0 else 0.0) + 0.20 + scene["pause_before"]
        if scene["type"] == "title":
            lead += 0.35
        tail = 0.60 + scene["pause_after"]
        audio_file = None
        audio_seconds = 0.0

        audio_override = scene.get("audio_path")
        if audio_override:
            src = Path(str(audio_override)).expanduser()
            if not src.is_absolute():
                src = (storyboard_path.parent / src).resolve()
            if not src.exists():
                raise SystemExit(f"Scene {scene['id']}: audio file not found: {src}")
            key = hashlib.sha1(f"{src}:{src.stat().st_mtime_ns}".encode()).hexdigest()[:8]
            cache = audio_dir / f"{scene['id']}-ext{key}.wav"
            if not cache.exists() or opts.force:
                log(f"  audio  {scene['id']:<4} recorded narration  ({src.name})")
                media.to_wav(src, cache)
            audio_seconds = media.duration(cache)
            audio_file = cache
            scene["profile"] = {"label": "Recorded audio", "engine": "file", "voice": "file"}
            total_words += storyboard.estimate_words(narration)
        elif narration:
            text = scene["tts_text"] or clean_for_speech(narration)
            total_words += storyboard.estimate_words(text)
            key = hash_audio(text, profile, scene["speed"])
            cache = audio_dir / f"{scene['id']}-{key}.wav"
            if opts.skip_tts and not cache.exists():
                raise RuntimeError(
                    f"Missing cached audio for scene {scene['id']} and --skip-tts was passed."
                )
            if not cache.exists() or opts.force:
                log(f"  voice  {scene['id']:<4} {profile['label']}  ({len(text)} chars)")
                tmp = cache.with_suffix(".tmp.wav")
                try:
                    synthesize(text, profile, tmp, speed=scene["speed"])
                except TTSError as exc:
                    raise SystemExit(f"\nTTS failed for scene {scene['id']}: {exc}") from exc
                tmp.replace(cache)
            audio_seconds = media.duration(cache)
            audio_file = cache
        else:
            total_words += 0

        if scene["duration"] is not None:
            seconds = float(scene["duration"])
        elif audio_file:
            seconds = lead + audio_seconds + tail
        else:
            seconds = MIN_SECONDS.get(scene["type"], 4.0)
        if audio_file:
            seconds = max(seconds, lead + audio_seconds + 0.25)
        seconds = max(seconds, MIN_SECONDS.get(scene["type"], 3.5), scene["min_duration"])
        seconds = min(seconds, max(2.0, scene["max_duration"]))
        frames = max(20, int(round(seconds * fps)))
        scene["frames"] = frames
        scene["seconds"] = frames / fps
        scene["audio_seconds"] = audio_seconds
        scene["audio_file"] = audio_file
        scene["lead"] = lead

    # Clamp transitions so they always fit inside both neighbouring scenes.
    for i, scene in enumerate(scenes):
        if i == 0:
            scene["transition"] = {"type": "none", "durationInFrames": 0, "seconds": 0.0}
            continue
        t = scene["transition"]
        limit = max(0, min(scenes[i - 1]["frames"] // 2, scene["frames"] // 2))
        t["durationInFrames"] = min(t["durationInFrames"], limit)
        t["seconds"] = t["durationInFrames"] / fps

    starts: list[int] = []
    cursor = 0
    for i, scene in enumerate(scenes):
        if i > 0:
            cursor -= scene["transition"]["durationInFrames"]
        starts.append(cursor)
        cursor += scene["frames"]
    total_frames = cursor

    # ---------------------------------------------------------------- captions + props
    props_scenes: list[dict[str, Any]] = []
    chapter_name = "Intro"
    for i, scene in enumerate(scenes):
        if scene["type"] == "chapter":
            chapter_name = str(scene["props"].get("title") or "Chapter")
        chapter = scene["chapter"] or chapter_name
        audio_src = None
        audio_start = 0
        captions: list[dict[str, Any]] = []
        if scene["audio_file"]:
            name = f"{scene['id']}-{scene['audio_file'].stem.split('-')[-1]}.wav"
            link_or_copy(scene["audio_file"], public_audio / name)
            audio_src = f"projects/{slug}/audio/{name}"
            audio_start = int(round(scene["lead"] * fps))
            if scene["captions"]:
                captions = captions_for(
                    scene["narration"],
                    audio_start,
                    int(round(scene["audio_seconds"] * fps)),
                )
                for c in captions:
                    c["to"] = min(c["to"], scene["frames"] - 1)
        props = dict(scene["props"])
        if scene["type"] in ("image", "map", "portrait"):
            for key in ("src", "image"):
                src = props.get(key)
                if isinstance(src, str) and not re.match(r"^(https?:|data:|/|projects/)", src):
                    local = (storyboard_path.parent / src).resolve()
                    if local.exists():
                        props[key] = copy_asset(local, project_dir, public_dir, slug)
        props_scenes.append(
            {
                "id": scene["id"],
                "type": scene["type"],
                "durationInFrames": scene["frames"],
                "startFrame": starts[i],
                "tone": scene["tone"],
                "backdrop": scene["backdrop"],
                "chapter": chapter,
                "chrome": scene["chrome"],
                "transition": {
                    "type": scene["transition"]["type"],
                    "durationInFrames": scene["transition"]["durationInFrames"],
                },
                "audio": {
                    "src": audio_src,
                    "startFrame": audio_start,
                    "durationInFrames": int(round(scene["audio_seconds"] * fps)),
                }
                if audio_src
                else None,
                "captions": captions,
                "props": props,
            }
        )
        scene["start"] = starts[i]
        scene["chapter_label"] = chapter

    music = project.get("music")
    music_props = None
    if music or sfx_enabled(project):
        ensure_soundpack()
    if music:
        if isinstance(music, str):
            music = {"path": music}
        mood = music.get("mood")
        if mood:
            rel = f"audio/music/{mood}.wav"
            if not (public_dir / rel).exists():
                raise SystemExit(
                    f"Music mood '{mood}' is not available. Run: ./bin/vf soundpack"
                )
            music_props = {
                "src": rel,
                "volume": float(music.get("volume", 0.5)),
                "duck": float(music.get("duck", 0.55)),
            }
        else:
            path = Path(str(music.get("path", "")))
            if not path.is_absolute():
                path = (storyboard_path.parent / path).resolve()
            if path.exists():
                rel = copy_asset(path, project_dir, public_dir, slug)
                music_props = {
                    "src": rel,
                    "volume": float(music.get("volume", 0.5)),
                    "duck": float(music.get("duck", 0.55)),
                }
            else:
                log(f"  warning: music not found at {path}")

    sfx_cfg = project.get("sfx")
    if sfx_cfg is None:
        sfx_cfg = {"enabled": True, "set": "soft", "volume": 0.6}
    elif isinstance(sfx_cfg, str):
        sfx_cfg = {"enabled": True, "set": sfx_cfg, "volume": 0.6}
    elif sfx_cfg is True:
        sfx_cfg = {"enabled": True, "set": "soft", "volume": 0.6}
    elif sfx_cfg is False:
        sfx_cfg = {"enabled": False}

    cues: list[dict[str, Any]] = []
    if sfx_cfg.get("enabled", True) and str(sfx_cfg.get("set", "soft")) != "none":
        sfx_vol = float(sfx_cfg.get("volume", 0.6))
        sfx_set = str(sfx_cfg.get("set", "soft"))
        for i, scene in enumerate(scenes):
            if i > 0 and scene["transition"]["durationInFrames"] > 0:
                cues.append(
                    {
                        "frame": starts[i],
                        "src": "audio/sfx/whoosh.wav",
                        "volume": round(0.55 * sfx_vol, 3),
                    }
                )
            if scene["type"] == "title":
                cues.append(
                    {
                        "frame": starts[i] + int(0.25 * fps),
                        "src": "audio/sfx/impact.wav",
                        "volume": round(0.75 * sfx_vol, 3),
                    }
                )
            if scene["type"] == "chapter":
                if sfx_set == "cinematic":
                    cues.append(
                        {
                            "frame": max(0, starts[i] - int(1.7 * fps)),
                            "src": "audio/sfx/riser.wav",
                            "volume": round(0.5 * sfx_vol, 3),
                        }
                    )
                cues.append(
                    {
                        "frame": starts[i],
                        "src": "audio/sfx/impact.wav",
                        "volume": round(0.55 * sfx_vol, 3),
                    }
                )
            if scene["type"] == "stat":
                cues.append(
                    {
                        "frame": starts[i] + int(round(scene["lead"] * fps)),
                        "src": "audio/sfx/pop.wav",
                        "volume": round(0.55 * sfx_vol, 3),
                    }
                )
            manual = scene.get("sfx")
            if isinstance(manual, list):
                for cue in manual:
                    if not isinstance(cue, dict):
                        continue
                    name = str(cue.get("name", "tick"))
                    cues.append(
                        {
                            "frame": starts[i] + int(float(cue.get("at", 0)) * fps),
                            "src": f"audio/sfx/{name}.wav",
                            "volume": round(float(cue.get("volume", 0.5)) * sfx_vol, 3),
                        }
                    )
        cues = [c for c in cues if 0 <= c["frame"] < total_frames - 2]

    props = {
        "meta": {
            "title": project["title"],
            "slug": slug,
            "fps": fps,
            "width": project["width"],
            "height": project["height"],
            "totalFrames": total_frames,
        },
        "theme": project["theme"],
        "brand": project["brand"],
        "captions": project["captions"],
        "transition": {
            "type": project["transition"]["type"],
            "durationInFrames": project["transition"]["durationInFrames"],
        },
        "music": music_props,
        "sfx": cues,
        "scenes": props_scenes,
    }
    props_path = build_dir / "props.json"
    props_path.write_text(json.dumps(props, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------------------------------------------------------------- sidecar files
    timeline = {
        "title": project["title"],
        "slug": slug,
        "fps": fps,
        "total_frames": total_frames,
        "duration_seconds": round(total_frames / fps, 2),
        "voices": sorted({s["profile"]["label"] for s in scenes}),
        "scenes": [
            {
                "id": s["id"],
                "type": s["type"],
                "chapter": s["chapter_label"],
                "start_frame": s["start"],
                "start": round(s["start"] / fps, 2),
                "duration": round(s["seconds"], 2),
                "narration": s["narration"],
                "voice": s["profile"]["label"],
            }
            for s in scenes
        ],
    }
    (build_dir / "timeline.json").write_text(json.dumps(timeline, indent=2, ensure_ascii=False), encoding="utf-8")

    write_script_md(build_dir / "script.md", project, scenes, fps)
    write_srt(build_dir / "captions.srt", props_scenes, fps)
    write_youtube(build_dir / "youtube.md", project, scenes, fps)

    est_minutes = total_frames / fps / 60
    log(
        f"\nTimeline: {int(est_minutes)}:{int(est_minutes * 60) % 60:02d} · "
        f"{total_frames} frames · ~{total_words} words ({total_words / max(0.1, est_minutes):.0f} wpm)"
    )
    log(f"Props:    {props_path}")

    if opts.skip_render:
        log("\nSkipped render (--skip-render). Preview with:")
        log(
            f"  cd {ROOT} && npx remotion studio src/index.ts --props={props_path}"
        )
        return {"props": props, "props_path": props_path, "timeline": timeline}

    suffix = ".preview" if opts.preview else ".draft" if opts.draft else ""
    out = opts.out or (project_dir / "out" / f"{slug}{suffix}.mp4")
    run_render(props_path, out, opts, fps=fps, total_frames=total_frames)

    if opts.thumbnail and not opts.draft and not opts.preview:
        title_scene = next((s for s in scenes if s["type"] == "title"), scenes[0])
        frame = title_scene["start"] + int(title_scene["frames"] * 0.72)
        thumb = (project_dir / "out" / "thumbnail.jpg")
        thumb_props = dict(props)
        thumb_props["captions"] = False
        thumb_props_path = build_dir / "props-thumbnail.json"
        thumb_props_path.write_text(json.dumps(thumb_props, ensure_ascii=False), encoding="utf-8")
        render_still(thumb_props_path, thumb, frame)
        thumb_props_path.unlink(missing_ok=True)
        if thumb.exists():
            log(f"Thumbnail: {thumb}")

    log(f"\nDone. Video: {out}")
    return {"props": props, "props_path": props_path, "out": out, "timeline": timeline}


def write_script_md(path: Path, project: dict, scenes: list[dict], fps: int) -> None:
    lines = [f"# {project['title']}", ""]
    lines.append(f"Voice: **{scenes[0]['profile']['label']}** · Theme: **{project['theme']}**")
    lines.append("")
    lines.append("| # | Scene | Type | Start | Length | Narration |")
    lines.append("|---|-------|------|-------|--------|-----------|")
    for i, scene in enumerate(scenes):
        start = scene["start"] / fps
        nar = scene["narration"].replace("|", "\\|").replace("\n", " ")
        lines.append(
            f"| {i + 1} | {scene['chapter_label']} | {scene['type']} | "
            f"{int(start // 60)}:{int(start % 60):02d} | {scene['seconds']:.1f}s | {nar} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_srt(path: Path, props_scenes: list[dict], fps: int) -> None:
    entries = []
    n = 0
    for scene in props_scenes:
        for cap in scene["captions"]:
            n += 1
            start = (scene["startFrame"] + cap["from"]) / fps
            end = (scene["startFrame"] + cap["to"]) / fps
            entries.append(f"{n}\n{media.srt_time(start)} --> {media.srt_time(end)}\n{cap['text']}\n")
    path.write_text("\n".join(entries), encoding="utf-8")


def write_youtube(path: Path, project: dict, scenes: list[dict], fps: int) -> None:
    chapters = []
    previous = None
    for scene in scenes:
        label = scene.get("chapter_label") or "Intro"
        if label != previous:
            chapters.append((scene["start"] / fps, label))
            previous = label
    if not chapters:
        chapters = [(0.0, "Intro")]
    seen = set()
    lines = []
    for seconds, label in chapters:
        stamp = youtube_timestamp(seconds)
        if stamp in seen:
            continue
        seen.add(stamp)
        lines.append(f"{stamp} {label}")
    hook = scenes[0]["narration"] or project["title"]
    body = project.get("description") or hook
    description = (
        f"{body.strip()}\n\n"
        "Chapters\n"
        + "\n".join(lines)
        + f"\n\n{project['brand']['name']} {project['brand'].get('handle') or ''}\n"
    )
    tags = project.get("tags") or sorted(
        {w.strip(".,!?:").lower() for w in project["title"].split() if len(w) > 4}
    )
    tags = [str(t) for t in tags]
    content = f"# YouTube package\n\n## Title\n{project['title']}\n\n## Description\n{description}\n## Tags\n{', '.join(tags)}\n"
    path.write_text(content, encoding="utf-8")
