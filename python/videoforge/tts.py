"""Text-to-speech engines: Kokoro (local), Edge (cloud), Gemini (cloud), macOS say."""
from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import struct
import time
import wave
from pathlib import Path

from .media import MediaError, concat_wavs, require, run, to_wav
from .voices import ROOT

KOKORO_MODEL = ROOT / "models" / "kokoro-v1.0.onnx"
KOKORO_VOICES = ROOT / "models" / "voices-v1.0.bin"

_KOKORO = None


class TTSError(RuntimeError):
    pass


def load_env() -> None:
    """Load GEMINI_API_KEY from the nearest .env without overriding the environment."""
    for candidate in (Path.cwd() / ".env", ROOT.parent / ".env", ROOT / ".env"):
        if not candidate.exists():
            continue
        for line in candidate.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def clean_for_speech(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"`(.*?)`", r"\1", text)
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_text(text: str, max_chars: int = 320) -> list[str]:
    """Split on sentence boundaries, then commas/words, keeping chunks under max_chars."""
    text = clean_for_speech(text)
    if len(text) <= max_chars:
        return [text] if text else []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if not sentence:
            continue
        if len(sentence) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            words = sentence.split()
            part = ""
            for word in words:
                if len(part) + len(word) + 1 > max_chars and part:
                    chunks.append(part)
                    part = word
                else:
                    part = f"{part} {word}".strip()
            if part:
                chunks.append(part)
        elif len(current) + len(sentence) + 1 > max_chars and current:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks


# --------------------------------------------------------------------------- kokoro


def _kokoro():
    global _KOKORO
    if _KOKORO is not None:
        return _KOKORO
    if not KOKORO_MODEL.exists() or not KOKORO_VOICES.exists():
        raise TTSError(
            "Kokoro model files are missing. Run: python -m videoforge setup --kokoro"
        )
    try:
        from kokoro_onnx import Kokoro
    except ImportError as exc:
        raise TTSError("kokoro-onnx is not installed. Run: pip install kokoro-onnx soundfile") from exc
    _KOKORO = Kokoro(str(KOKORO_MODEL), str(KOKORO_VOICES))
    return _KOKORO


