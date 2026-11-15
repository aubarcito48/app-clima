"""Prepare small lip patches from reviewed WebP candidates; preserve source files.

Explicit authoring command, not a build/start hook. Requires existing Pillow.
G/H are deliberately mapped to B/C until their supplied shapes are reviewed.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/isa-bot/rhubarb/con-fondo'
OUTPUT = ROOT / 'public/isa-bot/runtime/isa-mouths-v1.webp'
RECT = (1000, 730, 1290, 930)


def prepare():
    # Same elliptical feather as the offline bench, then scale to native pixels.
    mask = Image.new('L', (290, 200))
    mask.putdata([round(255 * max(0, min(1, (1 - (((x + .5 - 145) / 145) ** 2
                    + ((y + .5 - 100) / 100) ** 2) ** .5) / .2)))
                  for y in range(200) for x in range(290)])
    atlas = Image.new('RGBA', (144, 80))
    sources = {}
    for index, shape in enumerate('ABCDEF'):
        path = SOURCE / f'isa-mouth-{shape}.webp'
        with Image.open(path) as source:
            if source.size != (2240, 1920) or source.format != 'WEBP':
                raise ValueError(f'Unexpected mouth source: {shape}')
            patch = source.crop(RECT).convert('RGBA')
        patch.putalpha(mask)
        patch = patch.resize((42, 29), Image.Resampling.LANCZOS)
        atlas.paste(patch, (index % 3 * 48 + 3, index // 3 * 40 + 3))
        sources[shape] = hashlib.sha256(path.read_bytes()).hexdigest()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT, quality=95, method=4)
    manifest = {'image': 'isa-bot/runtime/' + OUTPUT.name, 'width': 48, 'height': 40,
                'columns': 3, 'destination': [125, 119, 48, 40],
                'frames': {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 1, 'H': 2},
                'sourceRect': list(RECT), 'sourceSha256': sources,
                'note': 'Initial placement for review on the native front frame; G/H use B/C.'}
    (ROOT / 'src/app/shared/isabel/isa-mouth-manifest.json').write_text(
        json.dumps(manifest, indent=2) + '\n', encoding='utf8')
    print(f'{OUTPUT}: {OUTPUT.stat().st_size} bytes, {atlas.width} x {atlas.height}')


if __name__ == '__main__':
    prepare()
