"""Trial 5: real saved Rhubarb cues select continuous clips from three takes."""
import argparse
import json
from pathlib import Path

import numpy as np

import importlib.util

ROOT=Path(__file__).resolve().parents[1]


def module(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/filename)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result


# Visual proposals from the contact sheets every six source frames. Intermediate
# labels are nearest-neighbor estimates, not measured phonetic ground truth.
NEW_LABELS={
    2: 'XXXXBDBE' 'XXXEFBXB' 'EXXXXEFE' 'FXEBXBXX' 'XXFFXBDB',
    3: 'XXXXBXDD' 'EBXXXXXX' 'BXXBEBXX' 'XXXBDDFD' 'DBXXXXXX',
}


def build(wav,ffmpeg,stable=False):
    fusion=module('fusion5','preview-isa-fusion.py')
    rhythm=module('rhythm5','preview-isa-rhythm.py')
    first=module('audio5','preview-isa-mouths.py')
    whole=module('catalog5','preview-isa-whole-frames.py')
    folder=ROOT/'tmp/isa-mouth-preview';folder.mkdir(parents=True,exist_ok=True)
    output=folder/('index-5b.html' if stable else 'index-5.html')
    protected=list(folder.glob('index*.html'))+list((ROOT/'public/isa-bot/runtime').glob('*'))
    protected+=list((ROOT/'public/isa-bot').glob('isa-hablando*-video.mp4'))
    protected+=[ROOT/'src/app/shared/isabel/isa-speech-manifest.json']
    hashes={p:fusion.digest(p) for p in protected if p.is_file() and p!=output}
    data=rhythm.prepare_data(wav)
    _,cues,duration=first.read_audio(wav)
    if duration<9:raise ValueError('The saved cue timeline is too short.')
    data['cues']=[{'start':max(0,c['start']-3),'end':min(6,c['end']-3),'value':c['value']}
                  for c in cues if c['end']>3 and c['start']<9]
    data['frameCount']=144;data['clipLength']=12
    frames_by_take={1:[{**f,'take':1} for f in data['frames']]}
    old_labels={key:value for key,value in whole.LABELS.items()}
    annotations={1:old_labels}
    for take in (2,3):
        if len(NEW_LABELS[take])!=40:raise ValueError('Invalid visual annotation count')
        pages,frames=fusion.new_take(take,ffmpeg)
        data['pages'].update(pages);frames_by_take[take]=frames[24:204]
        annotations[take]=dict(zip(range(0,240,6),NEW_LABELS[take]))
    catalog=[];poses=[];all_labels={}
    for take,frames in frames_by_take.items():
        keys=sorted(annotations[take])
        labels=[annotations[take][min(keys,key=lambda key:abs(key-f['source']))] for f in frames]
        all_labels[take]=labels
        pages={key:value for key,value in data['pages'].items() if key in {f['page'] for f in frames}}
        images=fusion.decode_frames(pages,frames)
        pose,_=fusion.features(images)
        if take==1: baseline=pose
        for start in range(0,len(frames)-12+1,6):
            catalog.append({'take':take,'start':frames[start]['source'],'frames':frames[start:start+12],
                            'labels':labels[start:start+12],'reviewed':False})
            poses.append((pose[start],pose[start+11]))
        for image in images:image.close()
    starts=np.asarray([p[0] for p in poses]);ends=np.asarray([p[1] for p in poses])
    data['transitions']=[np.sqrt(((starts-end)**2).mean(axis=1)).round(5).tolist() for end in ends]
    data['baselineCosts']=[np.sqrt(((starts-row)**2).mean(axis=1)).round(5).tolist() for row in baseline[:144]]
    data['clips']=catalog
    data['annotations']=[{'take':take,'sourceFrame':source,'shape':shape,'reviewed':False}
                         for take,rows in annotations.items() for source,shape in rows.items()]
    selector=(ROOT/'scripts/isa-rhubarb-sequence-selector.mjs').read_text(encoding='utf8').replace('export const','const').replace('export function','function')
    template=(ROOT/'scripts/isa-rhubarb-sequences-preview.html').read_text(encoding='utf8')
    if stable:
        data['stablePolicy']={'maxPoseDistance':0.035,'maxForwardSkip':6,'holdBlocks':3}
        strict=(ROOT/'scripts/isa-stable-sequence-selector.mjs').read_text(encoding='utf8')
        strict='\n'.join(line for line in strict.splitlines() if not line.startswith('import ')).replace('export function','function')
        selector+='\n'+strict
        template=template.replace('Prueba 5.', 'Prueba 5B.').replace('prueba 5 ·','prueba 5B ·')
        template=template.replace('Isa: Rhubarb guía las secuencias','Isa: continuidad antes de cambiar de boca')
        template=template.replace('<a href="index-4-fusion.html">', '<a href="index-5.html">Prueba 5 anterior</a> · <a href="index-4-fusion.html">')
        template=template.replace('sequence=selectSequences(data,', 'sequence=selectStableSequences(data,')
        template=template.replace('experiment:5,reviewed:false,', "experiment:'5B',reviewed:false,policy:data.stablePolicy,")
        template=template.replace("a.download='isa-rhubarb-sequences-review.json'", "a.download='isa-stable-sequences-review.json'")
        template=template.replace('Un tramo de 0,5 s puede contener varios sonidos.',
            'Esta variante empieza en la pose original. Prohíbe saltos dentro de una misma toma y retrocesos del índice de origen al cambiar de toma. Rechaza enlaces con distancia de pose superior a 0,035 y conserva al menos 1,5 s de recorrido tras cada cambio. Estos límites son experimentales, no una garantía perceptiva. Si no hay un enlace permitido, continúa la toma aunque la boca coincida menos. Un tramo de 0,5 s puede contener varios sonidos.')
        template=template.replace('habrá compromisos y pueden quedar saltos entre tramos.',
            'habrá compromisos; los enlaces permitidos todavía necesitan revisión visual. Las tres tomas están disponibles, pero una puede no usarse si no ofrece una unión compatible.')
    output.write_text(template.replace('/*__SELECTOR__*/',selector).replace('/*__RHUBARB5_DATA__*/null',json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
    report={'experiment':'5B' if stable else 5,'reviewed':False,'audioSha256':fusion.digest(wav),'audioClipSeconds':[3,9],
            'cues':data['cues'],'clips':[{k:v for k,v in c.items() if k!='frames'} for c in catalog],
            'annotations':data['annotations'],'notes':'Real Rhubarb times; provisional visual labels and nearest-frame estimates. No phonetic accuracy claim.'}
    if stable:report['policy']=data['stablePolicy']
    (folder/('stable-sequences-inventory.json' if stable else 'rhubarb-sequences-inventory.json')).write_text(json.dumps(report,indent=2),encoding='utf8')
    for path,digest in hashes.items():
        if fusion.digest(path)!=digest:raise RuntimeError(f'Protected file changed: {path}')
    print(f'{output}\n{len(data["cues"])} saved Rhubarb cues; {len(catalog)} 12-frame candidates from 3 takes. Earlier previews and runtime unchanged.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav',type=Path,required=True);parser.add_argument('--ffmpeg',type=Path,required=True)
    parser.add_argument('--stable',action='store_true')
    args=parser.parse_args();build(args.wav,args.ffmpeg.resolve(),args.stable)
