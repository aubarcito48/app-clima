// Build an offline comparison with the actual portrait and timing code.
import { readFile,writeFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(root,'tmp/isa-mouth-preview'),backend=path.join(root,'../app-clima-backend/tmp/isa-directors-6');
const output=path.join(folder,'index-6.html');
const hashes=async()=>{
 const old=(await readdir(folder)).filter(n=>/^index.*\.html$/.test(n)&&n!=='index-6.html').map(n=>path.join(folder,n));
 const runtime=(await readdir(path.join(root,'public/isa-bot/runtime'))).map(n=>path.join(root,'public/isa-bot/runtime',n));
 return Object.fromEntries(await Promise.all([...old,...runtime].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
};
const before=await hashes(),report=JSON.parse(await readFile(path.join(backend,'plans.json'),'utf8'));
if(!report.audio?.local||!report.audio?.groq)throw new Error('Prepare both real voice samples first');
for(const mode of ['local','groq'])if(report[mode].map(s=>s.text).join(' ')!==report.text)throw new Error('Advice differs between directors');
const safeJson=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const atlas=JSON.parse(await readFile(path.join(root,'src/app/shared/isabel/isa-portrait-manifest.json'),'utf8'));
const speechAtlas=JSON.parse(await readFile(path.join(root,'src/app/shared/isabel/isa-speech-manifest.json'),'utf8'));
const asset=async name=>'data:image/webp;base64,'+(await readFile(path.join(root,'public',name))).toString('base64');
atlas.image=await asset(atlas.image);
for(const page of speechAtlas.pages)page.image=await asset(page.image);
const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'');
const motion=transpile(await readFile(path.join(root,'src/app/shared/isabel/isa-motion.ts'),'utf8'));
let portraitSource=await readFile(path.join(root,'src/app/shared/isabel/isa-portrait.ts'),'utf8');
portraitSource=portraitSource.replace(/^import atlas.*$/m,`const atlas=${safeJson(atlas)};`).replace(/^import speechAtlas.*$/m,`const speechAtlas=${safeJson(speechAtlas)};`).replace(/^import .*isa-motion.*$/m,'');
const portrait=transpile(portraitSource);
const timing=transpile(await readFile(path.join(root,'src/app/models/isa-performance.ts'),'utf8'));
const payload={report,audio:{}};
for(const mode of ['local','groq']){
 const bytes=await readFile(path.join(backend,mode+'.wav'));
 if(createHash('sha256').update(bytes).digest('hex')!==report.audio[mode].sha256)throw new Error('Voice hash mismatch');
 payload.audio[mode]='data:audio/wav;base64,'+bytes.toString('base64');
}
let template=await readFile(path.join(root,'scripts/isa-directors-preview.html'),'utf8');
template=template.replace('/*__RUNTIME6__*/',[motion,portrait,timing].join('\n')).replace('/*__DIRECTORS6__*/null',safeJson(payload));
await writeFile(output,template);
const after=await hashes();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Protected files changed');
console.log(output+'\nActual local/Groq plans, actual Piper WAVs, unchanged portrait/timing sources. Previous HTMLs and runtime preserved.');
