"""Trial 5C: compare original, +take2, +take3 and +both with independent clocks."""
import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np

ROOT=Path(__file__).resolve().parents[1]


def module(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/filename)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result


def build(wav,ffmpeg):
    fusion=module('fusion5c','preview-isa-fusion.py');rhythm=module('rhythm5c','preview-isa-rhythm.py')
    base=module('catalog5c','preview-isa-rhubarb-sequences.py');whole=module('old5c','preview-isa-whole-frames.py')
    first=module('audio5c','preview-isa-mouths.py')
    folder=ROOT/'tmp/isa-mouth-preview';output=folder/'index-5c.html'
    protected=list(folder.glob('index*.html'))+list((ROOT/'public/isa-bot/runtime').glob('*'))
    protected+=list((ROOT/'public/isa-bot').glob('isa-hablando*-video.mp4'))
    protected+=[ROOT/'src/app/shared/assistant/isabel/isa-speech-manifest.json']
    before={p:fusion.digest(p) for p in protected if p.is_file() and p!=output}
    data=rhythm.prepare_data(wav)
    _,cues,_=first.read_audio(wav)
    data['cues']=[{'start':max(0,c['start']-3),'end':min(6,c['end']-3),'value':c['value']} for c in cues if c['end']>3 and c['start']<9]
    data['frameCount']=144;data['blockSize']=12
    data['frames']=[{**f,'take':1} for f in data['frames']]
    data['takes']={1:data['frames']};annotations={1:whole.LABELS}
    for take in (2,3):
        pages,frames=fusion.new_take(take,ffmpeg);data['pages'].update(pages);data['takes'][take]=frames[24:204]
        annotations[take]=dict(zip(range(0,240,6),base.NEW_LABELS[take]))
    poses={};data['labels']={}
    for take,frames in data['takes'].items():
        keys=sorted(annotations[take]);data['labels'][take]=[annotations[take][min(keys,key=lambda k:abs(k-f['source']))] for f in frames]
        pages={key:value for key,value in data['pages'].items() if key in {f['page'] for f in frames}}
        images=fusion.decode_frames(pages,frames);poses[take],_=fusion.features(images)
        for image in images:image.close()
    rms=lambda a:float(np.sqrt(np.mean(a*a)))
    old=poses[1];events=[]
    for take in (2,3):
        pose=poses[take]
        for length in (24,36):
            for target in range(12,144-length,12):
                for start in range(0,len(pose)-length,6):
                    # Compare actual pose AND entry/exit motion, never video clocks.
                    entry=rms(pose[start]-old[target-1]);exit=rms(old[target+length]-pose[start+length-1])
                    entry_motion=rms((pose[start+1]-pose[start])-(old[target-1]-old[target-2]))
                    exit_motion=rms((old[target+length+1]-old[target+length])-(pose[start+length-1]-pose[start+length-2]))
                    events.append({'take':take,'target':target,'start':start,'length':length,'entry':round(entry,6),'exit':round(exit,6),
                                   'entryMotion':round(entry_motion,6),'exitMotion':round(exit_motion,6)})
    data['events']=events
    data['policy']={'maxPoseDistance':.06,'maxMotionDistance':.04,'minimumLabelGain':2,
                    'gapFrames':12,'maximumUsesPerNewTake':1,'note':'Heuristic limits; visual review required.'}
    shared=(ROOT/'scripts/isa-rhubarb-sequence-selector.mjs').read_text(encoding='utf8').replace('export const','const').replace('export function','function')
    selector=(ROOT/'scripts/isa-combination-selector.mjs').read_text(encoding='utf8')
    selector='\n'.join(line for line in selector.splitlines() if not line.startswith('import ')).replace('export function','function')
    template=(ROOT/'scripts/isa-combinations-preview.html').read_text(encoding='utf8')
    output.write_text(template.replace('/*__COMBINATION_SELECTOR__*/',shared+'\n'+selector).replace('/*__COMBINATION_DATA__*/null',
                      json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
    report={'experiment':'5C','reviewed':False,'policy':data['policy'],'candidateEvents':len(events),'audioClipSeconds':[3,9],
            'audioSha256':fusion.digest(wav),'sourceSha256':{take:fusion.digest(ROOT/f'public/isa-bot/isa-hablando{take}-video.mp4') for take in (2,3)},
            'phoneticAccuracy':'not measured; same provisional visual labels as trial 5','events':events}
    (folder/'combinations-inventory.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    for path,sha in before.items():
        if fusion.digest(path)!=sha:raise RuntimeError(f'Protected file changed: {path}')
    print(f'{output}\n{len(events)} candidate insertions with independent take clocks. Earlier previews/runtime preserved.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav',type=Path,required=True);parser.add_argument('--ffmpeg',type=Path,required=True)
    args=parser.parse_args();build(args.wav,args.ffmpeg.resolve())
