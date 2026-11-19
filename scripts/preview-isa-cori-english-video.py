"""Isolated Cori/new English take comparison; never change app assets or old HTMLs."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT/'scripts'/filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(ffmpeg):
    folder = ROOT/'tmp/isa-mouth-preview'
    output = folder/'index-3c-cori-video-ingles.html'
    work = folder/'english-take-1'
    work.mkdir(parents=True, exist_ok=True)
    source = ROOT/'public/isa-bot/isa-video-ingles.mp4'
    protected = [p for p in folder.glob('index*.html') if p != output]
    protected += list((ROOT/'public/isa-bot/runtime').glob('*'))
    protected += list((ROOT/'public/isa-bot').glob('*.mp4'))
    protected += list((ROOT/'src/app/shared/assistant/isabel').glob('*'))
    protected += [ROOT/'src/app/service/assistant/voice/isabel-voice.ts']
    before = {p: digest(p) for p in protected if p.is_file()}
    base = json.loads((folder/'index-3c-micropausas-cori.html').read_text(encoding='utf8').split('const data=', 1)[1].split(';\nconst $=', 1)[0])
    subprocess.run([str(ffmpeg), '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
                    '-threads', '1', '-i', str(source), '-vf', 'fps=24,crop=704:704:300:8,scale=320:320',
                    '-filter_threads', '1', '-frames:v', '240', '-start_number', '0', str(work/'%03d.png')], check=True, timeout=60)
    prepare = module('prepare_english_take', 'prepare-isa-speech.py')
    fusion = module('features_english_take', 'preview-isa-fusion.py')
    frames, pages, images = [], {}, []
    sources = list(range(12, 216))
    for page, start in enumerate(range(0, len(sources), 48)):
        subset = sources[start:start+48]
        atlas = Image.new('RGBA', (2560, ((len(subset)+7)//8)*320))
        for local, number in enumerate(subset):
            with Image.open(work/f'{number:03d}.png') as raw:
                image = prepare.clean_frame(raw)
            images.append(image)
            atlas.paste(image, (local % 8*320, local//8*320))
            frames.append({'source': number, 'page': str(page), 'local': local})
        path = work/f'english-{page}.webp'
        atlas.save(path, quality=88, method=4)
        pages[str(page)] = 'data:image/webp;base64,'+base64.b64encode(path.read_bytes()).decode()
        print(f'English take: {start+len(subset)}/{len(sources)} native frames', flush=True)
    pose, _ = fusion.features(images)
    for image in images:
        image.close()
    rms = lambda x: float(np.sqrt(np.mean(x*x)))
    jumps = {}
    for i in range(1, len(pose)-1):
        jumps[i] = []
        for skip in range(1, 5):
            j = i+skip+1
            if j+1 >= len(pose):
                break
            delta = pose[j]-pose[i]
            error = max(rms(delta-(pose[i]-pose[i-1])), rms((pose[j+1]-pose[j])-delta))
            jumps[i].append({'pose': round(rms(delta), 6), 'motion': round(error, 6)})
    # Provisional visual annotations from the new take, every four source frames.
    # Not inherited from Spanish and not claimed to identify spoken phonemes.
    shapes = ['X']*6 + ['B','D','C','E','E','F','B','B','X','B','E','B','D','C','B','X',
        'C','F','E','B','C','B','F','E','E','C','E','D','C','E','B','B','X','B',
        'B','D','E','F','E','C','B','C','B'] + ['X']*11
    candidates = list(range(0, len(frames), 4))
    new = {'pages': pages, 'frames': frames, 'fps': 24, 'baselineFirst': 12,
           'candidates': candidates, 'labels': [shapes[sources[i]//4] for i in candidates],
           'jumps': jumps, 'policy': base['policy'], 'labelNote': 'Provisional visual review, new English take only.'}
    audio_reader = module('audio_english_take', 'preview-isa-mouths.py')
    pauses = module('pauses_english_take', 'preview-isa-pauses.py')
    micros = module('micros_english_take', 'preview-isa-micro-pauses.py')
    report = json.loads((ROOT.parent/'app-clima-backend/tmp/isa-english-candidates/report.json').read_text(encoding='utf8'))
    cases = []
    for case in report['cases']:
        if case['voice'] != 'cori':
            continue
        path = ROOT.parent/'app-clima-backend/tmp/isa-english-candidates'/case['file']
        _, cues, duration = audio_reader.read_audio(path)
        uri = 'data:audio/wav;base64,'+base64.b64encode(path.read_bytes()).decode()
        analysis = pauses.acoustic_pauses(uri)
        cases.append({**case, 'audio': uri, 'cues': cues, 'duration': duration,
                      'acoustics': analysis, 'micro': micros.micro_gaps(uri, analysis)})
    data = {'experiment': '3C-Cori-English-take-1', 'old': {k: base[k] for k in ('pages','frames','fps','baselineFirst','candidates','labels','jumps','policy')},
            'new': new, 'cases': cases, 'videoSha256': digest(source), 'reviewed': False}
    selectors = '\n'.join((ROOT/'scripts'/name).read_text(encoding='utf8').replace('export function', 'function') for name in (
        'isa-forward-sequence-selector.mjs','isa-english-rhythm.mjs','isa-audio-pauses.mjs','isa-micro-pauses.mjs'))
    selectors = '\n'.join(line for line in selectors.splitlines() if not line.startswith('import '))
    template = (ROOT/'scripts/isa-cori-english-video-preview.html').read_text(encoding='utf8')
    output.write_text(template.replace('/*__SELECTORS__*/', selectors).replace('/*__DATA__*/null', json.dumps(data, separators=(',', ':')).replace('<','\\u003c')), encoding='utf8')
    inventory = {'experiment': data['experiment'], 'source': source.name, 'sourceSha256': data['videoSha256'],
                 'nativeFps': 24, 'sourceFrames': sources, 'speechStart': 24, 'labelNote': new['labelNote'],
                 'cases': [{k:c[k] for k in ('id','duration','text','sha256','lengthScaleMultiplier')} for c in cases], 'reviewed': False}
    (work/'inventory.json').write_text(json.dumps(inventory, indent=2), encoding='utf8')
    for path, sha in before.items():
        if digest(path) != sha:
            raise RuntimeError(f'Protected file changed: {path}')
    print(output)
    print('Old previews, app, runtime and source videos preserved. No API calls, commit or push.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', type=Path, required=True)
    build(parser.parse_args().ffmpeg.resolve())
