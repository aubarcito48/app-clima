"""Show Isa with real local candidate voices and each recording's own Rhubarb cues."""
import html
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def module(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/filename)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result

def build():
    folder=ROOT/'tmp/isa-mouth-preview';hub=folder/'index-3c-voces-animadas.html'
    fusion=module('fusion_english_candidates','preview-isa-fusion.py');first=module('audio_english_candidates','preview-isa-mouths.py')
    protected=[p for p in folder.glob('index*.html') if not p.name.startswith('index-3c-voces-animadas')]
    protected+=list((ROOT/'public/isa-bot/runtime').glob('*'))
    before={p:fusion.digest(p) for p in protected if p.is_file()}
    backend=ROOT.parent/'app-clima-backend';samples=backend/'tmp/isa-english-candidates'
    report=json.loads((samples/'report.json').read_text(encoding='utf8'))
    base_html=(folder/'index-3c.html').read_text(encoding='utf8');prefix,rest=base_html.split('const data=',1)
    encoded,suffix=rest.split(';\nconst $=',1);base=json.loads(encoded)
    cases=[{'id':'sharvard-es','voice':'sharvard','lengthScaleMultiplier':1,'text':'Referencia de identidad vocal en español; texto diferente de las muestras inglesas.',
            'path':backend/'tmp/isa-rhubarb/es_short.wav'}]
    cases += [{**case,'path':samples/case['file']} for case in report['cases']]
    rows=[]
    for case in cases:
        audio,cues,duration=first.read_audio(case['path'])
        count=round(duration*base['fps']);data={**base,'audio':fusion.module('motion_voice_candidates','preview-isa-mouth-motion.py').uri(case['path'],'audio/wav'),
                      'cues':cues,'duration':duration,'baselineFirst':next(i for i,f in enumerate(base['frames']) if f['source']==24)}
        if data['baselineFirst']+count+data['policy']['maxDrift']>len(data['frames']):raise ValueError('Audio requires a separate loop experiment')
        title=('Sharvard: referencia española' if case['voice']=='sharvard' else case['voice'].capitalize()+(' · normal' if case['lengthScaleMultiplier']==1 else ' · más pausada (length_scale × 1,08)'))
        path=folder/f'index-3c-voces-animadas-{case["id"]}.html'
        page=prefix+'const data='+json.dumps(data,separators=(',',':')).replace('<','\\u003c')+';\nconst $='+suffix
        page=page.replace('Isa · prueba 3C · continuidad',html.escape(title)+' · Isa')
        page=page.replace('<h1>Isa: original + Rhubarb, sin retrocesos</h1>',f'<h1>{html.escape(title)}</h1><p><a href="index-3c-voces-animadas.html">Volver a todas las voces</a> · {duration:.3f} s · Marcas propias de este audio.</p><blockquote>{html.escape(case["text"])}</blockquote>')
        page=page.replace('type="range" min="0" max="1.999"',f'type="range" min="0" max="{duration-.001:.6f}"')
        page=page.replace('Listo: original y selección hacia adelante con el mismo audio de 3B.',f'Listo: {title}, {duration:.3f} segundos. Mismo selector y cuadros de 3C.')
        page=page.replace('La selección se calcula para los mismos dos segundos de audio almacenados en la 3B.',
          'Esta muestra usa su propia salida de Piper y sus propias marcas de Rhubarb. Las voces inglesas leen exactamente el mismo texto; la referencia española tiene otro texto y sirve para escuchar la identidad de Isa, no para medir sincronización entre idiomas. Las velocidades corresponden a síntesis separadas, no a una transformación exacta de un mismo audio.')
        page=page.replace("experiment:'3C',reviewed:false,",f"experiment:'3C-voces-animadas',caseId:'{case['id']}',reviewed:false,")
        page=page.replace("a.download='isa-forward-3c-review.json'",f"a.download='isa-voice-{case['id']}-review.json'")
        path.write_text(page,encoding='utf8')
        rows.append({'id':case['id'],'title':title,'file':path.name,'voice':case['voice'],'lengthScaleMultiplier':case['lengthScaleMultiplier'],
                     'text':case['text'],'duration':duration,'mouthCues':len(cues),'sha256':fusion.digest(case['path']),'reviewed':False})
    table=''.join(f'<tr><td><a href="{r["file"]}">{html.escape(r["title"])}</a></td><td>{r["duration"]:.2f} s</td><td>{r["mouthCues"]}</td></tr>' for r in rows)
    hub.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isa · comparar voces inglesas con animación</title><style>body{max-width:1000px;margin:auto;padding:24px;background:#edf8fc;color:#173c50;font:17px/1.6 'Segoe UI',sans-serif}h1{line-height:1.2}a{color:#175c79}td,th{text-align:left;padding:12px;border-bottom:1px solid #aac8d6}table{border-collapse:collapse;width:100%}.table{overflow:auto}:focus-visible{outline:3px solid #c25b1b}</style></head><body><h1>Isa hablando: candidatas inglesas</h1><p>Escuchá primero Sharvard en español como referencia de identidad. Después compará Lessac (voz inglesa actual), Cori (británica) y Amy (estadounidense) con el mismo consejo inglés. Cori y Amy incluyen una síntesis normal y otra con length_scale multiplicado por 1,08, que busca una lectura más pausada. No implica exactamente 8 % más duración por la variación de la síntesis.</p><blockquote>'''+html.escape(report['text'])+'''</blockquote><div class="table"><table><thead><tr><th>Abrir Isa hablando</th><th>Duración</th><th>Marcas propias de Rhubarb</th></tr></thead><tbody>'''+table+'''</tbody></table></div><p>En cada página se ven el video original continuo y la selección 3C con esa voz. Los cuadros, las etiquetas visuales aproximadas, el inicio del video y los parámetros iniciales son iguales; cada muestra tiene audio y análisis de Rhubarb propios. No se reutilizan tiempos de otra voz. Con «0 cuadros» se ve el control original. Si el selector no cambia cuadros, la página lo informa.</p><p>Evaluá pronunciación, timbre, ritmo, labios, cabeza y pausas. Parecerse a Sharvard en tono no asegura sincronización, y una duración parecida tampoco. Esta comparación usa una sola frase inglesa; no valida todavía otras frases, bucles ni cierre final. La muestra española tiene texto distinto. Revisión visual y auditiva pendiente.</p><p>Modelos candidatos descargados en tmp con revisión fija y hashes verificados. No se cambiaron modelos de producción, .env, servicios ni app. No hay llamadas a Groq. Se usa el reconocimiento phonetic de Rhubarb en todas las muestras, igual que la app.</p><p>Fuentes: <a href="https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/medium/MODEL_CARD">Cori</a> · <a href="https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/amy/medium/MODEL_CARD">Amy</a>. Las condiciones de cada voz se revisan por separado antes de distribuirla; el registro de Piper no sustituye las licencias de las voces.</p><p><a href="index-3c-frases.html">Conservar pruebas con otras frases</a> · <a href="index-3c-voces.html">Comparación anterior de audio</a></p></body></html>''',encoding='utf8')
    (folder/'english-voices-animated-inventory.json').write_text(json.dumps({'revision':report['revision'],'text':report['text'],'cases':rows,'reviewed':False},indent=2),encoding='utf8')
    for p,sha in before.items():
        if fusion.digest(p)!=sha:raise RuntimeError(f'Protected file changed: {p}')
    print(hub);print(json.dumps(rows,ensure_ascii=False,indent=2))

if __name__=='__main__':build()
