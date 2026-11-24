"""Storyboard loading, validation and normalisation."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

SCENE_TYPES = {
    "title",
    "chapter",
    "statement",
    "bullets",
    "steps",
    "compare",
    "stat",
    "chart",
    "diagram",
    "timeline",
    "quote",
    "image",
    "code",
    "recap",
    "outro",
    "map",
    "flight",
    "portrait",
    "evidence",
}

# Keys that control the pipeline. Everything else becomes scene "props".
RESERVED = {
    "type",
    "id",
    "narration",
    "tts_text",
    "tone",
    "backdrop",
    "transition",
    "chapter",
    "duration",
    "min_duration",
    "max_duration",
    "pause_before",
    "pause_after",
    "voice",
    "speed",
    "captions",
    "props",
    "audio",
    "chrome",
    "sfx",
}

TYPE_RULES = {
    "title": ("title",),
    "chapter": ("title",),
    "statement": ("text",),
    "bullets": ("title", "items"),
    "steps": ("title", "steps"),
    "compare": ("left", "right"),
    "stat": ("value", "label"),
    "chart": ("data",),
    "diagram": ("nodes",),
    "timeline": ("events",),
    "quote": ("text", "author"),
    "image": ("src",),
    "code": ("code",),
    "recap": ("items",),
    "outro": ("title",),
    "map": ("points",),
    "flight": ("title",),
    "portrait": ("name", "image"),
    "evidence": ("items",),
}


class StoryboardError(ValueError):
    pass


def load(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise StoryboardError(f"Storyboard not found: {path}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise StoryboardError("Storyboard must be a YAML mapping at the top level.")
    return raw


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "video"


def estimate_words(text: str) -> int:
    return len(re.findall(r"\b[\w'’-]+\b", text or ""))


def normalise(raw: dict[str, Any], voice_override: str | None = None) -> dict[str, Any]:
    defaults = raw.get("defaults") or {}
    title = str(raw.get("title") or "Untitled video")
    slug = str(raw.get("slug") or slugify(title))
    theme = str(raw.get("theme") or "paper")
    if theme not in ("paper", "midnight"):
        raise StoryboardError(f"theme must be 'paper' or 'midnight', got {theme!r}")
    brand = raw.get("brand") or {}
    if not brand.get("name"):
        brand["name"] = "Your Channel"
    fps = int(raw.get("fps") or 30)
    width, height = (raw.get("resolution") or [1920, 1080])[:2]

    transition_default = _norm_transition(
        raw.get("transition") or defaults.get("transition") or "fade", fps
    )
    voice = voice_override or raw.get("voice") or defaults.get("voice") or "warm-female"
    speed = float(raw.get("speed") or defaults.get("speed") or 1.0)
    captions = bool(raw.get("captions", True))

    scenes_raw = raw.get("scenes")
    if not isinstance(scenes_raw, list) or not scenes_raw:
        raise StoryboardError("No scenes found. Add a 'scenes:' list to the storyboard.")

    scenes: list[dict[str, Any]] = []
    for i, item in enumerate(scenes_raw):
        if not isinstance(item, dict):
            raise StoryboardError(f"Scene {i + 1} must be a mapping.")
        stype = item.get("type")
        if stype not in SCENE_TYPES:
            raise StoryboardError(
                f"Scene {i + 1}: unknown type {stype!r}. Available: {', '.join(sorted(SCENE_TYPES))}"
            )
        props = dict(item.get("props") or {})
        for k, v in item.items():
            if k not in RESERVED and k != "props":
                props[k] = v
        for req in TYPE_RULES.get(stype, ()):
            if req not in props or props[req] in (None, "", []):
                raise StoryboardError(f"Scene {i + 1} ({stype}) is missing required field: {req}")
        narration = str(item.get("narration") or "").strip()
        duration = item.get("duration")
        if duration is None and not narration and not item.get("audio"):
            duration = defaults.get("hold", 4.0)
        if duration is None and not narration:
            duration = 4.0
        scene = {
            "index": i,
            "id": str(item.get("id") or f"s{i + 1:02d}"),
            "type": stype,
            "narration": narration,
            "audio_path": item.get("audio"),
            "sfx": item.get("sfx"),
            "tts_text": str(item.get("tts_text") or "").strip(),
            "tone": item.get("tone") or defaults.get("tone") or "light",
            "backdrop": item.get("backdrop"),
            "chapter": item.get("chapter"),
            "chrome": item.get("chrome"),
            "transition": _norm_transition(
                item.get("transition") or transition_default, fps, is_default=True
            )
            if i > 0
            else {"type": "none", "durationInFrames": 0, "seconds": 0.0},
            "duration": float(duration) if duration is not None else None,
            "min_duration": float(item.get("min_duration") or 0),
            "max_duration": float(item.get("max_duration") or 90),
            "pause_before": float(item.get("pause_before") or 0),
            "pause_after": float(item.get("pause_after") or defaults.get("pause_after") or 0),
            "voice": item.get("voice"),
            "speed": float(item.get("speed") or speed),
            "captions": bool(item.get("captions", captions)),
            "props": props,
        }
        scenes.append(scene)

    return {
        "title": title,
        "slug": slug,
        "theme": theme,
        "brand": {"name": str(brand.get("name")), "handle": brand.get("handle")},
        "fps": fps,
        "width": int(width),
        "height": int(height),
        "voice": voice,
        "speed": speed,
        "captions": captions,
        "transition": transition_default,
        "scenes": scenes,
        "description": raw.get("description"),
        "tags": raw.get("tags") or [],
        "music": raw.get("music"),
        "sfx": raw.get("sfx"),
    }


def _norm_transition(value: Any, fps: int, is_default: bool = False) -> dict[str, Any]:
    if isinstance(value, dict) and "durationInFrames" in value:
        return dict(value)
    if value is None:
        value = "fade"
    if isinstance(value, str):
        name, seconds = value, (0.5 if not is_default else 0.45)
    elif isinstance(value, dict):
        name = value.get("type") or "fade"
        seconds = float(value.get("duration", 0.45))
    else:
        raise StoryboardError(f"Invalid transition: {value!r}")
    return {
        "type": str(name),
        "seconds": seconds,
        "durationInFrames": max(1, int(round(seconds * fps))) if name != "none" else 0,
    }
