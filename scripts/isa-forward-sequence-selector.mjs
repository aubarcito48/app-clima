// Trial 3C: only move forward through the original. Never replay or hold frames.
export function selectForwardSequence(data, labels, {maxSkip=2,minRun=12,weight=1}={}) {
  if(![0,1,2,4].includes(maxSkip)||![8,12,16].includes(minRun)||!Number.isFinite(weight)||weight<0||weight>4)throw new Error('Invalid policy');
  const count=Math.round(data.duration*data.fps),first=data.baselineFirst;
  const mapped=shape=>({A:'X',G:'B',H:'C'}[shape]??shape);
  const shapeAt=index=>{
    let nearest=-1,distance=Infinity;
    for(let j=0;j<data.candidates.length;j++)if(labels[j]&&Math.abs(index-data.candidates[j])<distance){nearest=j;distance=Math.abs(index-data.candidates[j])}
    return nearest<0?null:labels[nearest];
  };
  const wanted=Array.from({length:count},(_,t)=>mapped(data.cues.find(c=>c.start<=(t+.5)/data.fps&&(t+.5)/data.fps<c.end)?.value??'X'));
  const emission=(index,t)=>Number(shapeAt(index)!==wanted[t])*2;
  const baseline=Array.from({length:count},(_,i)=>first+i),baselineCost=baseline.reduce((cost,i,t)=>cost+emission(i,t),0);
  if(!labels.some(Boolean))return{plan:baseline,seams:[],cost:baselineCost,baselineCost,disabled:true};
  let states=new Map([[`${first}:1`,{index:first,run:1,cost:emission(first,0),plan:[first],seams:[]}]]);
  for(let t=1;t<count;t++){
    const next=new Map();
    for(const state of states.values())for(let skip=0;skip<=maxSkip;skip++){
      const index=state.index+1+skip,drift=index-first-t;
      if(index>=data.frames.length||drift>data.policy.maxDrift)continue;
      if(skip&&(state.run<minRun||count-t<minRun))continue;
      const jump=skip?data.jumps[state.index]?.[skip-1]:null;
      if(skip&&(!jump||jump.pose>data.policy.maxPoseDistance||jump.motion>data.policy.maxMotionDistance))continue;
      const run=skip?1:Math.min(minRun,state.run+1),key=`${index}:${run}`;
      const penalty=skip?weight*(2+skip*.6+jump.pose*30+jump.motion*40):0;
      const cost=state.cost+emission(index,t)+penalty,previous=next.get(key);
      if(!previous||cost<previous.cost||(cost===previous.cost&&state.seams.length<previous.seams.length))next.set(key,{index,run,cost,plan:[...state.plan,index],seams:skip?[...state.seams,{time:t/data.fps,from:state.index,to:index,skip,...jump}]:state.seams});
    }
    states=next;
  }
  const chosen=[...states.values()].sort((a,b)=>a.cost-b.cost||a.seams.length-b.seams.length||a.index-b.index)[0];
  if(!chosen||chosen.cost>=baselineCost)return{plan:baseline,seams:[],cost:baselineCost,baselineCost,disabled:false};
  return{plan:chosen.plan,seams:chosen.seams,cost:chosen.cost,baselineCost,disabled:false};
}
