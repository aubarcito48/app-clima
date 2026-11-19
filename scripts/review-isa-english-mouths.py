"""Render labelled English mouth crops for visual review, without changing assets."""
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'src/app/shared/assistant/isabel/isa-speech-manifest-en.json').read_text(encoding='utf8'))
folder = ROOT / 'tmp/isa-mouth-preview'
folder.mkdir(parents=True, exist_ok=True)
canvas = Image.new('RGB', (12 * 124, 14 * 100), '#edf8fc')
draw = ImageDraw.Draw(canvas)
pages = {}
try:
    for n, index in enumerate(range(12, 180)):
        page = next(p for p in manifest['pages'] if p['first'] <= index < p['first'] + p['count'])
        if page['image'] not in pages:
            pages[page['image']] = Image.open(ROOT / 'public' / page['image'])
        tile = index - page['first']
        x, y = tile % 8 * 320, tile // 8 * 320
        crop = pages[page['image']].crop((x + 120, y + 111, x + 190, y + 151)).resize((124, 72))
        canvas.paste(crop, (n % 12 * 124, n // 12 * 100))
        draw.text((n % 12 * 124 + 4, n // 12 * 100 + 73), str(index), fill='#173c50')
    target = folder / 'english-mouth-frame-review.png'
    canvas.save(target)
    print(target)
finally:
    for atlas in pages.values():
        atlas.close()
