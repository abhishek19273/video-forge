"""Generate a voice audition pack: audio samples + an HTML player."""
from __future__ import annotations

import html
import json
import shutil
from pathlib import Path

from . import media
from .tts import TTSError, synthesize
from .voices import ROOT, load_registry

DEFAULT_OUT = ROOT / "voices"


def generate(
    out_dir: Path = DEFAULT_OUT,
    engines: list[str] | None = None,
    force: bool = False,
    quiet: bool = False,
) -> dict:
    registry = load_registry()
    profiles = registry.get("profiles", {})
    script = registry.get(
        "script",
        "Here's the thing about light. It travels in waves, and every colour has its own wavelength.",
    )
    out_dir = out_dir.resolve()
    samples_dir = out_dir / "samples"
    samples_dir.mkdir(parents=True, exist_ok=True)
    allowed = set(engines) if engines else None

    manifest = {"script": script, "samples": [], "unavailable": []}
    for key, profile in profiles.items():
        engine = profile.get("engine", "kokoro")
        if allowed and engine not in allowed:
            continue
        target = samples_dir / f"{key}.mp3"
        label = profile.get("label", key)
        if target.exists() and not force:
            duration = media.duration(target)
            if not quiet:
                print(f"  skip   {key:<22} (cached)")
            manifest["samples"].append(_entry(key, profile, target, duration))
            continue
        if not quiet:
            print(f"  voice  {key:<22} {label}")
        try:
            wav = synthesize(script, profile, samples_dir / f"{key}.wav")
            media.to_mp3(wav, target)
            wav.unlink(missing_ok=True)
            duration = media.duration(target)
            manifest["samples"].append(_entry(key, profile, target, duration))
        except Exception as exc:  # noqa: BLE001
            if not quiet:
                print(f"  fail   {key:<22} {str(exc)[:160]}")
            manifest["unavailable"].append({"id": key, "engine": engine, "reason": str(exc)[:300]})

    manifest["samples"].sort(key=lambda s: (not s["recommended"], s["engine"], s["label"]))
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    write_audition(out_dir, manifest, registry)
    write_readme(out_dir, manifest)
    return manifest


def _entry(key: str, profile: dict, path: Path, duration: float) -> dict:
    return {
        "id": key,
        "label": profile.get("label", key),
        "engine": profile.get("engine", "kokoro"),
        "voice": profile.get("voice", ""),
        "gender": profile.get("gender", ""),
        "accent": profile.get("accent", ""),
        "tags": profile.get("tags", []),
        "commercial": profile.get("commercial", "check-license"),
        "note": profile.get("note", ""),
        "duration": round(duration, 2),
        "file": f"samples/{path.name}",
        "recommended": key in ("warm-female", "edge-warm-male"),
    }


