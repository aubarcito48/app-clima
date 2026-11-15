// Isolated English timing trial. Retimes an existing 3C path, preserving its order.
export function englishRhythm(data, plan, labels, strength=.75) {
  if(!Number.isFinite(strength)||strength<0||strength>1||!plan.length)throw new Error('Invalid rhythm input');
  const fps=data.fps,duration=data.duration,step=.125;
  const sourceAt=phase=>englishSourceAt(plan,phase,fps,duration);
  const shapeAt=index=>{
    let nearest=-1,distance=Infinity;
    for(let j=0;j<data.candidates.length;j++)if(labels[j]&&Math.abs(index-data.candidates[j])<distance){distance=Math.abs(index-data.candidates[j]);nearest=j}
    return nearest<0?null:labels[nearest];
  };
  const wanted=t=>({A:'X',G:'B',H:'C'}[data.cues.find(c=>c.start<=t&&t<c.end)?.value]??data.cues.find(c=>c.start<=t&&t<c.end)?.value??'X');
  // Every block integrates a linear rate ramp exactly. q keeps its phase state
  // on a reproducible grid; the initial rate is always 1, never an initial jump.
  let states=new Map([['0:2',{q:0,last:2,cost:0,indices:[2]}]]);
  const blocks=Math.ceil(duration/step);
  for(let n=0;n<blocks;n++){
    const next=new Map();
    for(const state of states.values())for(let r=Math.max(0,state.last-1);r<=Math.min(4,state.last+1);r++){
      const q=state.q+state.last+r-4,key=`${q}:${r}`,start=n*step;
      const startPhase=start+.15*strength*state.q/fps;
      const rate0=1+strength*.1*(state.last-2),rate1=1+strength*.1*(r-2);
      let mismatch=0,valid=true;
      for(let sample=0;sample<4;sample++){
        const dt=step*(sample+.5)/4,t=start+dt;
        if(t>=duration)continue;
        const phase=startPhase+rate0*dt+(rate1-rate0)*dt*dt/(2*step),index=sourceAt(phase);
        if(index>=data.frames.length){valid=false;break}
        mismatch+=Number(shapeAt(index)!==wanted(t));
      }
      if(!valid)continue;
      const cost=state.cost+mismatch/4+.12*(r-state.last)**2+.025*(r-2)**2;
      const previous=next.get(key);
      if(!previous||cost<previous.cost)next.set(key,{q,last:r,cost,indices:[...state.indices,r]});
    }
    states=next;
  }
  const best=[...states.values()].sort((a,b)=>a.cost-b.cost||Math.abs(a.q)-Math.abs(b.q)||Math.abs(a.last-2)-Math.abs(b.last-2))[0];
  if(!best)throw new Error('No bounded rhythm path available');
  let phase=0;const rows=[{time:0,phase:0,rate:1}];
  for(let n=0;n<blocks;n++){
    const rate0=1+strength*.1*(best.indices[n]-2),rate1=1+strength*.1*(best.indices[n+1]-2);
    const start=n*step,dt=Math.min(step,duration-start),endRate=rate0+(rate1-rate0)*dt/step;
    phase+=dt*(rate0+endRate)/2;
    rows.push({time:Math.min(duration,start+step),phase,rate:endRate});
  }
  return {rows,cost:best.cost,strength,minRate:1-.2*strength,maxRate:1+.2*strength};
}

export function englishPhaseAt(rows,time){
  const t=Math.max(0,Math.min(rows.at(-1).time,time));
  let hi=rows.findIndex(row=>row.time>=t);
  if(hi<=0)return{phase:0,rate:rows[0].rate};
  const a=rows[hi-1],b=rows[hi],dt=t-a.time,span=b.time-a.time;
  const rate=a.rate+(b.rate-a.rate)*dt/span;
  return{phase:a.phase+dt*(a.rate+rate)/2,rate};
}

export function englishSourceAt(plan,phase,fps,duration=plan.length/fps){
  const i=Math.max(0,Math.floor(phase*fps+1e-7));
  return phase<=duration?plan[Math.min(plan.length-1,i)]:plan.at(-1)+1+Math.floor((phase-duration)*fps+1e-7);
}
