"""Trial 4B: insert continuous pieces of two new takes into the existing take.

All generated files stay in tmp. Candidate seams are visual proposals, not
phonetic labels or guaranteed seamless joins. No source image is warped/blended.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import io

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT/'scripts'/filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def new_take(number, ffmpeg):
    source = ROOT/f'public/isa-bot/isa-hablando{number}-video.mp4'
    folder = ROOT/f'tmp/isa-mouth-preview/video-{number}'
    folder.mkdir(parents=True, exist_ok=True)
    stamp = folder/'fusion-cache.json'
    identity = {'sha256':digest(source),'crop':[300,8,704,704],'size':[320,320],'fps':24,'matte':'speech-clean-v1'}
    paths = [folder/f'fusion-speech-{i}.webp' for i in range(5)]
    reuse = stamp.exists() and json.loads(stamp.read_text()) == identity and all(p.exists() for p in paths)
    if not reuse:
        subprocess.run([str(ffmpeg),'-hide_banner','-loglevel','error','-nostdin','-y','-i',str(source),
                        '-vf','fps=24,crop=704:704:300:8,scale=320:320','-frames:v','240',
                        '-start_number','0',str(folder/'%03d.png')],check=True,timeout=60)
        prepare = module(f'prepare{number}','prepare-isa-speech.py')
        for page,path in enumerate(paths):
            atlas = Image.new('RGBA',(2560,1920))
            for local in range(48):
                with Image.open(folder/f'{page*48+local:03d}.png') as raw:
                    frame = prepare.clean_frame(raw)
                atlas.paste(frame,(local%8*320,local//8*320))
            atlas.save(path,quality=88,method=4)
            print(f'Take {number}: {(page+1)*48}/240 prepared in tmp',flush=True)
        stamp.write_text(json.dumps(identity),encoding='utf8')
    pages={f'take{number}-{i}':'data:image/webp;base64,'+base64.b64encode(p.read_bytes()).decode() for i,p in enumerate(paths)}
    frames=[{'source':i,'page':f'take{number}-{i//48}','local':i%48,'take':number} for i in range(240)]
    return pages,frames


def decode_frames(pages,frames):
    atlases={key:Image.open(io.BytesIO(base64.b64decode(value.split(',',1)[1]))).convert('RGBA') for key,value in pages.items()}
    images=[]
    for f in frames:
        x,y=f['local']%8*320,f['local']//8*320
        images.append(atlases[f['page']].crop((x,y,x+320,y+320)))
    for atlas in atlases.values(): atlas.close()
    return images


def features(images):
    pose,mouth=[] ,[]
    for frame in images:
        background=Image.new('RGBA',frame.size,'#173444');background.alpha_composite(frame)
        rgb=background.convert('RGB')
        face=np.asarray(rgb.crop((106,68,198,166)).resize((46,49)),dtype=np.float32)/255
        face[24:45,8:39]=0  # exclude lips/inner mouth; keep eyes, head outline and upper nose
        body=np.asarray(rgb.resize((32,32)),dtype=np.float32)/255
        body[6:18,10:21]=0
        pose.append(np.concatenate([face.reshape(-1),body.reshape(-1)*.5]))
        mouth.append(np.asarray(rgb.crop((132,126,174,151)).resize((21,13)),dtype=np.float32).reshape(-1)/255)
    return np.asarray(pose),np.asarray(mouth)


def proposals(old_images,new_images,minimum,maximum):
    old,old_mouth=features(old_images);new,new_mouth=features(new_images)
    length=30  # 1.25 seconds in the original frame order
    rows=[]
    rms=lambda value:float(np.sqrt(np.mean(value**2)))
    for target in range(minimum,maximum+1,3):
        for start in range(24,180-length,2):
            entry=rms(new[start]-old[target-1]);exit=rms(old[target+length]-new[start+length-1])
            velocity=rms((new[start+1]-new[start])-(old[target-1]-old[target-2]))
            velocity+=rms((old[target+length+1]-old[target+length])-(new[start+length-1]-new[start+length-2]))
            novelty=rms(new_mouth[start:start+length]-old_mouth[target:target+length])
            rows.append({'target':target,'start':start,'length':length,'cost':entry+exit+.2*velocity,
                         'entry':entry,'exit':exit,'mouthDifference':novelty})
    # Keep distinct alternatives; a different mouth is useful only after pose costs.
    rows.sort(key=lambda row:row['cost'])
    selected=[]
    for row in rows:
        if all(abs(row['start']-other['start'])>=8 or abs(row['target']-other['target'])>=6 for other in selected):
            selected.append(row)
        if len(selected)==6:break
    return selected


def build(wav,ffmpeg):
    folder=ROOT/'tmp/isa-mouth-preview';folder.mkdir(parents=True,exist_ok=True)
    output=folder/'index-4-fusion.html'
    protected=list(folder.glob('index*.html'))+list((ROOT/'public/isa-bot/runtime').glob('*'))
    protected += list((ROOT/'public/isa-bot').glob('isa-hablando*-video.mp4'))
    protected += [ROOT/'src/app/shared/assistant/isabel/isa-speech-manifest.json']
    before={p:digest(p) for p in protected if p.is_file() and p!=output}
    rhythm=module('rhythm','preview-isa-rhythm.py');data=rhythm.prepare_data(wav)
    for row in data['frames']: row['take']=1
    old_images=decode_frames(data['pages'],data['frames'])
    data['takes']={};data['proposals']={}
    for number,window in [(2,(24,42)),(3,(90,108))]:
        pages,frames=new_take(number,ffmpeg)
        images=decode_frames(pages,frames)
        data['proposals'][str(number)]=proposals(old_images,images,*window)
        data['pages'].update(pages);data['takes'][str(number)]=frames
        for image in images:image.close()
    for image in old_images:image.close()
    clock=(ROOT/'scripts/isa-rhythm-timeline.mjs').read_text(encoding='utf8').replace('export function','function')
    template=(ROOT/'scripts/isa-fusion-preview.html').read_text(encoding='utf8')
    output.write_text(template.replace('/*__RHYTHM_CLOCK__*/',clock).replace('/*__FUSION_DATA__*/null',json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
    report={'experiment':'4B','reviewed':False,'phoneticAlignment':False,'fps':24,'audioSeconds':6,
            'proposals':data['proposals'],'sources':{str(i):digest(ROOT/f'public/isa-bot/isa-hablando{i}-video.mp4') for i in (2,3)},
            'strategy':'original + continuous take2 excerpt + original + continuous take3 excerpt + original; hard seams, no image blend'}
    (folder/'fusion-inventory.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    for path,sha in before.items():
        if digest(path)!=sha:raise RuntimeError(f'Protected file changed: {path}')
    print(f'{output}\nTwo continuous excerpts, each 30 frames; sources and runtime unchanged.',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav',type=Path,required=True)
    parser.add_argument('--ffmpeg',type=Path,required=True)
    args=parser.parse_args();build(args.wav,args.ffmpeg.resolve())
