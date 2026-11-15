import { fallbackShape, markAt } from './isa-rhubarb-sequence-selector.mjs';

// Preserve the original timeline, substituting only complete, screened excerpts.
// Source frame numbers in different takes are deliberately not compared.
export function selectCombination(data, allowed = [1, 2, 3], continuity = 1) {
  if (!allowed.includes(1) || !Number.isFinite(continuity) || continuity < 0 || continuity > 4) throw new Error('Invalid combination');
  const count = data.frameCount, block = data.blockSize, costs = data.frames.map((_,i) => i < count
    ? Number(data.labels[1][i] !== fallbackShape(markAt(data.cues,(i+.5)/data.fps))) : 0);
  const sum = (values,start,length) => values.slice(start,start+length).reduce((a,b)=>a+b,0);
  const suffix = Array.from({length:count+block+1},()=>Array(4).fill(null));
  for (let mask=0;mask<4;mask++) suffix[count][mask]={cost:0,events:[]};
  for(let time=count-block;time>=0;time-=block)for(let mask=0;mask<4;mask++){
    const continuation=suffix[time+block][mask];
    let best={cost:sum(costs,time,block)+continuation.cost,events:continuation.events};
    for(const event of data.events){
      const bit=1<<(event.take-2),end=time+event.length;
      if(event.target!==time||!allowed.includes(event.take)||(mask&bit)||time<block||end+block>count)continue;
      if(event.entry>data.policy.maxPoseDistance||event.exit>data.policy.maxPoseDistance
         ||event.entryMotion>data.policy.maxMotionDistance||event.exitMotion>data.policy.maxMotionDistance)continue;
      const labels=data.labels[event.take].slice(event.start,event.start+event.length);
      let mismatch=0;
      for(let i=0;i<labels.length;i++)mismatch+=Number(labels[i]!==fallbackShape(markAt(data.cues,(time+i+.5)/data.fps)));
      const gain=sum(costs,time,event.length)-mismatch;
      if(gain<data.policy.minimumLabelGain)continue;
      const next=suffix[end+block][mask|bit];
      if(!next)continue;
      const seam=2+8*(event.entry+event.exit)+12*(event.entryMotion+event.exitMotion);
      const cost=mismatch+continuity*seam+sum(costs,end,block)+next.cost;
      if(cost<best.cost)best={cost,events:[{...event,labelGain:gain},...next.events]};
    }
    suffix[time][mask]=best;
  }
  const selected=suffix[0][0],sequence=data.frames.slice(0,count).map((f,i)=>({...f,label:data.labels[1][i]}));
  for(const event of selected.events)for(let i=0;i<event.length;i++)sequence[event.target+i]={...data.takes[event.take][event.start+i],label:data.labels[event.take][event.start+i]};
  return {sequence,events:selected.events,cost:selected.cost};
}
