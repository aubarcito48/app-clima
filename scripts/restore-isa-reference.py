"""Restore archived experiment inputs into ignored tmp folders; never overwrite differences."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/'docs/isa-local/reference-2026-11-15'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rebuild',action='store_true');parser.add_argument('--ffmpeg',type=Path)
    args=parser.parse_args();manifest=json.loads((ARCHIVE/'manifest.json').read_text(encoding='utf8'))
    for entry in manifest['files']:
        source=ARCHIVE/entry['path'];raw=source.read_bytes()
        if len(raw)!=entry['bytes'] or hashlib.sha256(raw).hexdigest()!=entry['sha256']:raise ValueError(f'Archive mismatch: {entry["path"]}')
        if not entry['path'].startswith('backend/tmp/'):continue
        target=ROOT.parent/'app-clima-backend'/entry['path'].removeprefix('backend/')
        if target.is_file() and target.read_bytes()!=raw:raise ValueError(f'Existing different input retained: {target}')
        target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists():shutil.copyfile(source,target)
    print('Archived inputs verified/restored; existing differing files are never overwritten.')
    if not args.rebuild:return
    if not args.ffmpeg or not args.ffmpeg.is_file():parser.error('--rebuild requires an existing --ffmpeg executable')
    ffmpeg=str(args.ffmpeg.resolve());wav='../app-clima-backend/tmp/isa-rhubarb/es_long.wav'
    tasks=[
        ['python','scripts/preview-isa-mouths.py','--wav',wav],
        ['python','scripts/preview-isa-mouth-motion.py','--wav',wav,'--output','tmp/isa-mouth-preview/index-2.html'],
        ['python','scripts/preview-isa-whole-frames.py','--wav',wav],
        ['python','scripts/preview-isa-whole-frames.py','--wav',wav,'--sequences'],
        ['python','scripts/preview-isa-forward-sequences.py'],
        ['python','scripts/preview-isa-rhythm.py','--wav',wav],
        ['python','scripts/preview-isa-new-video.py','--wav',wav,'--ffmpeg',ffmpeg],
        ['python','scripts/preview-isa-fusion.py','--wav',wav,'--ffmpeg',ffmpeg],
        ['python','scripts/preview-isa-rhubarb-sequences.py','--wav',wav,'--ffmpeg',ffmpeg],
        ['python','scripts/preview-isa-rhubarb-sequences.py','--wav',wav,'--ffmpeg',ffmpeg,'--stable'],
        ['python','scripts/preview-isa-combinations.py','--wav',wav,'--ffmpeg',ffmpeg],
        ['python','scripts/preview-isa-explicit-combinations.py'],
        ['node','scripts/preview-isa-directors.mjs'],
        ['python','scripts/preview-isa-forward-phrases.py'],
        ['python','scripts/preview-isa-language-voices.py'],
        ['python','scripts/preview-isa-english-candidates.py'],
        ['python','scripts/preview-isa-english-rhythm.py'],
        ['python','scripts/preview-isa-pauses.py'],
        ['python','scripts/preview-isa-micro-pauses.py'],
    ]
    for task in tasks:subprocess.run(task,cwd=ROOT,check=True)
    print(ROOT/'tmp/isa-mouth-preview/index-3c-micropausas.html')

if __name__=='__main__':main()
