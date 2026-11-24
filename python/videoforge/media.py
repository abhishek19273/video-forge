"""ffmpeg / ffprobe helpers."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


class MediaError(RuntimeError):
    pass


def require(binary: str) -> str:
    path = shutil.which(binary)
    if not path:
        raise MediaError(f"'{binary}' is required but was not found on PATH.")
    return path


def run(cmd: list[str], capture: bool = True) -> str:
    proc = subprocess.run(cmd, capture_output=capture, text=True)
    if proc.returncode != 0:
        detail = (proc.stderr or "")[-1600:]
        raise MediaError(f"Command failed ({proc.returncode}): {' '.join(cmd[:4])}...\n{detail}")
    return proc.stdout if capture else ""


def duration(path: Path) -> float:
    out = run(
        [
            require("ffprobe"),
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
        ]
    )
    try:
        return float(json.loads(out)["format"]["duration"])
    except Exception as exc:  # noqa: BLE001
        raise MediaError(f"Could not read duration of {path}: {exc}") from exc


def to_wav(src: Path, dst: Path, loudness: bool = True) -> Path:
    """Convert any audio file to 48 kHz mono PCM, optionally loudness-normalised."""
    require("ffmpeg")
    filters = "aresample=48000"
    if loudness:
        filters = "loudnorm=I=-16:TP=-1.5:LRA=11," + filters
    filters += ",afade=t=in:st=0:d=0.008,areverse,afade=t=in:st=0:d=0.008,areverse"
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            require("ffmpeg"),
            "-y",
            "-v",
            "error",
            "-i",
            str(src),
            "-af",
            filters,
            "-ac",
            "1",
            "-ar",
            "48000",
            "-c:a",
            "pcm_s16le",
            str(dst),
        ]
    )
    return dst


def to_mp3(src: Path, dst: Path, bitrate: str = "192k") -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            require("ffmpeg"),
            "-y",
            "-v",
            "error",
            "-i",
            str(src),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            bitrate,
            str(dst),
        ]
    )
    return dst


def concat_wavs(files: list[Path], dst: Path, gap: float = 0.12) -> Path:
    """Concatenate mono 48k WAVs with a short gap. Used for chunked TTS."""
    import wave

    dst.parent.mkdir(parents=True, exist_ok=True)
    if not files:
        raise MediaError("No audio chunks to concatenate.")
    with wave.open(str(dst), "wb") as out:
        params = None
        for i, f in enumerate(files):
            with wave.open(str(f), "rb") as w:
                if params is None:
                    params = w.getparams()
                    out.setnchannels(params.nchannels)
                    out.setsampwidth(params.sampwidth)
                    out.setframerate(params.framerate)
                out.writeframes(w.readframes(w.getnframes()))
                if gap > 0 and i < len(files) - 1:
                    frames = int(params.framerate * gap)
                    out.writeframes(b"\x00\x00" * frames * params.nchannels)
    return dst


def srt_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms == 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
