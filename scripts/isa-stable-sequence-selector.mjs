import { fallbackShape, markAt } from './isa-rhubarb-sequence-selector.mjs';

// Hard continuity constraints: mouth scores cannot override these boundaries.
export function selectStableSequences(data, continuity = 2) {
  if (!Number.isFinite(continuity) || continuity < 0 || continuity > 4) throw new Error('Invalid continuity weight');
  const { clips, transitions, baselineCosts, cues, fps, frameCount, clipLength, stablePolicy: policy } = data;
  if (!clips.length || frameCount % clipLength || !policy || !Number.isFinite(policy.maxPoseDistance)
      || policy.maxPoseDistance < 0 || !Number.isInteger(policy.holdBlocks) || policy.holdBlocks < 1
      || !Number.isInteger(policy.maxForwardSkip) || policy.maxForwardSkip < 0) throw new Error('Invalid stable catalog');
  const firstSource = data.frames[0].source;
  const levels = policy.holdBlocks, states = clips.length * levels, blocks = frameCount / clipLength;
  let costs = new Float64Array(states).fill(Infinity);
  const back = [];
  const emission = (j, time) => {
    let cost = 0;
    for (let offset = 0; offset < clipLength; offset++) {
      const target = fallbackShape(markAt(cues, (time + offset + .5) / fps));
      if (clips[j].labels[offset] !== target) cost++;
    }
    return cost + continuity * baselineCosts[time][j] * 3;
  };
  for (let block = 0; block < blocks; block++) {
    const time = block * clipLength, next = new Float64Array(states).fill(Infinity);
    const previous = new Int32Array(states).fill(-1);
    for (let j = 0; j < clips.length; j++) {
      const score = emission(j, time), current = clips[j];
      if (block === 0) {
        // Preserve the original entrance instead of starting at an unrelated pose.
        if (current.take === 1 && current.start === firstSource) next[j * levels] = score;
        continue;
      }
      for (let k = 0; k < clips.length; k++) {
        const prior = clips[k], expected = prior.start + clipLength;
        const consecutive = current.take === prior.take && current.start === expected;
        const forward = current.start - expected;
        // Same-take discontinuities are forbidden. Across takes, source clocks
        // can advance a little, never rewind, repeat or overlap previous frames.
        if (!consecutive && (current.take === prior.take || forward < 0
          || forward > policy.maxForwardSkip || transitions[k][j] > policy.maxPoseDistance)) continue;
        for (let cooldown = 0; cooldown < levels; cooldown++) {
          const state = k * levels + cooldown;
          if (!Number.isFinite(costs[state]) || (!consecutive && cooldown > 0)) continue;
          const nextCooldown = consecutive ? Math.max(0, cooldown - 1) : levels - 1;
          const target = j * levels + nextCooldown;
          const boundary = consecutive ? 0 : continuity * (1 + transitions[k][j] * 18);
          const candidate = costs[state] + score + boundary;
          if (candidate < next[target]) { next[target] = candidate; previous[target] = state; }
        }
      }
    }
    costs = next; back.push(previous);
  }
  let best = -1;
  for (let i = 0; i < costs.length; i++) if (Number.isFinite(costs[i]) && (best < 0 || costs[i] < costs[best])) best = i;
  if (best < 0) throw new Error('No continuous route; retain the original animation');
  const selected = new Array(blocks);
  for (let block = blocks - 1; block >= 0; block--) { selected[block] = Math.floor(best / levels); best = back[block][best]; }
  return selected.flatMap((clip, block) => clips[clip].frames.map((frame, offset) => ({
    ...frame, label: clips[clip].labels[offset], clip,
    cue: markAt(cues, (block * clipLength + offset + .5) / fps),
  })));
}
