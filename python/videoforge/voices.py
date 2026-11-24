"""Voice profile resolution."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY_PATH = ROOT / "voices" / "registry.json"


def load_registry() -> dict:
    if not REGISTRY_PATH.exists():
        return {"default": "warm-female", "profiles": {}}
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def resolve(spec: str | None) -> dict:
    """Resolve a profile id ('warm-female') or an explicit engine:voice spec."""
    registry = load_registry()
    profiles = registry.get("profiles", {})
    spec = (spec or registry.get("default") or "warm-female").strip()

    if spec in profiles:
        return {"id": spec, **profiles[spec]}

    if ":" in spec:
        engine, voice = spec.split(":", 1)
        engine = engine.lower().strip()
        if engine not in ("kokoro", "edge", "gemini", "say"):
            raise ValueError(f"Unknown TTS engine '{engine}'. Use kokoro, edge, gemini or say.")
        return {
            "id": spec,
            "label": f"{voice} ({engine})",
            "engine": engine,
            "voice": voice.strip(),
            "speed": 1.0,
            "gender": "",
            "accent": "",
            "tags": [],
            "commercial": "check-license" if engine == "edge" else "clean",
        }

    # Bare Kokoro voice id, e.g. "af_heart"
    return {
        "id": spec,
        "label": spec,
        "engine": "kokoro",
        "voice": spec,
        "speed": 1.0,
        "gender": "",
        "accent": "",
        "tags": [],
        "commercial": "clean",
    }
