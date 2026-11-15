"""Build an offline Isa mouth review from existing WebP files and a Piper WAV.

No server, API requests, voice generation or source-image edits. Pillow is used
only to verify image files; all compositing happens in the preview's canvas.
"""

import argparse
import base64
import io
import json
import math
from pathlib import Path
import struct
import wave

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHAPES = 'ABCDEFGHX'


def read_audio(path):
    audio = path.read_bytes()
    if len(audio) > 12_000_000 or audio[:4] != b'RIFF' or audio[8:12] != b'WAVE':
        raise ValueError('Se necesita un WAV RIFF de hasta 12 MB.')
    if int.from_bytes(audio[4:8], 'little') + 8 != len(audio):
        raise ValueError('El tamaño RIFF no coincide con el archivo.')
    with wave.open(io.BytesIO(audio)) as source:
        duration = source.getnframes() / source.getframerate()
    if not 0 < duration <= 90:
        raise ValueError('El audio debe durar entre 0 y 90 segundos.')
    offset, cues = 12, None
    while offset + 8 <= len(audio):
        size = struct.unpack_from('<I', audio, offset + 4)[0]
        end = offset + 8 + size
        if end > len(audio):
            raise ValueError('Chunk RIFF incompleto.')
        if audio[offset:offset + 4] == b'isav':
            if cues is not None or size > 65536:
                raise ValueError('Metadata isav duplicada o demasiado grande.')
            cues = json.loads(audio[offset + 8:end])
        offset = end + size % 2
    if offset != len(audio):
        raise ValueError('El WAV termina con un chunk incompleto.')
    if not isinstance(cues, list) or not 1 <= len(cues) <= 1500:
        raise ValueError('El WAV no contiene marcas isav válidas de Rhubarb.')
    previous = 0.0
    for cue in cues:
        if not isinstance(cue, dict) or set(cue) != {'start', 'end', 'value'}:
            raise ValueError('Marca de boca inválida.')
        start, end, value = cue['start'], cue['end'], cue['value']
        if (any(isinstance(v, bool) or not isinstance(v, (float, int)) or not math.isfinite(v)
                for v in (start, end)) or not isinstance(value, str) or value not in SHAPES
                or len(value) != 1 or not 0 <= start < end <= duration + .011
                or abs(start - previous) > .011):
            raise ValueError('Tiempo o forma de boca inválidos.')
        previous = end
    if abs(previous - duration) > .021:
        raise ValueError('La línea de tiempo no cubre el audio completo.')
    return audio, cues, duration


def image_data(path, size):
    with Image.open(path) as source:
        source.load()
        if source.format != 'WEBP' or source.size != size:
            raise ValueError(f'Recurso inesperado: {path.name}; se esperaba WebP {size}.')
    return 'data:image/webp;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def build(wav, output):
    audio, cues, duration = read_audio(wav)
    assets = ROOT / 'public/isa-bot/rhubarb'
    images = {shape: image_data(assets / 'con-fondo' / f'isa-mouth-{shape}.webp', (2240, 1920))
              for shape in SHAPES if shape != 'X'}
    images['X'] = image_data(assets / 'sin-fondo/isa-mouth-X-Photoroom.webp', (2240, 1914))
    payload = {'audio': 'data:audio/wav;base64,' + base64.b64encode(audio).decode('ascii'),
               'cues': cues, 'duration': duration, 'images': images}
    template = (ROOT / 'scripts/isa-mouth-preview.html').read_text(encoding='utf8')
    encoded = json.dumps(payload, separators=(',', ':'), allow_nan=False).replace('<', '\\u003c')
    page = template.replace('/*__ISA_DATA__*/null', encoded)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding='utf8')
    print(f'{output.resolve()}\n{len(cues)} marcas, {duration:.2f} s; sin consultas externas.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav', type=Path, required=True, help='WAV existente con chunk isav')
    parser.add_argument('--output', type=Path, default=ROOT / 'tmp/isa-mouth-preview/index.html')
    args = parser.parse_args()
    build(args.wav, args.output)
