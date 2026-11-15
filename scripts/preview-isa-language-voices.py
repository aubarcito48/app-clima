"""Compare existing local WAVs: the same English text through two production voice routes."""
import base64
import hashlib
import json
from pathlib import Path
import wave

ROOT=Path(__file__).resolve().parents[1]
TEXT='Wear a light jacket. It may rain later; bring an umbrella.'

def build():
    backend=ROOT.parent/'app-clima-backend'
    folder=ROOT/'tmp/isa-mouth-preview';folder.mkdir(parents=True,exist_ok=True)
    voices=[]
    for key,title,filename,model,speaker in (
        ('es','Voz española leyendo inglés','english-with-sharvard.wav','es_ES-sharvard-medium',1),
        ('en','Voz inglesa leyendo inglés','english-with-lessac.wav','en_US-lessac-medium',0)):
        audio=backend/'tmp/isa-language-ab'/filename
        config=json.loads((backend/f'models/piper-sharvard/{model}.onnx.json').read_text(encoding='utf8'))
        with wave.open(str(audio),'rb') as wav:
            if wav.getsampwidth()!=2 or wav.getnchannels()!=1:raise ValueError('Expected mono PCM16')
            seconds=wav.getnframes()/wav.getframerate()
        voices.append({'id':key,'title':title,'model':model,'speaker':speaker,
                       'phonemizer':config['espeak']['voice'],'duration':seconds,
                       'sha256':hashlib.sha256(audio.read_bytes()).hexdigest(),
                       'audio':'data:audio/wav;base64,'+base64.b64encode(audio.read_bytes()).decode()})
    rows=''.join(f'<section><h2>{v["title"]}</h2><p>{v["model"]} · hablante {v["speaker"]} · fonetizador {v["phonemizer"]} · {v["duration"]:.2f} s</p><audio id="{v["id"]}" controls preload="metadata" aria-label="{v["title"]}" src="{v["audio"]}"></audio></section>' for v in voices)
    page='''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isa · español e inglés con dos voces</title><style>body{max-width:1000px;margin:auto;padding:24px;background:#edf8fc;color:#173c50;font:17px/1.6 'Segoe UI',sans-serif}h1{line-height:1.2}section{padding:20px;background:white;border:1px solid #9ebfce;border-radius:14px;margin:20px 0}h2{font-size:21px}audio{width:100%}a{color:#175c79}button{font:inherit;background:#216c8a;color:white;border:0;border-radius:8px;min-height:44px;padding:10px;cursor:pointer}:focus-visible{outline:3px solid #c25b1b}</style></head><body><h1>La misma frase inglesa con dos voces de Piper</h1><p><a href="index-3c-frases.html">Volver a las frases de animación</a></p><blockquote>'''+TEXT+'''</blockquote><p>Sharvard declara español de España; esta prueba no lo convierte en una voz bilingüe. Su ruta española conserva el fonetizador español. Lessac utiliza el fonetizador inglés estadounidense. La comparación evalúa cómo suena cada ruta actual, no aísla solamente los pesos del modelo.</p>'''+rows+'''<button id="stop">Detener audios</button><p>Escuchá especialmente “wear”, “jacket”, “rain”, “later” y “umbrella”. Evaluá pronunciación, comprensión y si querés conservar esa identidad vocal. Una duración parecida no implica pronunciación correcta.</p><p>Audios generados localmente con el mismo texto y los ajustes normales del worker, sin director ni Rhubarb. La calidad perceptual queda pendiente; no se calculó precisión de transcripción ni puede atribuirse todavía el problema de animación al idioma o a la voz. No se modificaron modelos, configuraciones ni producción.</p><script>const audios=[...document.querySelectorAll('audio')];for(const audio of audios)audio.addEventListener('play',()=>{for(const other of audios)if(other!==audio)other.pause()});document.getElementById('stop').addEventListener('click',()=>audios.forEach(a=>a.pause()));</script></body></html>'''
    output=folder/'index-3c-voces.html';output.write_text(page,encoding='utf8')
    report={'text':TEXT,'reviewed':False,'voices':[{k:v for k,v in voice.items() if k!='audio'} for voice in voices]}
    (folder/'language-voices-inventory.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print(output);print(json.dumps(report,indent=2))

if __name__=='__main__':build()
