"""Publish only the reviewed English trial's native atlases and provisional catalog."""
import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT/'public/isa-bot/isa-video-ingles.mp4'
trial = ROOT/'tmp/isa-mouth-preview/index-3c-cori-video-ingles.html'
data = json.loads(trial.read_text(encoding='utf8').split('const data=',1)[1].split(';\nconst $=',1)[0])
if hashlib.sha256(source.read_bytes()).hexdigest() != data['videoSha256']:
    raise ValueError('Rebuild/review the trial before publishing a different English take.')
take = data['new']
pages = []
for key, uri in take['pages'].items():
    frames = [f for f in take['frames'] if f['page'] == key]
    name = f'isa-speech-en-v1-{key}.webp'
    (ROOT/'public/isa-bot/runtime'/name).write_bytes(base64.b64decode(uri.split(',',1)[1]))
    pages.append({'image': 'isa-bot/runtime/'+name, 'first': take['frames'].index(frames[0]), 'count': len(frames)})
sources = [f['source'] for f in take['frames']]
manifest = {'width':320,'height':320,'columns':8,'fps':24,'source':source.name,
    'sourceFrames':sources,'pages':pages,
    'closed':[sources.index(i) for i in (12,16,20,56,152,196,200,204,208,212)]}
target = ROOT/'src/app/shared/isabel'
(target/'isa-speech-manifest-en.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
catalog = {k:take[k] for k in ('fps','candidates','labels','jumps','policy','labelNote')}
catalog['sourceFrames'] = sources
(target/'isa-speech-selection-en.json').write_text(json.dumps(catalog,separators=(',',':'))+'\n',encoding='utf8')
print(f'Prepared {len(sources)} English frames in {len(pages)} atlas pages; Spanish assets unchanged.')
