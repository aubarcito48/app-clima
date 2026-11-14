"""Read-only inventory and contact sheets of Isa's current native frames.

Requires Pillow, as do the existing asset preparation scripts. No network,
training, generated facial parts, runtime changes or source-file writes.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def audit(output):
    output.mkdir(parents=True, exist_ok=True)
    folder = ROOT / 'src/app/shared/isabel'
    portrait = json.loads((folder / 'isa-portrait-manifest.json').read_text(encoding='utf8'))
    speech = json.loads((folder / 'isa-speech-manifest.json').read_text(encoding='utf8'))
    renderer_path = folder / 'isa-portrait.ts'
    renderer = renderer_path.read_text(encoding='utf8')
    start = int(re.search(r'const SPEECH_START = (\d+);', renderer).group(1))
    end = int(re.search(r'const SPEECH_END = (\d+);', renderer).group(1))
    width, height, columns = speech['width'], speech['height'], speech['columns']
    count = len(speech['sourceFrames'])
    if not 0 <= start < end <= count or speech['fps'] <= 0:
        raise ValueError('Invalid speech loop or frame rate.')
    pages = []
    expected = 0
    for page_index, page in enumerate(speech['pages']):
        path = ROOT / 'public' / page['image']
        if page['first'] != expected or page['count'] < 1:
            raise ValueError('Speech pages have gaps or overlaps.')
        with Image.open(path) as atlas:
            if atlas.width != width * columns or atlas.height < ((page['count'] + columns - 1) // columns) * height:
                raise ValueError('Speech atlas dimensions do not match its manifest.')
            thumb = 112
            rows = (page['count'] + columns - 1) // columns
            sheet = Image.new('RGB', (columns * thumb, rows * (thumb + 26)), '#102335')
            draw = ImageDraw.Draw(sheet)
            for local in range(page['count']):
                index = page['first'] + local
                tile = atlas.crop((local % columns * width, local // columns * height,
                                   (local % columns + 1) * width, (local // columns + 1) * height)).convert('RGBA')
                tile.thumbnail((thumb, thumb))
                x, y = local % columns * thumb, local // columns * (thumb + 26)
                sheet.paste(tile, (x, y), tile)
                label = f"{index} / src {speech['sourceFrames'][index]}"
                draw.text((x + 3, y + thumb + 2), label, fill='white')
                if index in speech['closed']:
                    draw.text((x + 3, y + thumb + 13), 'closed (manifest)', fill='#73e2a7')
            sheet.save(output / f'speech-page-{page_index}.jpg', quality=88)
            pages.append({'image': page['image'], 'first': page['first'], 'count': page['count'],
                          'pixels': list(atlas.size), 'bytes': path.stat().st_size,
                          'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        expected += page['count']
    if expected != count or any(index < 0 or index >= count for index in speech['closed']):
        raise ValueError('Frame count or closed-frame indices are invalid.')
    if any(frame < 0 or frame >= len(portrait['sourceFrames']) for track in portrait['tracks'].values() for frame in track):
        raise ValueError('Portrait track references an invalid tile.')
    result = {
        'scope': 'native asset inventory; not a phoneme classifier or an accuracy measurement',
        'speech': {'source': speech['source'], 'tilePixels': [width, height], 'fps': speech['fps'],
                   'frames': count, 'durationSeconds': count / speech['fps'],
                   'sourceFrameRange': [min(speech['sourceFrames']), max(speech['sourceFrames'])],
                   'activeLoop': {'startInclusive': start, 'endExclusive': end, 'durationSeconds': (end - start) / speech['fps']},
                   'closedIndicesFromExistingManifest': speech['closed'], 'pages': pages,
                   'totalBytes': sum(page['bytes'] for page in pages)},
        'portrait': {'fps': portrait['fps'], 'tilePixels': [portrait['width'], portrait['height']],
                     'tiles': len(portrait['sourceFrames']),
                     'tracks': {name: len(track) for name, track in portrait['tracks'].items()}},
        'missingAnnotations': ['phoneme/viseme identity', 'mouth openness per frame',
                               'mouth landmarks and head alignment', 'confidence and transition compatibility'],
        'rendererSha256': hashlib.sha256(renderer_path.read_bytes()).hexdigest(),
    }
    (output / 'inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'frames': count, 'fps': speech['fps'], 'pages': len(pages), 'bytes': result['speech']['totalBytes'],
                      'output': str(output)}, ensure_ascii=True))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'tmp/isa-local-audit')
    audit(parser.parse_args().output.resolve())
