// Experimental audio-relative clock. Each silence has a local delay/recovery
// window; offsets are never summed, so pauses cannot accumulate global drift.
export function createPauseAnchors(duration, pauses, micro = []) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid duration');
  const events = [...pauses.map(p=>({...p,kind:'pause'})), ...micro.map(p=>({...p,kind:'micro'}))].map(p=>{
    if (!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.end<=p.start||p.end>duration)throw new Error('Invalid pause');
    const delay=Math.min(.10,(p.end-p.start)*.4,Math.max(0,(duration-p.end)/10));
    return {...p,delay,rejoin:Math.min(duration,p.end+delay*10)};
  }).filter(p=>p.delay>0).sort((a,b)=>a.start-b.start);
  const smooth=x=>x*x*(3-2*x);
  function phaseAt(time) {
    const t=Math.max(0,Math.min(duration,Number.isFinite(time)?time:0));
    let delay=0;
    for(const event of events){
      if(t<=event.start||t>=event.rejoin)continue;
      const amount=t<=event.end?smooth((t-event.start)/(event.end-event.start)):
        1-smooth((t-event.end)/(event.rejoin-event.end));
      delay=Math.max(delay,event.delay*amount);
    }
    return Math.max(0,t-delay);
  }
  return {events,phaseAt};
}

// Reuse production's Rhubarb-selected native frame plans; change only their clock.
export function sourceAtPhase(analysis, phase) {
  const first=12,cycleFrames=168,fps=24,end=first+cycleFrames;
  const frame=Math.max(0,Math.min(analysis.duration,phase)*fps);
  const cycle=Math.min(analysis.cycles.length-1,Math.floor(frame/cycleFrames));
  const plan=analysis.cycles[cycle],position=Math.min(frame-cycle*cycleFrames,plan.length-1e-6);
  const i=Math.floor(position),fraction=position-i;
  const source=plan[Math.min(i,plan.length-1)]+fraction;
  return (cycle*cycleFrames+Math.min(end-first-1e-6,source-first))/fps;
}

// Optional measured Piper boundaries are combined with acoustic gaps. Overlaps
// are merged rather than applying a second slowdown to the same silence.
export function createDirectedPauseAnchors(analysis, timeline = []) {
  const directed=timeline.filter(s=>s.until>s.speech_end).map(s=>({start:s.speech_end,end:s.until}));
  for(const p of directed)if(!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.end>analysis.duration+.001)throw new Error('Invalid measured director timing');
  const intervals=[...analysis.pauses,...directed.map(p=>({...p,end:Math.min(p.end,analysis.duration)}))].sort((a,b)=>a.start-b.start);
  const merged=[];
  for(const p of intervals){const previous=merged.at(-1);if(previous&&p.start<=previous.end)previous.end=Math.max(previous.end,p.end);else merged.push({...p})}
  const micro=analysis.micro.filter(p=>!merged.some(g=>p.start<g.end&&p.end>g.start));
  return {...createPauseAnchors(analysis.duration,merged,micro),directed,merged,micro};
}
