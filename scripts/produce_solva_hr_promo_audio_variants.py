from __future__ import annotations

import asyncio
import math
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "marketing-video"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BASE_VIDEO = OUT_DIR / "solva-hr-facebook-promo-30s.mp4"
NARRATION_MP3 = OUT_DIR / "solva-hr-facebook-promo-voiceover.mp3"
MUSIC_WAV = OUT_DIR / "solva-hr-facebook-promo-music.wav"
MIX_WAV = OUT_DIR / "solva-hr-facebook-promo-mix.wav"
FINAL_FEED = OUT_DIR / "solva-hr-facebook-promo-30s-narrated.mp4"
FINAL_REEL = OUT_DIR / "solva-hr-facebook-reel-30s-narrated.mp4"
VOICE_SCRIPT = OUT_DIR / "solva-hr-facebook-promo-voiceover.txt"

FFMPEG = Path(imageio_ffmpeg.get_ffmpeg_exe())
VIDEO_SECONDS = 30.0
MUSIC_SECONDS = 30.65

VOICE_TEXT = (
    "Running HR and payroll should feel clear, not chaotic. Meet Solva HR. "
    "Create your organization in minutes, add your logo, choose your modules, and go live. "
    "Run payroll, approvals, employee self service, and HR documents from one premium workspace. "
    "Give employees a self service experience that actually feels modern. "
    "And when another business needs a better HR system, use Refer Another Company right inside Solva HR. "
    "Register today at solvahr dot co dot ke."
)


async def render_voiceover() -> None:
    communicate = edge_tts.Communicate(
        VOICE_TEXT,
        voice="en-KE-AsiliaNeural",
        rate="+8%",
    )
    await communicate.save(str(NARRATION_MP3))
    VOICE_SCRIPT.write_text(VOICE_TEXT, encoding="utf-8")


def ensure_base_video() -> None:
    if BASE_VIDEO.exists():
        return
    subprocess.run([sys.executable, str(ROOT / "scripts" / "generate_solva_hr_promo_video.py")], check=True)


def synthesize_music() -> None:
    sample_rate = 44_100
    t = np.linspace(0, MUSIC_SECONDS, int(sample_rate * MUSIC_SECONDS), endpoint=False)
    left = np.zeros_like(t)
    right = np.zeros_like(t)

    chords = [
        (0.0, 5.0, [220.0, 277.18, 329.63]),
        (5.0, 10.0, [246.94, 311.13, 369.99]),
        (10.0, 15.0, [196.0, 246.94, 293.66]),
        (15.0, 20.0, [220.0, 277.18, 329.63]),
        (20.0, 25.0, [174.61, 220.0, 261.63]),
        (25.0, 30.65, [196.0, 246.94, 293.66]),
    ]

    for start, end, freqs in chords:
        mask = (t >= start) & (t < end)
        if not np.any(mask):
            continue
        local_t = t[mask] - start
        dur = end - start
        env = np.sin(np.pi * np.clip(local_t / dur, 0, 1)) ** 0.9
        pad = sum(np.sin(2 * np.pi * freq * local_t + idx * 0.6) for idx, freq in enumerate(freqs)) / len(freqs)
        shimmer = 0.4 * np.sin(2 * np.pi * (freqs[-1] * 2) * local_t + 0.3)
        pulse = 0.35 * np.sin(2 * np.pi * 2 * local_t) * np.sin(2 * np.pi * freqs[0] * local_t)
        section = (0.72 * pad + 0.18 * shimmer + 0.10 * pulse) * env
        left[mask] += section * 0.55
        right[mask] += section * 0.48

    # soft top melody for lift
    melody_notes = [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33]
    note_len = MUSIC_SECONDS / len(melody_notes)
    for idx, freq in enumerate(melody_notes):
        start = idx * note_len
        end = start + note_len * 0.72
        mask = (t >= start) & (t < end)
        local_t = t[mask] - start
        env = np.sin(np.pi * np.clip(local_t / (end - start), 0, 1)) ** 1.4
        tone = np.sin(2 * np.pi * freq * local_t)
        left[mask] += tone * env * 0.06
        right[mask] += tone * env * 0.08

    audio = np.stack([left, right], axis=1)
    fade_in = np.clip(t / 2.0, 0, 1)
    fade_out = np.clip((MUSIC_SECONDS - t) / 2.2, 0, 1)
    audio *= (fade_in * fade_out)[:, None]
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767).astype(np.int16)

    with wave.open(str(MUSIC_WAV), "wb") as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())


def ffmpeg_run(args: list[str]) -> None:
    subprocess.run([str(FFMPEG), *args], check=True)


def build_mix() -> None:
    ffmpeg_run(
        [
            "-y",
            "-i",
            str(MUSIC_WAV),
            "-i",
            str(NARRATION_MP3),
            "-filter_complex",
            "[0:a]volume=0.16,afade=t=in:st=0:d=1.5,afade=t=out:st=27.8:d=2.2[m];"
            "[1:a]volume=1.7,highpass=f=120,lowpass=f=7000[v];"
            "[m][v]amix=inputs=2:duration=first:weights='1 1.8'[a]",
            "-map",
            "[a]",
            "-t",
            f"{VIDEO_SECONDS}",
            str(MIX_WAV),
        ]
    )


def mux_feed() -> None:
    ffmpeg_run(
        [
            "-y",
            "-i",
            str(BASE_VIDEO),
            "-i",
            str(MIX_WAV),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            str(FINAL_FEED),
        ]
    )


def make_reel() -> None:
    ffmpeg_run(
        [
            "-y",
            "-i",
            str(FINAL_FEED),
            "-filter_complex",
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,boxblur=28:6,crop=1080:1920[bg];"
            "[0:v]scale=1080:1350[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2",
            "-map",
            "0:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "copy",
            "-t",
            f"{VIDEO_SECONDS}",
            str(FINAL_REEL),
        ]
    )


def copy_downloads() -> None:
    downloads = Path("C:/Users/user/Downloads/solva-hr-facebook-video")
    downloads.mkdir(parents=True, exist_ok=True)
    for item in [FINAL_FEED, FINAL_REEL, VOICE_SCRIPT]:
        shutil.copy2(item, downloads / item.name)


def main() -> None:
    ensure_base_video()
    asyncio.run(render_voiceover())
    synthesize_music()
    build_mix()
    mux_feed()
    make_reel()
    copy_downloads()
    print(FINAL_FEED)
    print(FINAL_REEL)
    print(VOICE_SCRIPT)


if __name__ == "__main__":
    main()
