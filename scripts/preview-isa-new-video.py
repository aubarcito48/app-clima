"""Trial 4: prepare the new Gemini take only in tmp; preserve runtime and previews."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT/'scripts'/filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(wav, ffmpeg):
    output = ROOT/'tmp/isa-mouth-preview/index-4.html'
    folder = ROOT/'tmp/isa-mouth-preview/video-2'
    folder.mkdir(parents=True, exist_ok=True)
    source = ROOT/'public/isa-bot/isa-hablando2-video.mp4'
    protected = list(output.parent.glob('index*.html'))
    protected += list((ROOT/'public/isa-bot/runtime').glob('*'))
    protected += [ROOT/'public/isa-bot/isa-hablando-video.mp4',source,
                  ROOT/'src/app/shared/assistant/isabel/isa-speech-manifest.json']
    before = {p: digest(p) for p in protected if p.is_file() and p!=output}
    config = json.loads((ROOT/'scripts/isa-speech-assets.json').read_text())
    crop = config['videoCrop']
    x,y,w,h = crop
    subprocess.run([str(ffmpeg),'-hide_banner','-loglevel','error','-nostdin','-y',
                    '-i',str(source),'-vf',f'fps=24,crop={w}:{h}:{x}:{y},scale=320:320',
                    '-frames:v','240','-start_number','0',str(folder/'%03d.png')],check=True,timeout=60)
    prepare = module('speech_prepare', 'prepare-isa-speech.py')
    new_pages, new_frames = {}, []
    for page, start in enumerate(range(0,240,48)):
        count = min(48,240-start)
        atlas = Image.new('RGBA',(8*320,((count+7)//8)*320))
        for local, index in enumerate(range(start,start+count)):
            with Image.open(folder/f'{index:03d}.png') as raw:
                frame = prepare.clean_frame(raw)
            atlas.paste(frame,(local%8*320,local//8*320))
            new_frames.append({'source':index,'page':f'new-{page}','local':local})
        path = folder/f'new-speech-{page}.webp'
        atlas.save(path,quality=88,method=4)
        new_pages[f'new-{page}']='data:image/webp;base64,'+base64.b64encode(path.read_bytes()).decode()
        print(f'New take: {start+count}/240 native frames prepared in tmp',flush=True)
    rhythm = module('rhythm_prepare','preview-isa-rhythm.py')
    data = rhythm.prepare_data(wav)
    data['pages'].update(new_pages)
    data['newFrames'] = new_frames[24:204]
    data['newVideo'] = 'data:video/mp4;base64,'+base64.b64encode(source.read_bytes()).decode()
    template = (ROOT/'scripts/isa-new-video-preview.html').read_text(encoding='utf8')
    clock = (ROOT/'scripts/isa-rhythm-timeline.mjs').read_text(encoding='utf8').replace('export function','function')
    output.write_text(template.replace('/*__RHYTHM_CLOCK__*/',clock).replace('/*__VIDEO4_DATA__*/null',
                      json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
    report={'experiment':4,'reviewed':False,'source':source.name,'sourceSha256':digest(source),
            'crop':crop,'fps':24,'extractedFrames':240,'comparisonSourceFrames':[24,203],
            'piperClipSeconds':[3,9],'phoneticAlignment':False,
            'notes':'Compare separate takes; no switching between takes, no runtime integration.'}
    (folder/'inventory.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    for path,sha in before.items():
        if digest(path)!=sha: raise RuntimeError(f'Protected file changed: {path}')
    print(f'{output}\nProduction, source videos and previous HTMLs unchanged.',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav',type=Path,required=True)
    parser.add_argument('--ffmpeg',type=Path,required=True)
    args=parser.parse_args()
    build(args.wav,args.ffmpeg.resolve())
