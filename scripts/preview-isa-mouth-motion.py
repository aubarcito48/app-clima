"""Second offline experiment: lip patches over continuously moving native frames.

Uses existing atlas pages, WebP mouth candidates and a saved Piper/Rhubarb WAV.
No generated/edited source frames, new models, API calls or runtime app changes.
Pillow and NumPy are only used for reading frames and estimating landmark motion.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import io
import wave

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FIRST_PREVIEW = ROOT / 'tmp/isa-mouth-preview/index.html'
spec = importlib.util.spec_from_file_location('first_preview', ROOT / 'scripts/preview-isa-mouths.py')
first_preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(first_preview)

# Eye/nose templates in the first native frame of this short trial. The mouth
# is excluded: speech changes its appearance and would contaminate tracking.
LANDMARKS = [(124, 88, 18, 17), (161, 88, 18, 17), (143, 106, 17, 15)]
SEARCH = 10


def uri(path, kind):
    return f'data:{kind};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def peak_offset(values, row, column, axis):
    center = row if axis == 0 else column
    if not 0 < center < values.shape[axis] - 1:
        return 0.0
    a, b, c = (values[row-1:row+2, column] if axis == 0 else values[row, column-1:column+2])
    divisor = a - 2*b + c
    return float(np.clip(.5 * (a-c) / divisor, -.5, .5)) if abs(divisor) > 1e-8 else 0.0


def locate(gray, reference, rect):
    x, y, width, height = rect
    template = reference[y:y+height, x:x+width]
    template = template - template.mean()
    region = gray[y-SEARCH:y+height+SEARCH, x-SEARCH:x+width+SEARCH]
    windows = np.lib.stride_tricks.sliding_window_view(region, (height, width))
    centered = windows - windows.mean(axis=(-2, -1), keepdims=True)
    denominator = np.sqrt((centered * centered).sum(axis=(-2, -1)) * (template * template).sum())
    scores = (centered * template).sum(axis=(-2, -1)) / np.maximum(denominator, 1e-8)
    row, column = np.unravel_index(scores.argmax(), scores.shape)
    dx = column - SEARCH + peak_offset(scores, row, column, 1)
    dy = row - SEARCH + peak_offset(scores, row, column, 0)
    return [x+width/2+dx, y+height/2+dy], float(scores[row, column])


def track(frames):
    reference = np.asarray(frames[0].convert('L'), dtype=np.float32)
    centers = [(x+w/2, y+h/2) for x, y, w, h in LANDMARKS]
    rows = []
    for x, y in centers:
        rows.extend([[x, -y, 1, 0], [y, x, 0, 1]])
    matrix = np.asarray(rows)
    result = []
    for frame in frames:
        gray = np.asarray(frame.convert('L'), dtype=np.float32)
        matches = [locate(gray, reference, rect) for rect in LANDMARKS]
        points = np.asarray([point for point, _ in matches])
        a, b, tx, ty = np.linalg.lstsq(matrix, points.reshape(-1), rcond=None)[0]
        error = float(np.sqrt(np.mean((matrix @ [a, b, tx, ty] - points.reshape(-1)) ** 2)))
        score = min(score for _, score in matches)
        scale, rotation = math.hypot(a, b), math.degrees(math.atan2(b, a))
        stable = score >= .65 and error <= 1.5 and .9 <= scale <= 1.1 and abs(rotation) <= 8
        result.append({'transform': [float(a), float(b), float(tx), float(ty)],
                       'points': points.tolist(), 'score': round(score, 4),
                       'error': round(error, 4), 'stable': stable})
    return result


def clip_audio(path, start, duration):
    audio, cues, full_duration = first_preview.read_audio(path)
    if start < 0 or start + duration > full_duration:
        raise ValueError('El fragmento queda fuera del audio disponible.')
    with wave.open(io.BytesIO(audio)) as source:
        rate = source.getframerate()
        first = round(start * rate)
        count = round(duration * rate)
        source.setpos(first)
        samples = source.readframes(count)
        params = source.getparams()
    output = io.BytesIO()
    with wave.open(output, 'wb') as destination:
        destination.setparams(params)
        destination.writeframes(samples)
    end = start + duration
    clipped = [{'start': max(0, cue['start'] - start), 'end': min(duration, cue['end'] - start),
                'value': cue['value']} for cue in cues if cue['end'] > start and cue['start'] < end]
    return 'data:audio/wav;base64,' + base64.b64encode(output.getvalue()).decode('ascii'), clipped


def build(wav, output):
    output = output.resolve()
    if output == FIRST_PREVIEW.resolve() or not output.is_relative_to((ROOT / 'tmp').resolve()):
        raise ValueError('La prueba 2 debe guardarse en tmp y nunca sobrescribir index.html.')
    previous_hash = hashlib.sha256(FIRST_PREVIEW.read_bytes()).hexdigest() if FIRST_PREVIEW.exists() else None
    manifest = json.loads((ROOT / 'src/app/shared/isabel/isa-speech-manifest.json').read_text(encoding='utf8'))
    first_index = manifest['sourceFrames'].index(80)
    count, fps = 48, manifest['fps']
    frames, pages, indices, atlases = [], {}, [], {}
    for index in range(first_index, first_index + count):
        page_index, page = next((i, page) for i, page in enumerate(manifest['pages'])
                                if page['first'] <= index < page['first'] + page['count'])
        path = ROOT / 'public' / page['image']
        if str(page_index) not in pages:
            pages[str(page_index)] = {'image': uri(path, 'image/webp'), 'first': page['first']}
            with Image.open(path) as atlas:
                atlases[page_index] = atlas.copy()
        local = index - page['first']
        x, y = local % manifest['columns'] * 320, local // manifest['columns'] * 320
        frames.append(atlases[page_index].crop((x, y, x+320, y+320)))
        indices.append({'page': str(page_index), 'local': local, 'source': manifest['sourceFrames'][index]})
    for atlas in atlases.values():
        atlas.close()
    tracking = track(frames)
    audio, cues = clip_audio(wav, 3, count/fps)
    mouths = {shape: uri(ROOT / 'public/isa-bot/rhubarb/con-fondo' / f'isa-mouth-{shape}.webp', 'image/webp')
              for shape in 'ABCDEFX'}
    payload = {'pages': pages, 'frames': indices, 'tracking': tracking, 'mouths': mouths,
               'fps': fps, 'duration': count/fps, 'audio': audio, 'cues': cues,
               'columns': manifest['columns'], 'referencePoints': [(x+w/2, y+h/2) for x,y,w,h in LANDMARKS]}
    template = (ROOT / 'scripts/isa-mouth-motion-preview.html').read_text(encoding='utf8')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(template.replace('/*__ISA_MOTION_DATA__*/null',
                      json.dumps(payload, separators=(',', ':'), allow_nan=False).replace('<', '\\u003c')), encoding='utf8')
    report = {'scope': '2-second local visual experiment; not a precision benchmark or production integration',
              'sourceFrames': [row['source'] for row in indices], 'tracking': tracking,
              'originalPreviewSha256': previous_hash, 'audioClipSeconds': [3, 5]}
    output.with_suffix('.json').write_text(json.dumps(report, indent=2), encoding='utf8')
    if previous_hash is not None and hashlib.sha256(FIRST_PREVIEW.read_bytes()).hexdigest() != previous_hash:
        raise RuntimeError('La primera prueba cambió inesperadamente.')
    print(f'{output}\n{len(frames)} cuadros; {sum(row["stable"] for row in tracking)} con seguimiento aceptado por los límites del ensayo.\nHTML 1 intacto: {previous_hash}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'tmp/isa-mouth-preview/index-2.html')
    args = parser.parse_args()
    build(args.wav, args.output)
