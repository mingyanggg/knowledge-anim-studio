#!/usr/bin/env python3
"""
Edge TTS Narration Generator

Generates Chinese narration audio using Microsoft Edge TTS (free, no API key needed).
Maps narration styles to appropriate voice roles.
"""

import asyncio
import edge_tts
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# Voice mapping: narration_style -> (voice_id, description)
# Full voice list: edge-tts --list-voices | grep zh-CN
VOICE_MAP = {
    "classroom": {
        "voice": "zh-CN-YunxiNeural",       # 男声，沉稳教学
        "rate": "-5%",                        # 稍慢，适合教学
        "pitch": "-2Hz",
    },
    "popular-science": {
        "voice": "zh-CN-XiaoxiaoNeural",     # 女声，亲切活泼
        "rate": "+5%",
        "pitch": "+1Hz",
    },
    "academic": {
        "voice": "zh-CN-YunjianNeural",      # 男声，专业权威
        "rate": "-10%",                       # 慢速，严谨
        "pitch": "-3Hz",
    },
    "fun-animation": {
        "voice": "zh-CN-XiaoyiNeural",       # 女声，年轻活泼
        "rate": "+10%",
        "pitch": "+3Hz",
    },
    "minimal-tech": {
        "voice": "zh-CN-YunzeNeural",        # 男声，简洁专业
        "rate": "0%",
        "pitch": "0Hz",
    },
    "storytelling": {
        "voice": "zh-CN-YunyangNeural",      # 男声，温暖叙事
        "rate": "-5%",
        "pitch": "-1Hz",
    },
}

DEFAULT_VOICE_CONFIG = {
    "voice": "zh-CN-XiaoxiaoNeural",
    "rate": "0%",
    "pitch": "0Hz",
}

# Max characters per chunk (Edge TTS has limits)
MAX_CHUNK_CHARS = 2000


def _split_text_chunks(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    """Split text into chunks at sentence boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    sentences = re.split(r'(?<=[。！？\n])', text)
    current = ""

    for sentence in sentences:
        if not sentence.strip():
            continue
        if len(current) + len(sentence) <= max_chars:
            current += sentence
        else:
            if current:
                chunks.append(current)
            current = sentence

    if current:
        chunks.append(current)

    return chunks if chunks else [text]


async def _generate_audio_chunk(text: str, output_path: Path, voice: str, rate: str, pitch: str) -> None:
    """Generate audio for a single text chunk."""
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(str(output_path))


async def _merge_audio_files(audio_files: list[Path], output_path: Path) -> None:
    """Merge multiple audio files into one using edge_tts (no ffmpeg needed for simple concat)."""
    if len(audio_files) == 1:
        import shutil
        shutil.copy2(str(audio_files[0]), str(output_path))
        return

    # Use ffmpeg for merging (available on macOS)
    import subprocess
    list_file = output_path.parent / "ffmpeg_list.txt"
    try:
        with open(list_file, "w") as f:
            for af in audio_files:
                f.write(f"file '{af}'\n")

        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", str(list_file), "-c", "copy", str(output_path)],
            capture_output=True, check=True, timeout=60
        )
    finally:
        if list_file.exists():
            list_file.unlink()


def generate_narration(
    text: str,
    output_path: str,
    narration_style: str = "classroom",
) -> dict:
    """
    Generate narration audio from text.

    Args:
        text: The narration text to speak
        output_path: Where to save the audio file (.mp3)
        narration_style: One of the defined narration styles

    Returns:
        dict with success, output_path, duration, error keys
    """
    import time
    import tempfile
    start_time = time.time()

    try:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        voice_config = VOICE_MAP.get(narration_style, DEFAULT_VOICE_CONFIG)
        voice = voice_config["voice"]
        rate = voice_config["rate"]
        pitch = voice_config["pitch"]

        logger.info(f"Generating narration with voice={voice}, style={narration_style}")
        logger.info(f"Text length: {len(text)} chars")

        chunks = _split_text_chunks(text)
        logger.info(f"Split into {len(chunks)} chunks")

        if len(chunks) == 1:
            # Single chunk — generate directly
            asyncio.run(_generate_audio_chunk(chunks[0], output, voice, rate, pitch))
        else:
            # Multiple chunks — generate each, then merge
            temp_files = []
            for i, chunk in enumerate(chunks):
                temp_file = output.parent / f"temp_narration_{i}.mp3"
                asyncio.run(_generate_audio_chunk(chunk, temp_file, voice, rate, pitch))
                temp_files.append(temp_file)

            asyncio.run(_merge_audio_files(temp_files, output))

            # Cleanup temp files
            for tf in temp_files:
                tf.unlink(missing_ok=True)

        duration = time.time() - start_time

        if not output.exists():
            return {
                "success": False,
                "error": "Audio file was not created",
                "duration": duration,
            }

        file_size = output.stat().st_size
        logger.info(f"Narration generated: {output} ({file_size} bytes, {duration:.2f}s)")

        return {
            "success": True,
            "output_path": str(output),
            "file_size": file_size,
            "duration": duration,
        }

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "duration": time.time() - start_time,
        }


def merge_audio_with_video(
    video_path: str,
    audio_path: str,
    output_path: str,
) -> dict:
    """
    Merge audio narration with video using ffmpeg.

    Args:
        video_path: Path to the video file
        audio_path: Path to the audio file
        output_path: Path for the merged output video

    Returns:
        dict with success, output_path, error keys
    """
    import time
    import subprocess
    start_time = time.time()

    try:
        video = Path(video_path)
        audio = Path(audio_path)
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        if not video.exists():
            return {"success": False, "error": f"Video not found: {video_path}"}
        if not audio.exists():
            return {"success": False, "error": f"Audio not found: {audio_path}"}

        # Merge: overlay audio on video, extend audio if shorter, loop if needed
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video),
            "-i", str(audio),
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-map", "0:v:0",
            "-map", "1:a:0",
            str(output),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            logger.error(f"ffmpeg failed: {result.stderr[-500:]}")
            return {
                "success": False,
                "error": f"ffmpeg failed: {result.stderr[-200:]}",
                "duration": time.time() - start_time,
            }

        duration = time.time() - start_time
        logger.info(f"Merged audio+video: {output} ({duration:.2f}s)")

        return {
            "success": True,
            "output_path": str(output),
            "duration": duration,
        }

    except Exception as e:
        logger.error(f"Audio merge failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "duration": time.time() - start_time,
        }


if __name__ == "__main__":
    import json
    import argparse

    parser = argparse.ArgumentParser(description="Generate narration audio")
    parser.add_argument("text", help="Text to narrate")
    parser.add_argument("-o", "--output", default="output.mp3", help="Output audio file")
    parser.add_argument("-s", "--style", default="classroom", help="Narration style")

    args = parser.parse_args()
    result = generate_narration(args.text, args.output, args.style)
    print(json.dumps(result, indent=2, ensure_ascii=False))
