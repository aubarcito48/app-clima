// Local sequence selection only. It does not generate advice, voice or gestures.
export const fallbackShape = shape => ({ A: 'X', G: 'B', H: 'C' }[shape] ?? shape);
export function markAt(cues, time) {
  return cues.find(cue => cue.start <= time && time < cue.end)?.value ?? 'X';
}
export function selectSequences(data, continuity = 2) {
  if (!Number.isFinite(continuity) || continuity < 0 || continuity > 4) throw new Error('Invalid continuity weight');
  const { clips, transitions, baselineCosts, cues, fps, frameCount, clipLength } = data;
  if (!clips.length || frameCount % clipLength) throw new Error('Invalid clip catalog');
  let costs = clips.map(() => 0);
  const back = [], blocks = frameCount / clipLength;
  for (let block = 0; block < blocks; block++) {
    const time = block * clipLength, row = clips.map(() => Infinity), previous = clips.map(() => -1);
    for (let j = 0; j < clips.length; j++) {
      let emission = 0;
      for (let offset = 0; offset < clipLength; offset++) {
        const wanted = fallbackShape(markAt(cues, (time + offset + .5) / fps));
        emission += clips[j].labels[offset] === wanted ? 0 : 1;
      }
      emission += continuity * baselineCosts[time][j] * 3;
      if (block === 0) { row[j] = emission; continue; }
      for (let k = 0; k < clips.length; k++) {
        const consecutive = clips[k].take === clips[j].take && clips[k].start + clipLength === clips[j].start;
        const cut = consecutive ? 0 : 1 + transitions[k][j] * 18;
        const cost = costs[k] + emission + continuity * cut;
        if (cost < row[j]) { row[j] = cost; previous[j] = k; }
      }
    }
    costs = row; back.push(previous);
  }
  let best = costs.indexOf(Math.min(...costs));
  const selected = new Array(blocks);
  for (let b = blocks - 1; b >= 0; b--) { selected[b] = best; best = back[b][best]; }
  return selected.flatMap((clipIndex, block) => clips[clipIndex].frames.map((frame, offset) => ({
    ...frame, label: clips[clipIndex].labels[offset], clip: clipIndex,
    cue: markAt(cues, (block * clipLength + offset + .5) / fps),
  })));
}
