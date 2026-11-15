"""Preserve Spanish/3C and compare two approved English voice candidates with smooth timing."""
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def build():
    folder=ROOT/'tmp/isa-mouth-preview';hub=folder/'index-3c-ingles-ritmo.html'
    spec=importlib.util.spec_from_file_location('fusion_en_rhythm',ROOT/'scripts/preview-isa-fusion.py')
    fusion=importlib.util.module_from_spec(spec);spec.loader.exec_module(fusion)
    protected=[p for p in folder.glob('index*.html') if not p.name.startswith('index-3c-ingles-ritmo')]
    protected+=list((ROOT/'public/isa-bot/runtime').glob('*'))
    before={p:fusion.digest(p) for p in protected if p.is_file()}
    selector=(ROOT/'scripts/isa-forward-sequence-selector.mjs').read_text(encoding='utf8').replace('export function','function')
    rhythm=(ROOT/'scripts/isa-english-rhythm.mjs').read_text(encoding='utf8').replace('export function','function')
    template=(ROOT/'scripts/isa-english-rhythm-preview.html').read_text(encoding='utf8')
    rows=[]
    for voice in ('cori','amy'):
        source=folder/f'index-3c-voces-animadas-{voice}-1_08.html'
        encoded=source.read_text(encoding='utf8').split('const data=',1)[1].split(';\nconst $=',1)[0]
        data=json.loads(encoded);data['voice']=voice;data['text']='Wear a light jacket. It may rain later; bring an umbrella.'
        data['initialStrength']=1 if voice=='cori' else .75
        output=folder/f'index-3c-ingles-ritmo-{voice}.html'
        page=template.replace('/*__SELECTORS__*/',selector+'\n'+rhythm).replace('/*__DATA__*/null',json.dumps(data,separators=(',',':')).replace('<','\\u003c'))
        output.write_text(page,encoding='utf8');rows.append({'voice':voice,'file':output.name,'duration':data['duration'],'reviewed':False})
    links=''.join(f'<li><a href="{r["file"]}">{r["voice"].capitalize()} más pausada: 3C actual frente a ritmo adaptado</a> · {r["duration"]:.2f} s</li>' for r in rows)
    hub.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isa · 3C inglés con ritmo adaptado</title><style>body{max-width:1000px;margin:auto;padding:24px;background:#edf8fc;color:#173c50;font:18px/1.6 'Segoe UI',sans-serif}h1{line-height:1.2}a{color:#175c79}li{margin:20px 0}:focus-visible{outline:3px solid #c25b1b}</style></head><body><h1>Isa: ajustar el ritmo de la animación inglesa</h1><p>Cori y Amy más pausadas, con los mismos audios que ya elegiste. En cada comparación: izquierda, 3C actual; derecha, los mismos cuadros de 3C con velocidad gradual orientada por las marcas de Rhubarb de esa voz. No se cambia el audio, su duración ni su tono.</p><ul>'''+links+'''</ul><p>Empezá con intensidad 0,75 (velocidad entre 0,85× y 1,15×). Con intensidad cero ambas animaciones deben coincidir. Compará labios, parpadeos, movimiento de cabeza y las uniones heredadas de 3C. Ritmo adaptado no equivale a sincronización fonética garantizada.</p><p>La referencia española y todas las pruebas anteriores se conservan. No hay nuevas consultas, generación de voces, commit, push ni cambios en la aplicación o producción. Esto prueba una sola frase inglesa; quedan pendientes otras frases, silencios largos, ciclos y cierre final.</p><p><a href="index-3c-voces-animadas.html">Comparación anterior de voces</a> · <a href="index-3c-voces-animadas-sharvard-es.html">Español conservado</a></p></body></html>''',encoding='utf8')
    hub.write_text(hub.read_text(encoding='utf8').replace('Empezá con intensidad 0,75 (velocidad entre 0,85× y 1,15×).',
        'Cori abre con intensidad 1 (límites 0,80×–1,20×); Amy con 0,75 (0,85×–1,15×). En esta frase, Cori mantiene el reloj original a intensidad 0,75 y solo elige otro en 1. Cada página muestra la velocidad realmente elegida.'),encoding='utf8')
    (folder/'english-rhythm-inventory.json').write_text(json.dumps({'experiment':'3C-English-rhythm','cases':rows,'reviewed':False},indent=2),encoding='utf8')
    for p,sha in before.items():
        if fusion.digest(p)!=sha:raise RuntimeError(f'Protected file changed: {p}')
    print(hub)

if __name__=='__main__':build()
