"""Isolated 3C acoustic-pause comparison for Spanish, English and a known silence."""
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

def acoustic_pauses(uri):
    with wave.open(io.BytesIO(base64.b64decode(uri.split(',',1)[1])),'rb') as wav:
        if wav.getsampwidth()!=2:raise ValueError('Expected PCM16')
        rate=wav.getframerate();channels=wav.getnchannels();pcm=wav.readframes(wav.getnframes())
    samples=np.frombuffer(pcm,dtype='<i2').astype(np.float64).reshape(-1,channels)/32768
    hop=round(rate*.01);duration=len(samples)/rate
    rms=np.asarray([np.sqrt(np.mean(samples[i:i+hop]**2)) for i in range(0,len(samples),hop)])
    reference=float(np.percentile(rms,90))
    threshold=max(10**(-50/20),min(10**(-38/20),reference*10**(-30/20)))
    exit_threshold=threshold*2;pauses=[];i=0
    while i<len(rms):
        if rms[i]>=threshold:i+=1;continue
        start=i;i+=1
        while i<len(rms) and rms[i]<exit_threshold:i+=1
        a=start*hop/rate;b=min(duration,i*hop/rate)
        before=rms[max(0,start-12):start];after=rms[i:min(len(rms),i+12)]
        if b-a>=.05 and a>=.06 and b<=duration-.06 and len(before) and len(after) and max(before)>=exit_threshold*2 and max(after)>=exit_threshold*2:
            pauses.append({'start':a,'end':b})
    return {'pauses':pauses,'threshold':threshold,'exitThreshold':exit_threshold,'hopSeconds':hop/rate,
            'minimumPauseSeconds':.05,'duration':duration,'rms':rms.round(7).tolist()}

def build():
    folder=ROOT/'tmp/isa-mouth-preview';hub=folder/'index-3c-pausas.html'
    spec=importlib.util.spec_from_file_location('fusion_pauses',ROOT/'scripts/preview-isa-fusion.py')
    fusion=importlib.util.module_from_spec(spec);spec.loader.exec_module(fusion)
    protected=[p for p in folder.glob('index*.html') if not p.name.startswith('index-3c-pausas')]
    protected+=list((ROOT/'public/isa-bot/runtime').glob('*'))
    before={p:fusion.digest(p) for p in protected if p.is_file()}
    selector=(ROOT/'scripts/isa-forward-sequence-selector.mjs').read_text(encoding='utf8').replace('export function','function')
    clock=(ROOT/'scripts/isa-english-rhythm.mjs').read_text(encoding='utf8').replace('export function','function')
    pauses=(ROOT/'scripts/isa-audio-pauses.mjs').read_text(encoding='utf8').replace('export function','function')
    template=(ROOT/'scripts/isa-pause-preview.html').read_text(encoding='utf8');reports=[]
    cases=[('es','Sharvard · español','index-3c-voces-animadas-sharvard-es.html'),
           ('cori','Cori · inglés más pausado','index-3c-voces-animadas-cori-1_08.html'),
           ('amy','Amy · inglés más pausado','index-3c-voces-animadas-amy-1_08.html'),
           ('silencio','Control · silencio artificial de 0,8 s','index-3c-frases-es-pausa.html')]
    for key,title,source in cases:
        encoded=(folder/source).read_text(encoding='utf8').split('const data=',1)[1].split(';\nconst $=',1)[0]
        data=json.loads(encoded);analysis=acoustic_pauses(data['audio'])
        data.update({'caseId':key,'title':title,'acoustics':analysis,'syntheticSilence':key=='silencio'})
        output=folder/f'index-3c-pausas-{key}.html'
        output.write_text(template.replace('/*__SELECTORS__*/',selector+'\n'+clock+'\n'+pauses).replace('/*__DATA__*/null',json.dumps(data,separators=(',',':')).replace('<','\\u003c')),encoding='utf8')
        reports.append({'id':key,'title':title,'file':output.name,'duration':data['duration'],
                        'audioSha256':hashlib.sha256(base64.b64decode(data['audio'].split(',',1)[1])).hexdigest(),'pauses':analysis['pauses'],'threshold':analysis['threshold'],'reviewed':False})
    links=''.join(f'<li><a href="{r["file"]}">{html.escape(r["title"])}</a> · {len(r["pauses"])} pausas internas detectadas</li>' for r in reports)
    hub.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isa · 3C y pausas del audio</title><style>body{max-width:1000px;margin:auto;padding:24px;background:#edf8fc;color:#173c50;font:18px/1.6 'Segoe UI',sans-serif}h1{line-height:1.2}a{color:#175c79}li{margin:20px 0}:focus-visible{outline:3px solid #c25b1b}</style></head><body><h1>Isa: acompañar las pausas reales del audio</h1><p>Izquierda: 3C actual. Derecha: la misma actuación con un reloj que desacelera alrededor de los intervalos de baja energía detectados en el WAV, y retoma gradualmente. No se cambia el audio ni se vuelve a una pose de reposo. Ambos paneles comparten exactamente la misma voz.</p><ul>'''+links+'''</ul><p>Son pausas acústicas estimadas, no puntos o comas del texto ni temporizadores por oración. Se analizan ventanas de unos 10 ms, con umbral relativo, histéresis y duración mínima de 50 ms. No es un detector infalible de habla: puede confundir consonantes suaves o no detectar pausas muy cortas. El control artificial se identifica aparte.</p><p>La intensidad inicial es 0,8; cero reproduce 3C sin esta adaptación. No se congela todo el rostro: el reloj sigue avanzando, aunque cada cuadro dure más. No tenemos una boca separada de ojos y cabeza, así que todavía no se garantiza una boca cerrada y movimiento facial independiente durante cada silencio. La revisión visual queda pendiente.</p><p>La muestra española aprobada y las demás pruebas se conservan. No hay nuevas voces, consultas a Groq, cambios de producción, commit ni push. Esto no valida aún frases nuevas, bucles o cierre final.</p><p><a href="index-3c-ingles-ritmo.html">Prueba inglesa anterior</a> · <a href="index-3c-voces-animadas-sharvard-es.html">Español conservado</a></p></body></html>''',encoding='utf8')
    (folder/'pause-comparison-inventory.json').write_text(json.dumps({'experiment':'3C-pauses','cases':reports,'reviewed':False},indent=2),encoding='utf8')
    for p,sha in before.items():
        if fusion.digest(p)!=sha:raise RuntimeError(f'Protected file changed: {p}')
    print(hub);print(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':build()
