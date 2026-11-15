"""Reuse saved Piper/Rhubarb recordings for isolated 3C phrase comparisons."""
import html
import base64
import importlib.util
import io
import json
from pathlib import Path
import wave

ROOT=Path(__file__).resolve().parents[1]

def module(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/filename)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result

def build():
    folder=ROOT/'tmp/isa-mouth-preview';hub=folder/'index-3c-frases.html'
    generated={hub,*folder.glob('index-3c-frases-*.html')}
    fusion=module('fusion3cphrases','preview-isa-fusion.py')
    motion=module('motion3cphrases','preview-isa-mouth-motion.py')
    first=module('audio3cphrases','preview-isa-mouths.py')
    protected=[p for p in folder.glob('index*.html') if p not in generated]
    protected+=list((ROOT/'public/isa-bot/runtime').glob('*'))
    before={p:fusion.digest(p) for p in protected if p.is_file()}
    base_html=(folder/'index-3c.html').read_text(encoding='utf8')
    prefix,rest=base_html.split('const data=',1)
    encoded,suffix=rest.split(';\nconst $=',1)
    base=json.loads(encoded)
    voice=ROOT.parent/'app-clima-backend/tmp/isa-rhubarb'
    short=voice/'es_short.wav';long=voice/'es_long.wav';english=voice/'en_long.wav'
    _,long_cues,long_duration=first.read_audio(long)
    _,_,short_duration=first.read_audio(short)
    _,_,english_duration=first.read_audio(english)
    split=min((cue['end'] for cue in long_cues if 0<cue['end']<long_duration),key=lambda t:abs(t-long_duration/2))
    cases=[('control','Control: los dos segundos aprobados',None,3,2),
           ('es-corto','Español: consejo corto completo',short,0,short_duration),
           ('es-pausa','Español: pausa artificial de 0,8 s',short,0,short_duration+.8),
           ('es-largo-1','Español: consejo largo, primera parte',long,0,split),
           ('es-largo-2','Español: consejo largo, segunda parte',long,split,long_duration-split),
           ('en','Inglés: fragmento adicional',english,0,min(6,english_duration))]
    reports=[]
    for key,title,wav,start,duration in cases:
        data=dict(base)
        pause=None
        if key=='es-pausa':
            audio,cues,original_duration=first.read_audio(short)
            with wave.open(io.BytesIO(audio)) as source:
                params=source.getparams();pcm=source.readframes(source.getnframes())
            cut=min((c['end'] for c in cues if .5<c['end']<original_duration-.5),key=lambda t:abs(t-original_duration/2))
            cut_frame=round(cut*params.framerate);cut=cut_frame/params.framerate
            silent_frames=round(.8*params.framerate);silence=silent_frames/params.framerate
            stride=params.nchannels*params.sampwidth;offset=cut_frame*stride
            output=io.BytesIO()
            with wave.open(output,'wb') as target:
                target.setparams(params);target.writeframes(pcm[:offset]+bytes(silent_frames*stride)+pcm[offset:])
            clipped=[]
            for c in cues:
                if c['start']<cut:clipped.append({'start':c['start'],'end':min(c['end'],cut),'value':c['value']})
            clipped.append({'start':cut,'end':cut+silence,'value':'X'})
            for c in cues:
                if c['end']>cut:clipped.append({'start':max(c['start'],cut)+silence,'end':c['end']+silence,'value':c['value']})
            data['audio']='data:audio/wav;base64,'+base64.b64encode(output.getvalue()).decode()
            data['cues']=clipped;data['duration']=duration
            data['baselineFirst']=next(i for i,f in enumerate(data['frames']) if f['source']==24)
            pause={'start':cut,'end':cut+silence,'synthetic':True}
        elif wav is not None:
            data['audio'],data['cues']=motion.clip_audio(wav,start,duration)
            data['duration']=duration
            data['baselineFirst']=next(i for i,f in enumerate(data['frames']) if f['source']==24)
        count=round(duration*data['fps'])
        if data['baselineFirst']+count+data['policy']['maxDrift']>len(data['frames']):
            raise ValueError(f'Not enough consecutive native frames for {key}')
        path=folder/f'index-3c-frases-{key}.html'
        page=prefix+'const data='+json.dumps(data,separators=(',',':')).replace('<','\\u003c')+';\nconst $='+suffix
        page=page.replace('Isa · prueba 3C · continuidad',html.escape(title)+' · 3C')
        page=page.replace('<h1>Isa: original + Rhubarb, sin retrocesos</h1>',f'<h1>{html.escape(title)}</h1><p><a href="index-3c-frases.html">Volver a las frases</a> · Duración: {duration:.3f} s · Audio de origen: {start:.3f}–{start+duration:.3f} s.</p>')
        page=page.replace('type="range" min="0" max="1.999"',f'type="range" min="0" max="{max(0,duration-.001):.6f}"')
        page=page.replace('Listo: original y selección hacia adelante con el mismo audio de 3B.',f'Listo: comparación de {duration:.3f} segundos. Mismos parámetros de 3C.')
        page=page.replace('La selección se calcula para los mismos dos segundos de audio almacenados en la 3B.',
          'La selección se calcula para este fragmento del audio almacenado, sin nuevas llamadas a modelos. Los dos tramos del consejo largo cubren su audio completo, pero se comparan por separado; todavía no validan una actuación larga con vueltas de video ni su cierre final.')
        if pause:
            page=page.replace('<audio id="audio"',f'<p><strong>Prueba de estrés:</strong> silencio artificial entre {pause["start"]:.3f} y {pause["end"]:.3f} s. Se conservan las muestras originales y se desplazan sus marcas de Rhubarb; la marca X del silencio se añadió manualmente. No es una frase nueva ni un análisis nuevo de Rhubarb.</p><audio id="audio"')
        page=page.replace("experiment:'3C',reviewed:false,",f"experiment:'3C-frases',caseId:'{key}',reviewed:false,")
        page=page.replace("a.download='isa-forward-3c-review.json'",f"a.download='isa-forward-3c-{key}-review.json'")
        path.write_text(page,encoding='utf8')
        pauses=[c for c in data['cues'] if c['value']=='X']
        reports.append({'id':key,'title':title,'file':path.name,'duration':duration,'audioStart':start,
          'baselineSource':data['frames'][data['baselineFirst']]['source'],'mouthCues':len(data['cues']),
          'restCues':len(pauses),'longestRestCue':max((c['end']-c['start'] for c in pauses),default=0),
          'sourceSha256':fusion.digest(wav) if wav else None,'reviewed':False})
        reports[-1]['syntheticPause']=pause
    rows=''.join(f'<tr><td><a href="{r["file"]}">{html.escape(r["title"])}</a></td><td>{r["duration"]:.2f} s</td><td>{r["mouthCues"]}</td><td>{r["restCues"]} · máximo {r["longestRestCue"]:.2f} s</td></tr>' for r in reports)
    hub.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isa · 3C con distintas frases</title><style>body{max-width:1000px;margin:auto;padding:24px;background:#edf8fc;color:#173c50;font:17px/1.6 'Segoe UI',sans-serif}h1{line-height:1.2}a{color:#175c79}td,th{text-align:left;padding:12px;border-bottom:1px solid #aac8d6}table{border-collapse:collapse;width:100%}.table{overflow:auto}:focus-visible{outline:3px solid #c25b1b}</style></head><body><h1>Isa: probar 3C con distintas frases</h1><p>Comparaciones locales con Piper y marcas reales de Rhubarb ya guardadas. No se han generado nuevas voces ni consultas a Groq. Las etiquetas visuales de las bocas siguen siendo aproximadas.</p><p><a href="index-3c.html">Conservar prueba 3C original</a> · <a href="index-5d.html">Prueba 5D</a></p><div class="table"><table><thead><tr><th>Caso</th><th>Duración</th><th>Marcas</th><th>Marcas de reposo X</th></tr></thead><tbody>'''+rows+'''</tbody></table></div><p>Empezá con los valores iniciales: máximo 2 cuadros omitidos, mínimo 12 consecutivos y prioridad 1. Compará con máximo 0 para ver el original. Revisá labios, cabeza, parpadeos y el instante de cada unión. Guardá la selección si querés compartir qué configuración preferís.</p><p>Los dos tramos españoles cubren el consejo largo completo, dividido en un límite de Rhubarb. Se reproducen por separado para no confundir selección y salto de vuelta del video. El inglés es un fragmento adicional, no una prueba completa. Las marcas X representan reposo estimado por Rhubarb y no certifican silencio acústico. La actuación sigue avanzando durante las pausas: no hay un gesto nuevo de reposo.</p><p>Esto no valida todavía ciclos largos, retorno al reposo, producción ni precisión fonética. Se conservan las demás pruebas. La preferencia visual queda pendiente de revisión.</p></body></html>''',encoding='utf8')
    hub.write_text(hub.read_text(encoding='utf8').replace('<div class="table">','<p><strong>Pausa artificial:</strong> el caso específico añade 0,8 segundos de silencio al consejo corto y desplaza las marcas originales; su X de reposo es manual. No es una grabación nueva ni una nueva salida de Rhubarb.</p><div class="table">',1),encoding='utf8')
    (folder/'forward-phrases-inventory.json').write_text(json.dumps({'experiment':'3C-frases','cases':reports,'reviewed':False},indent=2),encoding='utf8')
    for p,sha in before.items():
        if fusion.digest(p)!=sha:raise RuntimeError(f'Protected file changed: {p}')
    print(str(hub));print(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':build()
