"""3C pause baseline retained; add conservative short acoustic gaps in a separate trial."""
import base64
import hashlib
import html
import importlib.util
import io
import json
from pathlib import Path
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]

def micro_gaps(uri,analysis):
    with wave.open(io.BytesIO(base64.b64decode(uri.split(',',1)[1])),'rb') as wav:
        if wav.getsampwidth()!=2:raise ValueError('Expected PCM16')
        rate=wav.getframerate();channels=wav.getnchannels();raw=wav.readframes(wav.getnframes())
    pcm=np.frombuffer(raw,dtype='<i2').astype(np.float64).reshape(-1,channels)/32768
    duration=len(pcm)/rate;hop=round(rate*.005)
    rms=np.asarray([np.sqrt(np.mean(pcm[i:i+hop]**2)) for i in range(0,len(pcm),hop)])
    threshold=min(analysis['threshold']*.5,10**(-50/20));exit_threshold=threshold*1.5
    gaps=[];i=0
    while i<len(rms):
        if rms[i]>=threshold:i+=1;continue
        start=i;i+=1
        while i<len(rms) and rms[i]<exit_threshold:i+=1
        a=start*hop/rate;b=min(duration,i*hop/rate)
        if not .018<=b-a<.05 or a<.08 or b>duration-.08:continue
        if any(a<p['end']+.015 and b>p['start']-.015 for p in analysis['pauses']):continue
        before=rms[max(0,start-8):start];after=rms[i:min(len(rms),i+8)]
        if len(before) and len(after) and max(before)>exit_threshold*2 and max(after)>exit_threshold*2:gaps.append({'start':a,'end':b})
    return{'gaps':gaps,'threshold':threshold,'exitThreshold':exit_threshold,'hopSeconds':hop/rate,'minimumSeconds':.018,'maximumSeconds':.05}

def build():
    folder=ROOT/'tmp/isa-mouth-preview';hub=folder/'index-3c-micropausas.html'
    spec=importlib.util.spec_from_file_location('fusion_micropauses',ROOT/'scripts/preview-isa-fusion.py')
    fusion=importlib.util.module_from_spec(spec);spec.loader.exec_module(fusion)
    protected=[p for p in folder.glob('index*.html') if not p.name.startswith('index-3c-micropausas')]
    protected+=list((ROOT/'public/isa-bot/runtime').glob('*'));before={p:fusion.digest(p) for p in protected if p.is_file()}
    selectors='\n'.join((ROOT/'scripts'/name).read_text(encoding='utf8').replace('export function','function') for name in (
        'isa-forward-sequence-selector.mjs','isa-english-rhythm.mjs','isa-audio-pauses.mjs','isa-micro-pauses.mjs'))
    selectors='\n'.join(line for line in selectors.splitlines() if not line.startswith('import '))
    template=(ROOT/'scripts/isa-micro-pause-preview.html').read_text(encoding='utf8');reports=[]
    for key in ('es','cori','amy'):
        encoded=(folder/f'index-3c-pausas-{key}.html').read_text(encoding='utf8').split('const data=',1)[1].split(';\nconst $=',1)[0]
        data=json.loads(encoded);data['micro']=micro_gaps(data['audio'],data['acoustics'])
        output=folder/f'index-3c-micropausas-{key}.html'
        output.write_text(template.replace('/*__SELECTORS__*/',selectors).replace('/*__DATA__*/null',json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
        reports.append({'id':key,'file':output.name,'title':data['title'],'duration':data['duration'],
                        'longPauses':data['acoustics']['pauses'],'microGaps':data['micro']['gaps'],
                        'audioSha256':hashlib.sha256(base64.b64decode(data['audio'].split(',',1)[1])).hexdigest(),'reviewed':False})
    links=''.join(f'<li><a href="{r["file"]}">{html.escape(r["title"])}</a> · {len(r["microGaps"])} huecos breves adicionales</li>' for r in reports)
    hub.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isa · 3C con micropausas</title><style>body{max-width:1000px;margin:auto;padding:24px;background:#edf8fc;color:#173c50;font:18px/1.6 'Segoe UI',sans-serif}h1{line-height:1.2}a{color:#175c79}li{margin:20px 0}:focus-visible{outline:3px solid #c25b1b}</style></head><body><h1>Isa: micropausas sin salir de la actuación</h1><p>Izquierda: la versión con pausas que ya aprobaste. Derecha: esa misma base, añadiendo retenciones muy breves ante huecos de baja energía de entre 18 y 50 ms. Se analiza el audio; no se inserta silencio ni se presupone que cada palabra tiene una pausa.</p><ul>'''+links+'''</ul><p>Empezá con intensidad 1 para comparar y probá 0,5 si sentís que retiene demasiado. Cero conserva exactamente la versión anterior. La retención central dura como máximo 16 ms por hueco, con transiciones suaves. Se limita el retraso extra y la recuperación, sin saltar de golpe a la siguiente parte.</p><p>Esto no identifica límites lingüísticos entre palabras y oraciones. Algunas consonantes tienen huecos parecidos: la tabla permite revisar falsos positivos. Las pausas anteriores mantienen su detección y parámetros; la fase de los cuadros puede desplazarse por el ajuste nuevo.</p><p>Los cuadros contienen todo el rostro: una retención también afecta ojos y cabeza durante ese intervalo. A 24 FPS (41,7 ms por cuadro), no puede representarse cada microevento con una imagen nueva. Buscamos naturalidad, no precisión temporal ilimitada. La revisión visual queda pendiente.</p><p>Las referencias españolas e inglesas se conservan. Sin nuevas voces, Groq, producción, commit ni push. El silencio artificial de 0,8 s no se usa en esta comparación.</p><p><a href="index-3c-pausas.html">Versión anterior con pausas</a> · <a href="index-3c-voces-animadas-sharvard-es.html">Español original conservado</a></p></body></html>''',encoding='utf8')
    (folder/'micro-pause-inventory.json').write_text(json.dumps({'experiment':'3C-micro-pauses','cases':reports,'reviewed':False},indent=2),encoding='utf8')
    for p,sha in before.items():
        if fusion.digest(p)!=sha:raise RuntimeError(f'Protected file changed: {p}')
    print(hub);print(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':build()
