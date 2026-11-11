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
    frames_dir = WORK / "frames"
    frames_dir.mkdir(exist_ok=True)
    fps = config["fps"]
    # Scale only after cropping, so background removal runs on small frames.
    x, y, w, h = config["videoCrop"]
    if not reuse_frames:
        run([ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
             "-threads", "1", "-i", str(SOURCE / "isa-video.mp4"),
             "-vf", f"fps={fps},crop={w}:{h}:{x}:{y},scale={SIZE[0]}:{SIZE[1]}",
             "-filter_threads", "1", "-frames:v", str(config["videoFrames"]),
             str(frames_dir / "%03d.png")])
    frames = []
    for i in config["selectedFrames"]:
        with Image.open(frames_dir / f"{i + 1:03d}.png") as im:
            frames.append(remove_background(im))
    poses = {}
    for name, value in config["stills"].items():
        with Image.open(SOURCE / "sin-fondo" / value["file"]) as im:
            frames.append(im.crop(tuple(value["crop"])).resize(SIZE, Image.Resampling.LANCZOS))
        poses[name] = len(frames) - 1
    # Keep the same head/body while speaking: only use a feathered mouth patch.
    mouth = config["mouth"]
    with Image.open(SOURCE / "sin-fondo" / mouth["file"]) as im:
        patch = im.crop(tuple(mouth["crop"])).resize(tuple(mouth["size"]), Image.Resampling.LANCZOS)
    mask = Image.new("L", patch.size)
    ImageDraw.Draw(mask).ellipse((2, 2, patch.width - 3, patch.height - 3), fill=255)
    patch.putalpha(mask.filter(ImageFilter.GaussianBlur(2)))
    tile = Image.new("RGBA", SIZE)
    tile.paste(patch, tuple(mouth["position"]))
    frames.append(tile)
    poses["mouth"] = len(frames) - 1
    columns = 8
    atlas = Image.new("RGBA", (columns * SIZE[0], ((len(frames) + columns - 1) // columns) * SIZE[1]))
    for i, frame in enumerate(frames):
        atlas.paste(frame, (i % columns * SIZE[0], i // columns * SIZE[1]))
    output = SOURCE / "runtime"
    output.mkdir(exist_ok=True)
    atlas.save(output / "isa-atlas-v1.webp", quality=85, method=4)
    frames[poses["sleep"]].save(output / "isa-sleep-v1.webp", quality=85, method=4)
    manifest = {"image": "isa-bot/runtime/isa-atlas-v1.webp", "width": SIZE[0],
                "height": SIZE[1], "columns": columns, "poses": poses,
                "fps": fps, **config["animation"]}
    (ROOT / "src/app/shared/isabel/isa-portrait-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    sheet = Image.new("RGB", (len(poses) * SIZE[0], SIZE[1] + 24), "#243448")
    for n, (name, index) in enumerate(poses.items()):
        sheet.paste(frames[index], (n * SIZE[0], 0), frames[index])
        ImageDraw.Draw(sheet).text((n * SIZE[0] + 5, SIZE[1] + 5), name, fill="white")
    sheet.save(WORK / "prepared-poses.jpg")
    print(f"{len(frames)} frames; atlas {atlas.size}; {(output / 'isa-atlas-v1.webp').stat().st_size} bytes")


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
