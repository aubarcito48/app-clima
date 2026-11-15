"""Offline audio-energy rhythm comparison; no Rhubarb or remote requests."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def prepare_data(wav):
    with wave.open(str(wav), 'rb') as source:
        if source.getsampwidth() != 2 or source.getcomptype() != 'NONE':
            raise ValueError('Se necesita PCM de 16 bits.')
        rate, channels = source.getframerate(), source.getnchannels()
        start, duration = 3, 6
        if source.getnframes()/rate < start+duration:
            raise ValueError('La muestra debe contener al menos nueve segundos.')
        source.setpos(start*rate)
        pcm = source.readframes(duration*rate)
    raw = np.frombuffer(pcm, dtype='<i2').astype(np.float64).reshape(-1, channels)/32768
    hop = .02
    rms = np.asarray([np.sqrt(np.mean(raw[i:i+round(rate*hop)]**2))
                      for i in range(0, len(raw), round(rate*hop))])
    reference = max(float(np.percentile(rms, 90)), 1e-6)
    energy = np.clip((rms/reference-.06)/.94, 0, 1)
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as target:
        target.setnchannels(channels); target.setsampwidth(2); target.setframerate(rate)
        target.writeframes(pcm)
    manifest = json.loads((ROOT/'src/app/shared/isabel/isa-speech-manifest.json').read_text())
    first = manifest['sourceFrames'].index(24)
    frames, pages = [], {}
    for index in range(first, first+180):
        page_index, page = next((i,p) for i,p in enumerate(manifest['pages']) if p['first']<=index<p['first']+p['count'])
        if str(page_index) not in pages:
            pages[str(page_index)] = 'data:image/webp;base64,' + base64.b64encode((ROOT/'public'/page['image']).read_bytes()).decode()
        frames.append({'source': manifest['sourceFrames'][index], 'page': str(page_index), 'local': index-page['first']})
    if duration*1.1 >= len(frames)/manifest['fps']:
        raise ValueError('No hay suficiente video para evitar vueltas o congelamientos.')
    data = {'audio': 'data:audio/wav;base64,'+base64.b64encode(buffer.getvalue()).decode(),
            'duration': duration, 'energy': energy.round(6).tolist(), 'hop': hop,
            'frames': frames, 'pages': pages, 'fps': manifest['fps']}
    return data


def build(wav):
    output = ROOT/'tmp/isa-mouth-preview/index-ritmo.html'
    earlier = {p: hashlib.sha256(p.read_bytes()).hexdigest()
               for p in output.parent.glob('index*.html') if p != output}
    data = prepare_data(wav)
    template = (ROOT/'scripts/isa-rhythm-preview.html').read_text(encoding='utf8')
    clock = (ROOT/'scripts/isa-rhythm-timeline.mjs').read_text(encoding='utf8').replace('export function', 'function')
    output.write_text(template.replace('/*__RHYTHM_CLOCK__*/', clock).replace('/*__RHYTHM_DATA__*/null', json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
    for path, digest in earlier.items():
        if hashlib.sha256(path.read_bytes()).hexdigest()!=digest:
            raise RuntimeError(f'Se modificó una prueba anterior: {path}')
    print(f'{output}\n6 s; PCM energy only, no Rhubarb. Earlier HTMLs unchanged.')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav',type=Path,required=True)
    build(parser.parse_args().wav)
