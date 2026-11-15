"""Offline whole-frame selection experiment. Never changes production assets."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

import importlib.util

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('motion', ROOT / 'scripts/preview-isa-mouth-motion.py')
motion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(motion)

# Provisional visual annotations of the contact sheet, not phonetic ground truth.
# Only these inspected frames are selectable; A/G/H have no confirmed examples.
LABELS = dict(zip(range(12, 216, 4),
    'XXXCEBEF' 'BDBXEXBF' 'BDBCXXDB' 'FBBCCBEB' 'BBBXCBBD' 'FFDBFCBF' 'XXX'))


def build(wav, sequences=False):
    folder = ROOT / 'tmp/isa-mouth-preview'
    preserved = {p: hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in (folder/'index.html', folder/'index-2.html', *([folder/'index-3.html'] if sequences else [])) if p.exists()}
    manifest = json.loads((ROOT/'src/app/shared/isabel/isa-speech-manifest.json').read_text())
    frames, pages, features = [], {}, []
    for page_index, page in enumerate(manifest['pages']):
        path = ROOT/'public'/page['image']
        pages[str(page_index)] = motion.uri(path, 'image/webp')
        with Image.open(path) as atlas:
            for local in range(page['count']):
                index = page['first'] + local
                source = manifest['sourceFrames'][index]
                frames.append({'source': source, 'page': str(page_index), 'local': local})
                frame = atlas.crop((local%8*320, local//8*320, local%8*320+320, local//8*320+320))
                # Exclude the mouth when comparing pose/body continuity. No warping.
                small = np.asarray(frame.convert('RGB').resize((32,32)), dtype=np.float32)/255
                small[11:18, 10:21] = 0
                features.append(small.reshape(-1))
    candidates = [i for i, frame in enumerate(frames) if frame['source'] in LABELS]
    feature = np.asarray(features)
    distance = np.sqrt(((feature[:,None,:]-feature[candidates][None,:,:])**2).mean(axis=2))
    audio, cues = motion.clip_audio(wav, 3, 2)
    payload = {'pages': pages, 'frames': frames, 'candidates': candidates,
               'labels': [LABELS[frames[i]['source']] for i in candidates],
               'distances': distance.round(5).tolist(), 'fps': manifest['fps'],
               'audio': audio, 'cues': cues, 'duration': 2,
               'baselineFirst': manifest['sourceFrames'].index(80)}
    template = (ROOT/'scripts/isa-whole-frames-preview.html').read_text(encoding='utf8')
    if sequences:
        # One row at a time avoids allocating a 204 x 204 x 3072 tensor.
        full_distance = np.asarray([np.sqrt(((feature-row)**2).mean(axis=1)) for row in feature])
        payload['fullDistances'] = full_distance.round(5).tolist()
        template = template.replace('Prueba 3.', 'Prueba 3B.').replace('prueba 3 ·', 'prueba 3B ·')
        template = template.replace('Isa: probar cuadros completos', 'Isa: probar secuencias continuas')
        template = template.replace('A la derecha elegimos cuadros completos según las marcas de Rhubarb y la continuidad de la pose.',
            'A la derecha reproducimos tramos consecutivos a 24 FPS, conservando sus cuadros intermedios. Elegimos cada tramo según la boca y la continuidad de la pose.')
        template = template.replace('<label class="control">Priorizar',
            '<label class="control">Duración de cada tramo <select id="length" aria-label="Cuadros por tramo"><option value="4">4 cuadros · 167 ms</option><option value="6" selected>6 cuadros · 250 ms</option><option value="8">8 cuadros · 333 ms</option></select></label><label class="control">Priorizar')
        template = template.replace('Elegir cuadros completos puede producir saltos o pausas en la actuación.',
            'Cada tramo avanza sin repetir ni saltear cuadros internos. Entre tramos todavía puede haber saltos. Las formas intermedias se estiman con la etiqueta visual más cercana, no están verificadas una por una.')
        template = template.replace('«Excluir» retira ese cuadro del ensayo.',
            '«Excluir» retira esa etiqueta como referencia para elegir tramos; el cuadro todavía puede aparecer como intermedio de otro tramo.')
        start, end = template.index('function rebuild(){'), template.index('function tick(){')
        algorithm = (ROOT/'scripts/isa-sequences-preview.js').read_text(encoding='utf8')
        template = template[:start] + algorithm + '\n' + template[end:]
        template = template.replace("$('weight').addEventListener('input',rebuild);",
                                    "$('length').addEventListener('change',rebuild);$('weight').addEventListener('input',rebuild);")
        template = template.replace('experiment:3,reviewed:false,', "experiment:'3B',reviewed:false,framesPerClip:+$('length').value,")
        template = template.replace('data.frames[data.candidates[j]].source,cue:cueAt((t+.5)/data.fps),shape:labels[j]',
                                    'data.frames[j].source,cue:cueAt((t+.5)/data.fps),shape:labels[nearestLabel(j)]')
        template = template.replace("a.download='isa-whole-frame-review.json'", "a.download='isa-sequences-review.json'")
        template = template.replace('<a href="index-2.html">Prueba 2</a>', '<a href="index-2.html">Prueba 2</a> · <a href="index-3.html">Prueba 3 anterior</a>')
    folder.mkdir(parents=True, exist_ok=True)
    output = folder/('index-3b.html' if sequences else 'index-3.html')
    output.write_text(template.replace('/*__WHOLE_FRAMES__*/null', json.dumps(payload, separators=(',', ':')).replace('<', '\\u003c')), encoding='utf8')
    for path, digest in preserved.items():
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise RuntimeError(f'Changed earlier preview: {path}')
    print(f'{output}\n{len(candidates)} provisional candidates. Earlier previews unchanged.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav', required=True, type=Path)
    parser.add_argument('--sequences', action='store_true')
    args = parser.parse_args()
    build(args.wav, args.sequences)
