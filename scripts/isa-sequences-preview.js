// Inserted only in the isolated 3B preview. Plans contain native frame indices.
function nearestLabel(index){
 let nearest=-1,distance=Infinity;
 for(let j=0;j<data.candidates.length;j++)if(labels[j]&&Math.abs(index-data.candidates[j])<distance){distance=Math.abs(index-data.candidates[j]);nearest=j}
 return nearest;
}
function rebuild(){
 const length=+$('length').value,weight=+$('weight').value;
 const starts=[...new Set(data.candidates.filter((_,j)=>labels[j]).map(i=>Math.max(0,Math.min(data.frames.length-length,i-2))))];
 if(!starts.length){plan=[];$('status').textContent='Elegí al menos un cuadro en la galería.';return}
 const blocks=Math.ceil(count/length),n=starts.length,back=[];
 let costs=new Array(n).fill(0);
 for(let block=0;block<blocks;block++){
  const time=block*length,span=Math.min(length,count-time),row=new Array(n).fill(Infinity),prev=new Array(n).fill(-1);
  for(let j=0;j<n;j++){
   let emission=0;
   for(let offset=0;offset<span;offset++){
    const index=starts[j]+offset,target=mapped(cueAt((time+offset+.5)/data.fps));
    emission+=(labels[nearestLabel(index)]===target?0:2)+weight*data.fullDistances[data.baselineFirst+time+offset][index]*8;
   }
   if(block===0){row[j]=emission;continue}
   for(let k=0;k<n;k++){
    const end=starts[k]+length-1,entry=starts[j],gap=Math.abs(entry-end-1);
    const transition=weight*(data.fullDistances[end][entry]*32+Math.min(gap,48)*.012);
    const cost=costs[k]+emission+transition;
    if(cost<row[j]){row[j]=cost;prev[j]=k}
   }
  }
  back.push(prev);costs=row;
 }
 let best=costs.indexOf(Math.min(...costs));const clips=new Array(blocks);
 for(let block=blocks-1;block>=0;block--){clips[block]=starts[best];best=back[block][best]}
 plan=Array.from({length:count},(_,t)=>clips[Math.floor(t/length)]+t%length);
 $('weightValue').value=weight;
 $('status').textContent=`Listo: ${blocks} tramos de ${length} cuadros a ${data.fps} FPS. Los cuadros internos avanzan en orden; los enlaces entre tramos siguen en revisión.`;
 render();
}
function render(){
 if(!ready||!plan.length)return;
 const t=Math.min(count-1,Math.floor(audio.currentTime*data.fps+1e-4)),index=plan[t],raw=cueAt((t+.5)/data.fps),shape=labels[nearestLabel(index)];
 draw($('original'),data.baselineFirst+t);draw($('selected'),index);
 $('originalInfo').textContent=`Cuadro ${data.frames[data.baselineFirst+t].source}`;
 $('selectedInfo').textContent=`Cuadro ${data.frames[index].source} · tramo ${Math.floor(t/+$('length').value)+1} · boca estimada ${shape} · marca ${raw}${raw!==mapped(raw)?' → '+mapped(raw)+' aproximada':''}`;
 $('time').value=audio.currentTime;$('timeValue').value=audio.currentTime.toFixed(2)+' s';
}
