"""Prepare Isa's supplied assets, sequentially. Requires Pillow and FFmpeg.

This is an explicit authoring command, never a build/start hook. Originals stay intact.
First run --review; inspect its contact sheet before choosing the video ranges.
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/isa-bot"
WORK = ROOT / "tmp/isa-review"
SIZE = (256, 288)


def run(command: list[str]) -> None:
    subprocess.run(command, check=True, timeout=60)


def remove_background(image: Image.Image) -> Image.Image:
    """Remove only near-white connected to the outside, preserving interior highlights."""
    image = image.convert("RGBA")
    rgb = image.convert("RGB")
    mask = Image.new("L", image.size)
    mask.putdata([255 if min(p) > 225 and max(p) - min(p) < 28 else 0
                  for p in (rgb.get_flattened_data() if hasattr(rgb, "get_flattened_data") else rgb.getdata())])
    w, h = image.size
    for x, y in ([(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
                 + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]):
        if mask.getpixel((x, y)) == 255:
            ImageDraw.floodfill(mask, (x, y), 128)
    alpha = mask.point(lambda p: 0 if p == 128 else 255)
    # Subpixel antialiasing, not a global white-color key (which erases gray hair).
    image.putalpha(alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.4)))
    return image


def review(ffmpeg: str) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
         "-threads", "1", "-i", str(SOURCE / "isa-video.mp4"),
         "-vf", "fps=2,scale=480:-2", "-filter_threads", "1", "-frames:v", "20",
         str(WORK / "review-%02d.png")])
    sheet = Image.new("RGB", (960, 5 * 300), "#243448")
    for n, path in enumerate(sorted(WORK.glob("review-*.png"))):
        with Image.open(path) as im:
            im.thumbnail((240, 270))
            x, y = n % 4 * 240, n // 4 * 300
            sheet.paste(im, (x, y))
            ImageDraw.Draw(sheet).text((x + 4, y + 274), f"{n / 2:.1f}s", fill="white")
    sheet.save(WORK / "video-contact.jpg")
    print(WORK / "video-contact.jpg")


def prepare(ffmpeg: str, config: dict, reuse_frames: bool = False) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    version = config["version"]
    frames_dir = WORK / f"frames-{version}"
    frames_dir.mkdir(exist_ok=True)
    size = tuple(config["size"])
    fps = config["fps"]
    x, y, w, h = config["videoCrop"]
    if not reuse_frames:
        run([ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
             "-threads", "1", "-i", str(SOURCE / "isa-video.mp4"),
             "-vf", f"fps={fps},crop={w}:{h}:{x}:{y},scale={size[0]}:{size[1]}",
             "-filter_threads", "1", "-frames:v", str(config["videoFrames"]),
             "-start_number", "0", str(frames_dir / "%03d.png")])
    # Source-frame indices, never separate image renders or a pasted mouth.
    selected = sorted(set(config["blink"] + [i for track in config["tracks"].values() for i in track]))
    lookup = {source: index for index, source in enumerate(selected)}
    frames = []
    for index in selected:
        with Image.open(frames_dir / f"{index:03d}.png") as im:
            frames.append(remove_background(im))
    columns = 8
    atlas = Image.new("RGBA", (columns * size[0], ((len(frames) + columns - 1) // columns) * size[1]))
    for i, frame in enumerate(frames):
        atlas.paste(frame, (i % columns * size[0], i // columns * size[1]))
    output = SOURCE / "runtime"
    output.mkdir(exist_ok=True)
    filename = f"isa-atlas-{version}.webp"
    atlas.save(output / filename, quality=88, method=4)
    tracks = {name: [lookup[i] for i in track] for name, track in config["tracks"].items()}
    frames[tracks["sleep"][-1]].save(output / f"isa-sleep-{version}.webp", quality=88, method=4)
    manifest = {"image": "isa-bot/runtime/" + filename, "width": size[0],
                "height": size[1], "columns": columns, "fps": fps, "front": lookup[config["front"]],
                "sourceFrames": selected, "tracks": tracks,
                "blink": [lookup[i] for i in config["blink"]]}
    (ROOT / "src/app/shared/isabel/isa-portrait-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    # Small authoring contact sheet, no browser or automatic test run.
    sheet = Image.new("RGB", (6 * size[0], ((len(frames) + 5) // 6) * (size[1] + 24)), "#243448")
    for n, frame in enumerate(frames):
        px, py = n % 6 * size[0], n // 6 * (size[1] + 24)
        sheet.paste(frame, (px, py), frame)
        ImageDraw.Draw(sheet).text((px + 5, py + size[1] + 4), str(selected[n]), fill="white")
    sheet.thumbnail((960, 1600))
    sheet.save(WORK / f"prepared-{version}.jpg")
    print(f"{len(frames)} frames; atlas {atlas.size}; {(output / filename).stat().st_size} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--review", action="store_true")
    parser.add_argument("--config", type=Path)
    parser.add_argument("--reuse-frames", action="store_true",
                        help="Reuse the already decoded frames; do not change crop/fps with this option")
    args = parser.parse_args()
    if args.review:
        review(args.ffmpeg)
    elif args.config:
        prepare(args.ffmpeg, json.loads(args.config.read_text(encoding="utf-8")), args.reuse_frames)
    else:
        parser.error("Choose --review or --config. No implicit media processing.")