def write_audition(out_dir: Path, manifest: dict, registry: dict) -> None:
    samples = manifest["samples"]
    engines = sorted({s["engine"] for s in samples})
    tags = sorted({t for s in samples for t in s["tags"]})
    cards = "\n".join(_card(s) for s in samples)
    unavailable = ""
    if manifest["unavailable"]:
        items = "".join(
            f"<li><code>{html.escape(u['id'])}</code> — {html.escape(u['reason'])}</li>"
            for u in manifest["unavailable"]
        )
        unavailable = f"<details class='unavailable'><summary>{len(manifest['unavailable'])} voices unavailable</summary><ul>{items}</ul></details>"

    engine_chips = "".join(
        f"<button class='chip' data-filter='engine:{e}'>{html.escape(e)}</button>" for e in engines
    )
    tag_chips = "".join(
        f"<button class='chip' data-filter='tag:{html.escape(t)}'>{html.escape(t)}</button>" for t in tags
    )

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Video Forge — Voice Lab</title>
<style>
  :root {{ color-scheme: dark; }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: #080b12; color: #f3ece0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; }}
  .wrap {{ max-width: 1180px; margin: 0 auto; padding: 56px 28px 90px; }}
  h1 {{ font-family: "Iowan Old Style", Georgia, serif; font-size: 54px; font-weight: 400; letter-spacing: -0.02em; margin: 0 0 12px; }}
  .lede {{ color: #a9b1c1; font-size: 17px; line-height: 1.6; max-width: 780px; margin: 0 0 10px; }}
  .lede code {{ background: #141b28; padding: 2px 7px; border-radius: 5px; color: #ffc97a; font-size: 14px; }}
  .chips {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 26px 0 30px; }}
  .chip {{ background: transparent; color: #c9d2e2; border: 1px solid #263144; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-size: 13px; letter-spacing: 0.03em; }}
  .chip:hover {{ border-color: #46587a; }}
  .chip.active {{ background: #ffc97a; color: #1b1206; border-color: #ffc97a; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }}
  .card {{ background: #0d1320; border: 1px solid #1e2839; border-radius: 18px; padding: 20px 20px 16px; display: flex; flex-direction: column; gap: 12px; }}
  .card.playing {{ border-color: #ffc97a; box-shadow: 0 0 0 1px #ffc97a33, 0 18px 50px #0006; }}
  .card.rec {{ border-color: #2f4a3a; }}
  .top {{ display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }}
  .label {{ font-size: 17px; font-weight: 600; line-height: 1.35; }}
  .badge {{ font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8ea0bb; border: 1px solid #263144; border-radius: 999px; padding: 4px 9px; white-space: nowrap; }}
  .badge.rec {{ color: #ffc97a; border-color: #5c4a24; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 6px; font-size: 12px; color: #8b97ab; letter-spacing: 0.04em; text-transform: uppercase; }}
  .meta span {{ background: #121a2a; border-radius: 5px; padding: 3px 7px; }}
  audio {{ width: 100%; height: 36px; }}
  .bottom {{ display: flex; justify-content: space-between; align-items: center; gap: 10px; }}
  code.id {{ font-size: 12px; color: #ffc97a; background: #171f14; padding: 5px 8px; border-radius: 6px; }}
  .copy {{ background: transparent; border: 1px solid #2a3648; color: #cbd5e5; border-radius: 8px; padding: 7px 11px; font-size: 12px; cursor: pointer; }}
  .copy:hover {{ border-color: #ffc97a; color: #ffc97a; }}
  .note {{ font-size: 13px; color: #8b97ab; line-height: 1.5; }}
  .warn {{ color: #f0a6a6; }}
  .unavailable {{ margin-top: 36px; color: #8b97ab; font-size: 13px; }}
  .unavailable summary {{ cursor: pointer; }}
  footer {{ margin-top: 54px; border-top: 1px solid #1a2333; padding-top: 22px; color: #7d8798; font-size: 13px; line-height: 1.7; }}
  .filtered {{ display: none !important; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="badge" style="display:inline-block;margin-bottom:18px">Video Forge · Voice Lab</div>
  <h1>Choose your narrator.</h1>
  <p class="lede">Every voice reads the same paragraph. Listen for warmth, pacing and clarity — then build with
  <code>vf build storyboard.yaml --voice &lt;id&gt;</code>. Voice ids are printed on each card.</p>
  <p class="lede">Recommended for explainers: <strong>warm-female</strong> (fully local, commercial-clean) and
  <strong>edge-warm-male</strong> (most natural, check Microsoft's terms for monetised use).</p>

  <div class="chips">
    <button class="chip active" data-filter="all">All</button>
    {engine_chips}
    {tag_chips}
  </div>

  <div class="grid" id="grid">
    {cards}
  </div>
  {unavailable}

  <footer>
    Sample text: “{html.escape(manifest['script'])}”<br>
    Generated by Video Forge — Kokoro (Apache-2.0), Microsoft Edge neural voices, and Gemini TTS.
    Commercial notes are guidance, not legal advice.
  </footer>
</div>
<script>
  const cards = [...document.querySelectorAll('.card')];
  const chips = [...document.querySelectorAll('.chip')];
  let activeFilter = 'all';
  chips.forEach(chip => chip.addEventListener('click', () => {{
    const f = chip.dataset.filter;
    activeFilter = activeFilter === f ? 'all' : f;
    chips.forEach(c => c.classList.toggle('active', c.dataset.filter === activeFilter || (activeFilter === 'all' && c.dataset.filter === 'all')));
    cards.forEach(card => {{
      let show = activeFilter === 'all';
      if (!show) {{
        const [kind, value] = activeFilter.split(':');
        show = kind === 'engine' ? card.dataset.engine === value : (card.dataset.tags || '').split(' ').includes(value);
      }}
      card.classList.toggle('filtered', !show);
    }});
  }}));
  document.querySelectorAll('audio').forEach(a => {{
    a.addEventListener('play', () => {{
      document.querySelectorAll('audio').forEach(other => {{ if (other !== a) other.pause(); }});
      cards.forEach(c => c.classList.remove('playing'));
      a.closest('.card').classList.add('playing');
    }});
    a.addEventListener('ended', () => a.closest('.card').classList.remove('playing'));
  }});
  document.querySelectorAll('.copy').forEach(btn => btn.addEventListener('click', async () => {{
    const id = btn.dataset.id;
    try {{ await navigator.clipboard.writeText(id); btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy id', 1400); }}
    catch {{ btn.textContent = id; }}
  }}));
</script>
</body>
</html>
"""
    (out_dir / "audition.html").write_text(page, encoding="utf-8")


def _card(s: dict) -> str:
    tags = " ".join(s["tags"])
    commercial = (
        '<span class="note">Commercial: clean</span>'
        if s["commercial"] == "clean"
        else '<span class="note warn">Commercial: check voice licence</span>'
    )
    rec = '<span class="badge rec">Recommended</span>' if s["recommended"] else f'<span class="badge">{html.escape(s["engine"])}</span>'
    return f"""
    <div class="card{' rec' if s['recommended'] else ''}" data-engine="{html.escape(s['engine'])}" data-tags="{html.escape(tags)}">
      <div class="top">
        <div class="label">{html.escape(s['label'])}</div>
        {rec}
      </div>
      <div class="meta">
        <span>{html.escape(s['gender'] or 'voice')}</span>
        <span>{html.escape(s['accent'] or 'EN')}</span>
        <span>{s['duration']:.1f}s</span>
      </div>
      <audio controls preload="none" src="{html.escape(s['file'])}"></audio>
      <div class="bottom">
        <code class="id">{html.escape(s['id'])}</code>
        <button class="copy" data-id="{html.escape(s['id'])}">Copy id</button>
      </div>
      {commercial}
      {f'<div class="note">{html.escape(s["note"])}</div>' if s.get('note') else ''}
    </div>"""


def write_readme(out_dir: Path, manifest: dict) -> None:
    rows = "\n".join(
        f"| `{s['id']}` | {s['label']} | {s['engine']} | {s['duration']:.1f}s | {s['commercial']} |"
        for s in manifest["samples"]
    )
    text = f"""# Voice Lab

Open `audition.html` in a browser and listen. Pick an id, then:

```bash
vf build projects/my-video/storyboard.yaml --voice warm-female
```

| ID | Voice | Engine | Length | Commercial |
|----|-------|--------|--------|------------|
{rows}

Set the chosen id as `voice:` in the storyboard to make it the default.

Samples are generated from: “{manifest['script']}”
"""
    (out_dir / "README.md").write_text(text, encoding="utf-8")
