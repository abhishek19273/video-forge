"""Generate a royalty-free music and SFX pack with numpy.

The music is intentionally simple: warm pads, a soft bass and a sparse pluck
arpeggio. At -26 LUFS under narration it reads as production value, not a song.
Everything is synthesised from scratch, so there are no licensing questions.
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np

from .media import require, run

SR = 48000
PUBLIC_AUDIO = Path(__file__).resolve().parents[2] / "public" / "audio"


def midi(note: int) -> float:
    return 440.0 * (2 ** ((note - 69) / 12))


def adsr(n: int, attack: float, decay: float, sustain: float, release: float) -> np.ndarray:
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    r = max(1, int(release * SR))
    s = max(0.0, n - a - d - r)
    env = np.concatenate(
        [
            np.linspace(0, 1, a, endpoint=False),
            np.linspace(1, sustain, d, endpoint=False),
            np.full(int(s), sustain),
            np.linspace(sustain, 0, r),
        ]
    )
    if len(env) < n:
        env = np.concatenate([env, np.zeros(n - len(env))])
    return env[:n]


def tone(
    freq: float,
    seconds: float,
    amp: float = 0.1,
    harmonics: tuple[float, ...] = (1.0, 0.4, 0.18),
    attack: float = 0.4,
    release: float = 0.8,
    detune: float = 0.0,
    vibrato: float = 0.0,
    seed: int = 0,
) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    vib = 1 + vibrato * np.sin(2 * math.pi * 4.5 * t + rng.random() * 6)
    sig = np.zeros(n)
    for i, h in enumerate(harmonics, start=1):
        phase = rng.random() * math.tau
        sig += h * np.sin(math.tau * freq * i * (1 + detune) * t * vib + phase)
    env = adsr(n, attack, 0.2, 0.72, release)
    return amp * sig * env


def place(buf: np.ndarray, sig: np.ndarray, start: float) -> None:
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


MOODS = {
    "curious": {
        "bpm": 76,
        "chords": [
            ([57, 60, 64], 45),   # Am
            ([53, 57, 60], 41),   # F
            ([48, 52, 55], 36),   # C
            ([55, 59, 62], 43),   # G
        ],
        "pad": 0.11,
        "bass": 0.12,
        "pluck": 0.075,
        "shimmer": 0.02,
        "arp": [0, 2, 1, 2],
    },
    "cinematic": {
        "bpm": 58,
        "chords": [
            ([50, 53, 57], 38),   # Dm
            ([46, 50, 53], 34),   # Bb
            ([53, 57, 60], 41),   # F
            ([48, 52, 55], 36),   # C
        ],
        "pad": 0.14,
        "bass": 0.16,
        "pluck": 0.035,
        "shimmer": 0.028,
        "arp": [0, 3, 1, 2],
    },
    "playful": {
        "bpm": 96,
        "chords": [
            ([48, 52, 55], 36),   # C
            ([55, 59, 62], 43),   # G
            ([57, 60, 64], 45),   # Am
            ([53, 57, 60], 41),   # F
        ],
        "pad": 0.065,
        "bass": 0.1,
        "pluck": 0.095,
        "shimmer": 0.015,
        "arp": [0, 1, 2, 3],
    },
}


def make_music(mood: str, out: Path, cycles: int = 3) -> Path:
    cfg = MOODS.get(mood, MOODS["curious"])
    beat = 60.0 / cfg["bpm"]
    bar = beat * 4
    cycle = bar * len(cfg["chords"])
    seconds = cycle * cycles
    buf = np.zeros(int(seconds * SR) + SR * 4)
    rng = np.random.default_rng(7)

    for c in range(cycles):
        for i, (chord, bass) in enumerate(cfg["chords"]):
            start = c * cycle + i * bar
            # pad
            for k, note in enumerate(chord + [chord[0] + 12]):
                for det in (-0.0018, 0.0018):
                    place(
                        buf,
                        tone(
                            midi(note),
                            bar * 1.15,
                            amp=cfg["pad"] / (len(chord) + 1),
                            attack=bar * 0.28,
                            release=bar * 0.45,
                            detune=det,
                            seed=int(start * 10 + note + k),
                        ),
                        start,
                    )
            # bass
            place(
                buf,
                tone(
                    midi(bass),
                    bar * 0.92,
                    amp=cfg["bass"],
                    harmonics=(1.0, 0.25),
                    attack=0.06,
                    release=bar * 0.3,
                ),
                start,
            )
            # pluck arpeggio, 8th notes
            pattern = cfg["arp"]
            step = beat / 2
            for j in range(8):
                note = chord[pattern[j % len(pattern)] % len(chord)] + (12 if j % 4 == 3 else 0)
                place(
                    buf,
                    tone(
                        midi(note),
                        step * 1.8,
                        amp=cfg["pluck"] * (0.85 if j % 2 == 0 else 0.6),
                        harmonics=(1.0, 0.35, 0.12),
                        attack=0.008,
                        release=step * 1.4,
                        seed=int(j + start),
                    ),
                    start + j * step,
                )
            # shimmer
            if i % 2 == 0:
                place(
                    buf,
                    tone(
                        midi(chord[-1] + 24),
                        bar * 1.4,
                        amp=cfg["shimmer"],
                        harmonics=(1.0, 0.1),
                        attack=bar * 0.5,
                        release=bar * 0.8,
                        seed=int(start + 99),
                    ),
                    start,
                )
            # air
            n = int(bar * SR)
            air = rng.normal(0, 1, n) * 0.004
            place(buf, air * adsr(n, 1.0, 0.2, 0.6, 1.2), start)

    audio = buf[: int(seconds * SR)]
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = audio / peak * 0.72
    fade = int(0.04 * SR)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)

    tmp = out.with_suffix(".raw.wav")
    write_wav(tmp, audio)
    out.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            require("ffmpeg"),
            "-y",
            "-v",
            "error",
            "-i",
            str(tmp),
            "-af",
            "lowpass=f=4200,highpass=f=45,aecho=0.75:0.6:70|130:0.22|0.14,extrastereo=m=1.4,loudnorm=I=-24:TP=-6:LRA=9",
            "-ar",
            str(SR),
            "-ac",
            "2",
            "-c:a",
            "pcm_s16le",
            str(out),
        ]
    )
    tmp.unlink(missing_ok=True)
    return out


def write_wav(path: Path, audio: np.ndarray) -> None:
    import wave

    peak = float(np.max(np.abs(audio))) or 1.0
    data = np.clip(audio / peak * 0.92, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def make_sfx(out: Path) -> dict[str, Path]:
    out.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(13)
    files: dict[str, Path] = {}

    # whoosh — filtered noise sweep
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    env = np.sin(np.pi * np.clip(t / 0.55, 0, 1)) ** 2
    whoosh = noise * env * 0.55
    whoosh += 0.12 * np.sin(math.tau * (220 + 680 * t) * t) * env
    files["whoosh"] = _post(whoosh, out / "whoosh.wav", "highpass=f=350,lowpass=f=6500,aecho=0.6:0.4:35:0.2")

    # pop — short pitch-up blip
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    freq = 420 + 520 * t
    pop = np.sin(math.tau * freq * t) * np.exp(-t * 26) * 0.7
    pop += rng.normal(0, 0.03, n) * np.exp(-t * 60)
    files["pop"] = _post(pop, out / "pop.wav", "highpass=f=120")

    # tick — tiny UI click
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    tick = (np.sin(math.tau * 2400 * t) * 0.4 + rng.normal(0, 0.15, n)) * np.exp(-t * 90)
    files["tick"] = _post(tick, out / "tick.wav", "highpass=f=900")

    # impact — low thump
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    thump = np.sin(math.tau * (58 - 18 * t) * t) * np.exp(-t * 6) * 0.9
    thump += rng.normal(0, 0.08, n) * np.exp(-t * 12)
    files["impact"] = _post(thump, out / "impact.wav", "lowpass=f=220")

    # riser — 2.5s tension builder
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    riser = rng.normal(0, 1, n) * (t / 2.5) ** 2.2 * 0.35
    riser += np.sin(math.tau * (140 + 520 * (t / 2.5) ** 2) * t) * (t / 2.5) ** 2 * 0.16
    files["riser"] = _post(riser, out / "riser.wav", "highpass=f=250,lowpass=f=9000")

    return files


def _post(audio: np.ndarray, out: Path, filters: str) -> Path:
    tmp = out.with_suffix(".raw.wav")
    write_wav(tmp, audio)
    run(
        [
            require("ffmpeg"),
            "-y",
            "-v",
            "error",
            "-i",
            str(tmp),
            "-af",
            filters,
            "-ar",
            str(SR),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(out),
        ]
    )
    tmp.unlink(missing_ok=True)
    return out


def generate(force: bool = False, quiet: bool = False) -> dict[str, list[str]]:
    music_dir = PUBLIC_AUDIO / "music"
    sfx_dir = PUBLIC_AUDIO / "sfx"
    music_dir.mkdir(parents=True, exist_ok=True)
    sfx_dir.mkdir(parents=True, exist_ok=True)
    made = {"music": [], "sfx": []}
    for mood in MOODS:
        path = music_dir / f"{mood}.wav"
        if force or not path.exists():
            if not quiet:
                print(f"  music  {mood}")
            make_music(mood, path)
            made["music"].append(str(path))
        elif not quiet:
            print(f"  skip   {mood}")
    for name, path in make_sfx(sfx_dir / "_tmp").items():
        target = sfx_dir / f"{name}.wav"
        if force or not target.exists():
            if path != target:
                path.replace(target)
            if not quiet:
                print(f"  sfx    {name}")
            made["sfx"].append(str(target))
        else:
            path.unlink(missing_ok=True)
    (sfx_dir / "_tmp").rmdir()
    write_audition()
    return made


MOOD_NOTES = {
    "curious": "Warm plucks, gentle motion. The default for explainers.",
    "cinematic": "Slow pads and deep bass. Use for serious or dramatic episodes.",
    "playful": "Brighter and faster. Good for younger audiences and shorts.",
}


def write_audition() -> Path:
    """A tiny local mixer page for auditioning generated beds and SFX."""
    import html

    from . import media

    music_dir = PUBLIC_AUDIO / "music"
    sfx_dir = PUBLIC_AUDIO / "sfx"
    music_cards = []
    for mood, note in MOOD_NOTES.items():
        path = music_dir / f"{mood}.wav"
        if not path.exists():
            continue
        dur = media.duration(path)
        music_cards.append(
            f"""<div class="card">
              <div class="top"><div class="label">{mood.title()}</div><span class="badge">music · {dur:.0f}s</span></div>
              <p class="note">{html.escape(note)}</p>
              <audio controls preload="none" src="music/{mood}.wav"></audio>
              <code>music: {{ mood: {mood}, volume: 0.5, duck: 0.55 }}</code>
            </div>"""
        )
    sfx_cards = []
    for name in ("whoosh", "pop", "tick", "impact", "riser"):
        path = sfx_dir / f"{name}.wav"
        if not path.exists():
            continue
        dur = media.duration(path)
        sfx_cards.append(
            f"""<div class="card small">
              <div class="top"><div class="label">{name.title()}</div><span class="badge">{dur:.2f}s</span></div>
              <audio controls preload="none" src="sfx/{name}.wav"></audio>
            </div>"""
        )
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Video Forge — Sound Pack</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 0; background: #080b12; color: #f3ece0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; }}
  .wrap {{ max-width: 1100px; margin: 0 auto; padding: 56px 28px 90px; }}
  h1 {{ font-family: "Iowan Old Style", Georgia, serif; font-weight: 400; font-size: 52px; letter-spacing: -0.02em; margin: 0 0 12px; }}
  h2 {{ font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #8ea0bb; margin: 44px 0 14px; }}
  p.lede {{ color: #a9b1c1; line-height: 1.65; max-width: 760px; font-size: 17px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }}
  .card {{ background: #0d1320; border: 1px solid #1e2839; border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }}
  .card.small {{ padding: 16px; }}
  .top {{ display: flex; justify-content: space-between; align-items: center; gap: 10px; }}
  .label {{ font-size: 18px; font-weight: 600; }}
  .badge {{ font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #8ea0bb; border: 1px solid #263144; border-radius: 999px; padding: 4px 9px; }}
  .note {{ color: #8b97ab; font-size: 14px; line-height: 1.5; margin: 0; }}
  audio {{ width: 100%; height: 34px; }}
  code {{ font-size: 12px; color: #ffc97a; background: #171f14; padding: 8px 10px; border-radius: 7px; overflow-x: auto; }}
  footer {{ margin-top: 50px; border-top: 1px solid #1a2333; padding-top: 20px; color: #7d8798; font-size: 13px; line-height: 1.7; }}
</style></head><body><div class="wrap">
  <div class="badge" style="display:inline-block;margin-bottom:18px">Video Forge · Sound Pack</div>
  <h1>Music that stays out of the way.</h1>
  <p class="lede">Three ambient beds and five transition effects, synthesised locally with numpy and FFmpeg. No samples, no licensing, no attribution. The builder ducks every bed under narration and places SFX automatically.</p>
  <h2>Music beds</h2>
  <div class="grid">{''.join(music_cards)}</div>
  <h2>Sound effects</h2>
  <div class="grid">{''.join(sfx_cards)}</div>
  <footer>
    Regenerate with <code>vf soundpack --force</code>. Add to a storyboard with
    <code>music: {{ mood: curious, volume: 0.5 }}</code> and <code>sfx: {{ set: soft }}</code>.<br>
    Custom licensed music: <code>music: {{ path: assets/bed.mp3, volume: 0.45 }}</code>.
  </footer>
</div></body></html>"""
    target = PUBLIC_AUDIO / "soundpack.html"
    target.write_text(page, encoding="utf-8")
    return target