def synth_kokoro(text: str, voice: str, speed: float, out: Path) -> Path:
    import numpy as np
    import soundfile as sf

    kokoro = _kokoro()
    parts: list[np.ndarray] = []
    sample_rate = 24000
    for chunk in chunk_text(text, 320):
        try:
            samples, sample_rate = kokoro.create(chunk, voice=voice, speed=speed, lang="en-us")
        except Exception as exc:  # noqa: BLE001
            raise TTSError(f"Kokoro failed on voice '{voice}': {exc}") from exc
        if samples is None or len(samples) == 0:
            continue
        chunk = np.asarray(samples, dtype=np.float32).copy()
        # micro-fades at every chunk edge prevent concatenation clicks
        fade = min(len(chunk) // 2, int(sample_rate * 0.008))
        if fade > 4:
            ramp = np.linspace(0.0, 1.0, fade, dtype=np.float32)
            chunk[:fade] *= ramp
            chunk[-fade:] *= ramp[::-1]
        parts.append(chunk)
        parts.append(np.zeros(int(sample_rate * 0.13), dtype=np.float32))
    if not parts:
        raise TTSError("Kokoro returned no audio.")
    audio = np.concatenate(parts)
    tmp = out.with_suffix(".raw.wav")
    sf.write(str(tmp), audio, sample_rate)
    to_wav(tmp, out)
    tmp.unlink(missing_ok=True)
    return out


# ----------------------------------------------------------------------------- edge


def synth_edge(text: str, voice: str, speed: float, out: Path, retries: int = 3) -> Path:
    try:
        import edge_tts
    except ImportError as exc:
        raise TTSError("edge-tts is not installed. Run: pip install edge-tts") from exc

    rate = f"{round((speed - 1) * 100):+d}%"
    mp3 = out.with_suffix(".mp3")

    async def _save() -> None:
        communicate = edge_tts.Communicate(clean_for_speech(text), voice, rate=rate)
        await communicate.save(str(mp3))

    last_error = None
    for attempt in range(retries):
        try:
            asyncio.run(_save())
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            mp3.unlink(missing_ok=True)
            time.sleep(1.2 * (attempt + 1))
    else:
        raise TTSError(f"Edge TTS failed for voice '{voice}': {last_error}")

    if not mp3.exists() or mp3.stat().st_size < 1000:
        raise TTSError(f"Edge TTS produced no audio for voice '{voice}'.")
    to_wav(mp3, out)
    mp3.unlink(missing_ok=True)
    return out


# --------------------------------------------------------------------------- gemini


def _pcm_to_wav(pcm: bytes, rate: int, bits: int, out: Path) -> Path:
    channels = 1
    width = max(1, bits // 8)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(pcm)
    return out


def synth_gemini(
    text: str,
    voice: str,
    speed: float,
    out: Path,
    model: str = "gemini-2.5-flash-preview-tts",
    style: str | None = None,
) -> Path:
    import requests

    load_env()
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        raise TTSError("GEMINI_API_KEY is not set (add it to .env at the workspace root).")

    chunks = chunk_text(text, 700)
    pcm = bytearray()
    rate, bits = 24000, 16
    for chunk in chunks:
        prompt = (f"{style}: {chunk}" if style else chunk)
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 1,
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}
                },
            },
        }
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": key},
            json=body,
            timeout=180,
        )
        if response.status_code != 200:
            try:
                message = response.json()["error"]["message"]
            except Exception:  # noqa: BLE001
                message = response.text[:400]
            if response.status_code == 402:
                raise TTSError(
                    "Gemini TTS is unavailable: the API key has no remaining prepayment credits. "
                    "Top up at https://ai.studio or use --voice with a Kokoro profile."
                )
            raise TTSError(f"Gemini TTS error {response.status_code}: {message}")
        data = response.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        audio = next((p["inlineData"]["data"] for p in parts if "inlineData" in p), None)
        if not audio:
            raise TTSError("Gemini TTS returned no audio data.")
        mime = next((p["inlineData"].get("mimeType", "") for p in parts if "inlineData" in p), "")
        m = re.search(r"rate=(\d+)", mime)
        if m:
            rate = int(m.group(1))
        m = re.search(r"L(\d+)", mime)
        if m:
            bits = int(m.group(1))
        pcm.extend(base64.b64decode(audio))

    raw = out.with_suffix(".pcm.wav")
    _pcm_to_wav(bytes(pcm), rate, bits, raw)
    to_wav(raw, out)
    raw.unlink(missing_ok=True)
    return out


# ------------------------------------------------------------------------------ say


def synth_say(text: str, voice: str, speed: float, out: Path) -> Path:
    require("say")
    aiff = out.with_suffix(".aiff")
    rate = max(90, int(175 * speed))
    run(["say", "-v", voice, "-r", str(rate), "-o", str(aiff), clean_for_speech(text)], capture=False)
    to_wav(aiff, out)
    aiff.unlink(missing_ok=True)
    return out


def synthesize(text: str, profile: dict, out: Path, speed: float | None = None) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    engine = profile["engine"]
    voice = str(profile["voice"])
    spd = float(speed if speed is not None else profile.get("speed", 1.0))
    if engine == "kokoro":
        return synth_kokoro(text, voice, spd, out)
    if engine == "edge":
        return synth_edge(text, voice, spd, out)
    if engine == "gemini":
        return synth_gemini(
            text, voice, spd, out, style=profile.get("style"), model=profile.get("model", "gemini-2.5-flash-preview-tts")
        )
    if engine == "say":
        return synth_say(text, voice, spd, out)
    raise TTSError(f"Unsupported TTS engine: {engine}")
