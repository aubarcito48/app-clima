"""Synthesize isolated Cori timing candidates without changing the production worker."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT.parent/'app-clima-backend'
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()
from django.conf import settings
from api.services.isa_local_director import direct_locally
from api.services.lip_sync import add_lip_sync

text = (ROOT/'docs/isa-local/cori-warm-rain.txt').read_text(encoding='utf8').strip()
folder = ROOT/'docs/isa-local/cori-timing-variants'
folder.mkdir(exist_ok=True)
worker = BACKEND/'api/services/voice_worker.py'
original = worker.read_text(encoding='utf8')
needle = "(1.08 if language == 'en' else 1)"
if original.count(needle) != 1:
    raise ValueError('Review the current worker before changing the isolated scale override.')
payload = json.dumps({'texto':text,'segmentos':direct_locally(text,language='en')},ensure_ascii=False).encode('utf8')
cases = []
for scale in (1.08, 1.20, 1.30):
    path = ROOT/'docs/isa-local/cori-warm-rain.wav' if scale == 1.08 else folder/f'cori-{scale:.2f}.wav'
    if scale != 1.08:
        source = original.replace(needle, f'({scale} if language == "en" else 1)')
        bootstrap = f'import sys\n__file__=sys.argv[1]\nsys.argv=sys.argv[1:]\nexec(compile({source!r},__file__,"exec"))'
        result = subprocess.run([sys.executable,'-X','utf8','-c',bootstrap,str(worker),str(settings.ISA_MODEL_DIR),'en','--performance'],
                                input=payload,stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd=BACKEND,timeout=45)
        if result.returncode:
            raise RuntimeError(f'Isolated Cori {scale} worker failed')
        audio = add_lip_sync(result.stdout,settings.ISA_RHUBARB_PATH,timeout=60)
        if b'isav' not in audio:
            raise ValueError('Missing own Rhubarb cues')
        path.write_bytes(audio)
    audio = path.read_bytes()
    with wave.open(io.BytesIO(audio),'rb') as wav:
        duration = wav.getnframes()/wav.getframerate()
    record = {'id':f'{scale:.2f}','scale':scale,'file':path.relative_to(ROOT/'docs/isa-local').as_posix(),
              'duration':duration,'sha256':hashlib.sha256(audio).hexdigest()}
    cases.append(record)
    print(json.dumps(record),flush=True)
(folder/'manifest.json').write_text(json.dumps({'text':text,'cases':cases,'reviewed':False,'productionChanged':False},indent=2),encoding='utf8')
