// Audio-relative pauses, not punctuation or fixed sentence timers.
export function pauseAmount(pauses,time,ramp=.035){
  let amount=0;
  for(const p of pauses){
    if(time<p.start-ramp||time>p.end+ramp)continue;
    const enter=Math.max(0,Math.min(1,(time-p.start+ramp)/ramp));
    const leave=Math.max(0,Math.min(1,(p.end+ramp-time)/ramp));
    const smooth=x=>x*x*(3-2*x);
    amount=Math.max(amount,smooth(Math.min(enter,leave)));
  }
  return amount;
}

export function pauseTimeline(duration,pauses,strength=.8){
  if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(strength)||strength<0||strength>1
     ||!Array.isArray(pauses)||pauses.some(p=>!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.end<=p.start||p.end>duration))throw new Error('Invalid acoustic pauses');
  // Continuous playback stays active. At full strength the frame clock never
  // stops: min target 0.35x. Mild catch-up avoids a sudden jump to the next phrase.
  const step=.005,rows=[{time:0,phase:0,rate:1,pause:0}];let phase=0,rate=1;
  for(let n=1;n<=Math.ceil(duration/step);n++){
    const time=Math.min(duration,n*step),dt=time-rows.at(-1).time;
    const amount=pauseAmount(pauses,time),lag=Math.max(0,rows.at(-1).time-phase);
    const budget=Math.max(0,Math.min(1,1-lag/.2));
    const brake=.65*strength*amount*budget;
    const catchup=(1-amount)*Math.min(.06,lag/.8)*strength;
    const target=1-brake+catchup;
    const next=rate+(target-rate)*(1-Math.exp(-dt/.025));
    phase+=dt*(rate+next)/2;rate=next;
    rows.push({time,phase,rate,pause:amount});
  }
  return {rows,strength,pauses,minRate:Math.min(...rows.map(r=>r.rate)),maxRate:Math.max(...rows.map(r=>r.rate))};
}
