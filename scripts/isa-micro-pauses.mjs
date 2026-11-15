import { englishPhaseAt } from './isa-english-rhythm.mjs';
import { pauseAmount } from './isa-audio-pauses.mjs';

// Add only short PCM-confirmed gaps to the already approved pause clock.
export function microPauseAmount(gaps,t){
  let amount=0;
  for(const p of gaps){
    const center=(p.start+p.end)/2,half=Math.min(.008,(p.end-p.start)/4);
    const start=center-half,end=center+half,ramp=.008;
    if(t<start-ramp||t>end+ramp)continue;
    const x=Math.max(0,Math.min(1,(t-start+ramp)/ramp,(end+ramp-t)/ramp));
    amount=Math.max(amount,x*x*(3-2*x));
  }
  return amount;
}

export function microPauseTimeline(baseline,gaps,longPauses,strength=1){
  if(!Number.isFinite(strength)||strength<0||strength>1||!Array.isArray(gaps)
     ||gaps.some(p=>!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.end<=p.start||p.end>baseline.rows.at(-1).time))throw new Error('Invalid micro gaps');
  if(!strength||!gaps.length)return{rows:baseline.rows,strength,gaps,heldSeconds:0,extraLag:0,unchanged:true};
  const duration=baseline.rows.at(-1).time,step=.002,rows=[{time:0,phase:0,rate:1}];
  let phase=0,heldSeconds=0;
  for(let n=1;n<=Math.ceil(duration/step);n++){
    const time=Math.min(duration,n*step),previous=rows.at(-1),dt=time-previous.time;
    const now=englishPhaseAt(baseline.rows,time),before=englishPhaseAt(baseline.rows,previous.time);
    const lag=Math.max(0,before.phase-phase),budget=Math.max(0,Math.min(1,1-lag/.08));
    // The core can retain the source phase briefly, never more than 16 ms per
    // detected gap. Budget exhaustion weakens retention instead of accumulating lag.
    const gate=microPauseAmount(gaps,time),factor=1-strength*gate*budget;
    const recovering=gate===0&&pauseAmount(longPauses,time)===0;
    const catchup=recovering?Math.min(.025,lag/.6)*strength:0;
    const rate=Math.max(0,now.rate*factor+catchup);
    phase+=dt*(previous.rate+rate)/2;
    if(rate<.1)heldSeconds+=dt;
    rows.push({time,phase,rate});
  }
  return{rows,strength,gaps,heldSeconds,extraLag:baseline.rows.at(-1).phase-phase,unchanged:false};
}
