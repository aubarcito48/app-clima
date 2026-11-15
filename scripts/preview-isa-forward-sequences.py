"""3C: forward-only, screened small skips; preserve all earlier trials."""
import importlib.util
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]

def build():
    folder=ROOT/'tmp/isa-mouth-preview';output=folder/'index-3c.html'
    spec=importlib.util.spec_from_file_location('fusion3c',ROOT/'scripts/preview-isa-fusion.py')
    fusion=importlib.util.module_from_spec(spec);spec.loader.exec_module(fusion)
    protected=list(folder.glob('index*.html'))+list((ROOT/'public/isa-bot/runtime').glob('*'))
    protected+=list((ROOT/'public/isa-bot').glob('isa-hablando*-video.mp4'))
    before={p:fusion.digest(p) for p in protected if p.is_file() and p!=output}
    html=(folder/'index-3b.html').read_text(encoding='utf8')
    data=json.loads(html.split('const data=',1)[1].split(';\nconst $=',1)[0])
    images=fusion.decode_frames(data['pages'],data['frames'])
    pose,_=fusion.features(images)
    for image in images:image.close()
    rms=lambda a:float(np.sqrt(np.mean(a*a)))
    data['jumps']={}
    for i in range(1,len(pose)-1):
        data['jumps'][i]=[]
        for skip in range(1,5):
            j=i+skip+1
            if j+1>=len(pose):break
            # Actual jump displacement and incoming/outgoing native velocities.
            displacement=pose[j]-pose[i]
            incoming=pose[i]-pose[i-1];outgoing=pose[j+1]-pose[j]
            error=max(rms(displacement-incoming),rms(outgoing-displacement))
            data['jumps'][i].append({'pose':round(rms(displacement),6),'motion':round(error,6)})
    data['policy']={'maxDrift':12,'maxPoseDistance':.04,'maxMotionDistance':.025}
    data.pop('fullDistances',None);data.pop('distances',None)
    selector=(ROOT/'scripts/isa-forward-sequence-selector.mjs').read_text(encoding='utf8').replace('export function','function')
    template=(ROOT/'scripts/isa-forward-sequences-preview.html').read_text(encoding='utf8')
    output.write_text(template.replace('/*__SELECTOR__*/',selector).replace('/*__DATA__*/null',json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
    for p,sha in before.items():
        if fusion.digest(p)!=sha:raise RuntimeError(f'Protected file changed: {p}')
    print(f'{output}\nOriginal audio and frames reused. Earlier previews/runtime preserved.')

if __name__=='__main__':build()
