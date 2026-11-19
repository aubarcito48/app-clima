// Inspect every native pose/speech frame with the actual SVG filter definition.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'tmp/isa-edge-review');await mkdir(output,{recursive:true});
const template=await readFile(path.join(root,'src/app/shared/assistant/isabel/isabel.html'),'utf8');
const filter=template.match(/<filter id="isa-dark-edge"[\s\S]*?<\/filter>/)[0].replace(/ \/>/g,'/>');
const groups=[];
for(const [name,filename] of [['poses','isa-portrait-manifest.json'],['es','isa-speech-manifest.json'],['en','isa-speech-manifest-en.json']]){
 const manifest=JSON.parse(await readFile(path.join(root,'src/app/shared/assistant/isabel',filename),'utf8'));
 const files=manifest.pages?.map(p=>p.image)??[manifest.image];
 const pages=await Promise.all(files.map(async image=>'data:image/webp;base64,'+(await readFile(path.join(root,'public',image))).toString('base64')));
 const frames=manifest.sourceFrames.map((source,index)=>{
  const page=manifest.pages?.findIndex(p=>index>=p.first&&index<p.first+p.count)??0;
  return {source,page,local:index-(manifest.pages?.[page].first??0)};
 });
 groups.push({name,pages,frames,width:manifest.width,height:manifest.height,columns:manifest.columns});
}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');
 for(const size of [88,200]) {
 const report=await page.evaluate(async({groups,filter,size})=>{
  const decode=async src=>{const image=new Image();image.src=src;await image.decode();return image};
  const reports=[],sheets=[];
  for(const group of groups){
   const pages=await Promise.all(group.pages.map(decode));let minimum=1,maxInteriorDifference=0,changed=0;
   let sheet,sc;
   for(let index=0;index<group.frames.length;index++){
    if(index%48===0){sheet=document.createElement('canvas');sheet.width=1200;sheet.height=2040;sc=sheet.getContext('2d');sc.fillStyle='#112d3d';sc.fillRect(0,0,1200,2040)}
    const f=group.frames[index],canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(pages[f.page],f.local%group.columns*group.width,Math.floor(f.local/group.columns)*group.height,group.width,group.height,0,0,size,size);
    const input=ctx.getImageData(0,0,size,size).data;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs>${filter}</defs><image width="${size}" height="${size}" href="${canvas.toDataURL()}" filter="url(#isa-dark-edge)"/></svg>`;
    const cleaned=await decode('data:image/svg+xml;base64,'+btoa(svg));
    const cleanedCanvas=document.createElement('canvas');cleanedCanvas.width=cleanedCanvas.height=size;
    const cctx=cleanedCanvas.getContext('2d',{willReadFrequently:true});cctx.drawImage(cleaned,0,0);
    const after=cctx.getImageData(0,0,size,size).data;let a=0,b=0,delta=0;
    for(let i=0;i<input.length;i+=4){
     a+=input[i+3];b+=after[i+3];delta+=Math.abs(input[i+3]-after[i+3]);
     if(after[i+3]>input[i+3]+1)throw new Error(`New opaque pixel: ${group.name}/${f.source}`);
     const pixel=i/4,x=pixel%size,y=Math.floor(pixel/size);
     if(x>1&&x<size-2&&y>1&&y<size-2){
      let interior=true;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(input[((y+dy)*size+x+dx)*4+3]!==255)interior=false;
      if(interior)for(let channel=0;channel<3;channel++)maxInteriorDifference=Math.max(maxInteriorDifference,Math.abs(input[i+channel]-after[i+channel]));
     }
    }
    minimum=Math.min(minimum,b/a);if(delta)changed++;
    const tile=index%48,x=tile%4*300,y=Math.floor(tile/4)*170;
    sc.fillStyle='white';sc.font='12px sans-serif';sc.fillText(`${group.name} · ${f.source} · antes / después`,x+4,y+15);
    sc.drawImage(canvas,x,y+20,150,150);sc.drawImage(cleanedCanvas,x+150,y+20,150,150);
    if(index%48===47||index===group.frames.length-1)sheets.push({name:`${group.name}-${Math.floor(index/48)}.png`,data:sheet.toDataURL().split(',')[1]});
   }
   reports.push({group:group.name,size,frames:group.frames.length,changed,minimumAlphaRetained:minimum,maxInteriorDifference});
  }
  return {reports,sheets};
 },{groups,filter,size});
 for(const group of report.reports){assert.equal(group.changed,group.frames);assert.ok(group.minimumAlphaRetained>(size===200?.94:.90));assert.ok(group.maxInteriorDifference<=2)}
 for(const sheet of report.sheets)await writeFile(path.join(output,`${size}-${sheet.name}`),Buffer.from(sheet.data,'base64'));
 await writeFile(path.join(output,`all-frames-${size}.json`),JSON.stringify({filter,passed:true,reports:report.reports,visualReview:'Contact sheets; not a phonetic or temporal quality score.'},null,2));
 console.log(JSON.stringify(report.reports,null,2));
 }
}finally{await browser.close()}
