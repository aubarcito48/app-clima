"""5D: real, explicitly required combinations. Reuses 5C assets without new AI calls."""
import importlib.util
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]

def build():
    folder=ROOT/'tmp/isa-mouth-preview'
    output=folder/'index-5d.html'
    spec=importlib.util.spec_from_file_location('fusion5d',ROOT/'scripts/preview-isa-fusion.py')
    fusion=importlib.util.module_from_spec(spec);spec.loader.exec_module(fusion)
    protected=list(folder.glob('index*.html'))+list((ROOT/'public/isa-bot/runtime').glob('*'))
    protected+=list((ROOT/'public/isa-bot').glob('isa-hablando*-video.mp4'))
    before={p:fusion.digest(p) for p in protected if p.is_file() and p!=output}
    html=(folder/'index-5c.html').read_text(encoding='utf8')
    data=json.loads(html.split('const data=',1)[1].split(';\nconst $=',1)[0])
    data['takes']['1']=data['frames']
    poses={}
    for take,frames in data['takes'].items():
        images=fusion.decode_frames(data['pages'],frames)
        poses[int(take)],_=fusion.features(images)
        for image in images:image.close()
    rms=lambda a:float(np.sqrt(np.mean(a*a)))
    data['eventsByBase']={}
    for base in (1,2,3):
        additions=[take for take in (1,2,3) if take!=base]
        old=poses[base];events=[]
        for take in additions:
            pose=poses[take]
            for length in (24,36):
                for target in range(12,144-length,12):
                    for start in range(0,len(pose)-length,6):
                        events.append({'take':take,'target':target,'start':start,'length':length,
                          'entry':round(rms(pose[start]-old[target-1]),6),
                          'exit':round(rms(old[target+length]-pose[start+length-1]),6),
                          'entryMotion':round(rms((pose[start+1]-pose[start])-(old[target-1]-old[target-2])),6),
                          'exitMotion':round(rms((old[target+length+1]-old[target+length])-(pose[start+length-1]-pose[start+length-2])),6)})
        data['eventsByBase'][base]=events
    data.pop('events',None)
    shared=(ROOT/'scripts/isa-rhubarb-sequence-selector.mjs').read_text(encoding='utf8').replace('export const','const').replace('export function','function')
    selector=(ROOT/'scripts/isa-explicit-combination-selector.mjs').read_text(encoding='utf8')
    selector='\n'.join(line for line in selector.splitlines() if not line.startswith('import ')).replace('export function','function')
    template=(ROOT/'scripts/isa-explicit-combinations-preview.html').read_text(encoding='utf8')
    output.write_text(template.replace('/*__SELECTOR__*/',shared+'\n'+selector).replace('/*__DATA__*/null',json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
    for p,sha in before.items():
        if fusion.digest(p)!=sha:raise RuntimeError(f'Protected file changed: {p}')
    print(f'{output}\nPrevious previews, sources and runtime preserved.')

if __name__=='__main__':build()
