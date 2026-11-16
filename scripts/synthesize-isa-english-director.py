"""Measured English director trial; baseline audios and active app remain intact."""
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT.parent/'app-clima-backend'
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()
from api.services.isa_director_en import direct_english
from api.services.voice import synthesize


def timeline(raw):
    offset = 12
    while offset + 8 <= len(raw):
        size = int.from_bytes(raw[offset+4:offset+8], 'little')
        if raw[offset:offset+4] == b'isac':
            return json.loads(raw[offset+8:offset+8+size])
        offset += 8 + size + size % 2
    raise ValueError('Missing measured Piper segment timeline')


text = (ROOT/'docs/isa-local/cori-warm-rain.txt').read_text(encoding='utf8').strip()
folder = ROOT/'docs/isa-local/cori-english-director-v1'
folder.mkdir(exist_ok=True)
cases = []
for profile in ('baseline', 'paced-v1'):
    plan = direct_english(text, profile=profile)
    file = ROOT/'docs/isa-local/cori-warm-rain.wav' if profile == 'baseline' else folder/'cori-paced-v1.wav'
    if profile != 'baseline':
        raw = synthesize(text, language='en', segments=plan)
        if b'isav' not in raw:
            raise ValueError('Missing Rhubarb analysis for paced voice')
        file.write_bytes(raw)
    raw = file.read_bytes()
    with wave.open(io.BytesIO(raw), 'rb') as wav:
        duration = wav.getnframes()/wav.getframerate()
    measured = timeline(raw)
    if len(measured) != len(plan):
        raise ValueError('Plan/audio segment count mismatch')
    record = {'id': profile, 'label': 'Director inglés actual' if profile == 'baseline' else 'Director inglés pausado v1',
              'profile': profile, 'scale': 1.08, 'file': file.relative_to(ROOT/'docs/isa-local').as_posix(),
              'duration': duration, 'sha256': hashlib.sha256(raw).hexdigest(), 'plan': plan, 'timeline': measured}
    cases.append(record)
    print(json.dumps(record), flush=True)
(folder/'manifest.json').write_text(json.dumps({'title':'Isa: director inglés y tiempos reales de Piper', 'text':text,
    'cases':cases, 'reviewed':False, 'productionChanged':False}, indent=2), encoding='utf8')
