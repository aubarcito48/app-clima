import { fallbackShape, markAt } from './isa-rhubarb-sequence-selector.mjs';

// 5D comparison: a required take must actually appear, or the result is unavailable.
// Required presence is an experimental constraint, not a production recommendation.
export function selectExplicitCombination(data, base = 1, additions = [], weight = 1, automatic = false) {
  if (![1,2,3].includes(base) || additions.some(t => ![1,2,3].includes(t) || t === base)
      || !Number.isFinite(weight) || weight < 0 || weight > 4) throw new Error('Invalid combination');
  const {frameCount: count, blockSize: block, fps, cues, labels, takes, policy} = data;
  const bit = take => 1 << (take - 1);
  const required = automatic ? 0 : additions.reduce((mask,t) => mask | bit(t), 0);
  const wanted = Array.from({length:count}, (_,i) => fallbackShape(markAt(cues,(i+.5)/fps)));
  const baseline = wanted.map((shape,i) => Number(shape !== labels[base][i]));
  const sum = (values,start,length) => values.slice(start,start+length).reduce((a,b)=>a+b,0);
  const candidates = (data.eventsByBase[base] ?? []).filter(e => additions.includes(e.take)
    && e.entry <= policy.maxPoseDistance && e.exit <= policy.maxPoseDistance
    && e.entryMotion <= policy.maxMotionDistance && e.exitMotion <= policy.maxMotionDistance);
  const suffix = Array.from({length: count+block+1}, () => Array(8).fill(null));
  for(let mask=0;mask<8;mask++) if((mask & required) === required) suffix[count][mask] = {cost:0,events:[]};
  for(let time=count-block;time>=0;time-=block) for(let mask=0;mask<8;mask++) {
    const next = suffix[time+block][mask];
    let best = next ? {cost:sum(baseline,time,block)+next.cost,events:next.events} : null;
    for(const e of candidates) {
      const end = time+e.length;
      if(e.target !== time || (mask & bit(e.take)) || time < block || end+block > count) continue;
      let mismatch=0;
      for(let i=0;i<e.length;i++) mismatch+=Number(labels[e.take][e.start+i] !== wanted[time+i]);
      const gain=sum(baseline,time,e.length)-mismatch;
      if(automatic && gain < policy.minimumLabelGain) continue;
      const tail=suffix[end+block][mask|bit(e.take)];
      if(!tail) continue;
      // Strong cut penalty: screen physically first, then favor continuity over labels.
      const seam=8+80*(e.entry+e.exit)+120*(e.entryMotion+e.exitMotion);
      const cost=mismatch+weight*seam+sum(baseline,end,block)+tail.cost;
      if(!best || cost < best.cost) best={cost,events:[{...e,labelGain:gain},...tail.events]};
    }
    suffix[time][mask]=best;
  }
  const chosen=suffix[0][0];
  if(!chosen) return {available:false,base,required:additions,sequence:[],events:[],cost:null,
    reason:'No hay una combinación que incluya estas tomas respetando los límites de continuidad.'};
  const sequence=takes[base].slice(0,count).map((f,i)=>({...f,label:labels[base][i]}));
  for(const e of chosen.events) for(let i=0;i<e.length;i++) sequence[e.target+i]={...takes[e.take][e.start+i],label:labels[e.take][e.start+i]};
  const counts={1:0,2:0,3:0};for(const f of sequence) counts[f.take]++;
  return {available:true,base,required:automatic?[]:additions,sequence,events:chosen.events,cost:chosen.cost,counts};
}
