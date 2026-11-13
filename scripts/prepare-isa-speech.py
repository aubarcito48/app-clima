"""Extract the supplied speech clip into small atlas pages, using the same crop/matte as Isa.

Explicit sequential authoring only; source videos are never changed.
"""
import argparse
import importlib.util
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('prepare_isa', ROOT/'scripts/prepare-isa.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def clean_frame(original):
    frame = base.remove_background(original)
    alpha = frame.getchannel('A')
    connected = alpha.point(lambda p: 255 if p >= 64 else 0)
    seed = (frame.width // 2, frame.height // 2)
    if connected.getpixel(seed) != 255:
        raise ValueError('Subject is not at the expected crop center; review the speech crop')
    ImageDraw.floodfill(connected, seed, 128)
    keep = connected.point(lambda p: 255 if p == 128 else 0).filter(ImageFilter.MaxFilter(3))
    frame.putalpha(ImageChops.multiply(alpha, keep))
    return frame


def prepare(ffmpeg, reuse):
    config = json.loads((ROOT/'scripts/isa-speech-assets.json').read_text(encoding='utf-8'))
    work = base.WORK/'speech-v1'
    work.mkdir(parents=True, exist_ok=True)
    x, y, w, h = config['videoCrop']
    width, height = config['size']
    if not reuse:
        base.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
            '-threads', '1', '-i', str(base.SOURCE/config['source']),
            '-vf', f'fps=24,crop={w}:{h}:{x}:{y},scale={width}:{height}',
            '-filter_threads', '1', '-frames:v', '240', '-start_number', '0', str(work/'%03d.png')])
    selected = list(range(config['first'], config['last']+1))
    pages = []
    columns, per_page = 8, 48
    sheet = Image.new('RGB', (960, 4*185), '#243448')
    for page, start in enumerate(range(0, len(selected), per_page)):
        sources = selected[start:start+per_page]
        atlas = Image.new('RGBA', (columns*width, ((len(sources)+columns-1)//columns)*height))
        for tile, source in enumerate(sources):
            with Image.open(work/f'{source:03d}.png') as original:
                frame = clean_frame(original)
            atlas.paste(frame, (tile%columns*width, tile//columns*height))
        filename = f"isa-speech-v1-{page}.webp"
        atlas.save(base.SOURCE/'runtime'/filename, quality=88, method=4)
        pages.append({'image': 'isa-bot/runtime/'+filename, 'first': start, 'count': len(sources)})
    # Review representative original-video frames against the existing neutral crop.
    for tile, source in enumerate(range(0, 240, 15)):
        with Image.open(work/f'{source:03d}.png') as original:
            frame = clean_frame(original)
        frame.thumbnail((240, 160))
        px, py = tile%4*240, tile//4*185
        sheet.paste(frame, (px, py), frame)
        ImageDraw.Draw(sheet).text((px+5, py+163), f'{source} / {source/24:.2f}s', fill='white')
    sheet.save(base.WORK/'speech-prepared-v1.jpg')
    manifest = {'width': width, 'height': height, 'columns': columns, 'fps': 24,
        'source': config['source'], 'sourceFrames': selected, 'pages': pages}
    (ROOT/'src/app/shared/isabel/isa-speech-manifest.json').write_text(
        json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(f'{len(selected)} speech frames in {len(pages)} pages', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--reuse-frames', action='store_true')
    args = parser.parse_args()
    prepare(args.ffmpeg, args.reuse_frames)
