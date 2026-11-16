// English-only trial. Reuse whole frames; never paste or synthesize facial parts.
export const englishAlignmentPolicy = Object.freeze({
  fps: 24, first: 12, end: 180, maxDrift: 8,
  minRun: 4, maxPose: .04, maxMotion: .025,
});
export const mappedShape = shape => ({ A: 'X', G: 'B', H: 'C' }[shape] ?? shape);

export function withEnglishLabelReview(catalog, review) {
  const labels = catalog.sourceFrames.map((_, i) => englishShapeAt(catalog, i));
  for (const row of review.overrides) {
    if (!Number.isInteger(row.first) || !Number.isInteger(row.last) || row.first < 0
      || row.last < row.first || row.last >= labels.length
      || typeof row.shape !== 'string' || row.shape.length !== 1 || !'BCDEFX'.includes(row.shape))
      throw new Error('Invalid visual label review');
    for (let i = row.first; i <= row.last; i++) labels[i] = row.shape;
  }
  return { ...catalog, candidates: labels.map((_, i) => i), labels };
}

export function englishShapeAt(catalog, index) {
  let nearest = 0;
  for (let i = 1; i < catalog.candidates.length; i++)
    if (Math.abs(index - catalog.candidates[i]) < Math.abs(index - catalog.candidates[nearest])) nearest = i;
  return catalog.labels[nearest];
}

export function readRhubarbCues(raw) {
  for (let at = 12; at + 8 <= raw.length;) {
    const size = new DataView(raw.buffer, raw.byteOffset + at + 4, 4).getUint32(0, true);
    if (at + 8 + size > raw.length) throw new Error('Invalid WAV chunk');
    if (String.fromCharCode(...raw.subarray(at, at + 4)) === 'isav')
      return JSON.parse(new TextDecoder().decode(raw.subarray(at + 8, at + 8 + size)));
    at += 8 + size + size % 2;
  }
  throw new Error('Missing Rhubarb cues');
}

export function alignEnglishFrames(cues, duration, catalog) {
  if (!Number.isFinite(duration) || duration <= 0 || !cues.length)
    throw new Error('A valid duration and Rhubarb cues are required');
  const p = englishAlignmentPolicy, cycleLength = p.end - p.first;
  const cycles = [], events = [];
  for (let start = 0; start < duration; start += cycleLength / p.fps) {
    const count = Math.min(cycleLength, Math.max(1, Math.round((duration - start) * p.fps)));
    const full = count === cycleLength;
    const baseline = Array.from({ length: count }, (_, i) => p.first + i);
    const wanted = Array.from({ length: count }, (_, i) => mappedShape(
      cues.find(c => c.start <= start + (i + .5) / p.fps && start + (i + .5) / p.fps < c.end)?.value ?? 'X'));
    const emission = (index, t) => {
      const actual = englishShapeAt(catalog, index);
      return actual === wanted[t] ? 0 : (actual === 'X' || wanted[t] === 'X') ? 4 : 2;
    };
    const baselineCost = baseline.reduce((cost, index, t) => cost + emission(index, t), 0);
    let states = new Map([[`${p.first}:4`, { index: p.first, run: p.minRun,
      cost: emission(p.first, 0), plan: [p.first], events: [] }]]);
    for (let t = 1; t < count; t++) {
      const next = new Map();
      for (const state of states.values()) for (const step of [1, 0, 2]) {
        const index = state.index + step;
        if (index >= p.end || Math.abs(index - p.first - t) > p.maxDrift) continue;
        if (full && index + (count - 1 - t) * 2 < p.end - 1) continue;
        if (full && t === count - 1 && index !== p.end - 1) continue;
        if (step !== 1 && (state.run < p.minRun || t < p.minRun || count - t < p.minRun)) continue;
        const jump = step === 2 ? catalog.jumps[String(state.index)]?.[0] : null;
        if (step === 2 && (!jump || jump.pose > p.maxPose || jump.motion > p.maxMotion)) continue;
        const run = step === 1 ? Math.min(p.minRun, state.run + 1) : 0;
        const cost = state.cost + emission(index, t) + (step === 1 ? 0 : 1.25)
          + (jump ? jump.pose * 30 + jump.motion * 40 : 0) + Math.abs(index - p.first - t) * .03;
        const key = `${index}:${run}`, previous = next.get(key);
        if (!previous || cost < previous.cost) next.set(key, {
          index, run, cost, plan: [...state.plan, index],
          events: step === 1 ? state.events : [...state.events, {
            time: start + t / p.fps, from: state.index, to: index,
            kind: step === 0 ? 'hold' : 'skip', ...(jump ?? {}),
          }],
        });
      }
      states = next;
    }
    const best = [...states.values()].sort((a, b) => a.cost - b.cost)[0];
    const chosen = best && best.cost < baselineCost ? best : { plan: baseline, events: [] };
    cycles.push(chosen.plan); events.push(...chosen.events);
  }
  return { duration, cycles, events, sourceSecondsAt: time => alignedSourceAt(cycles, duration, time) };
}

export function alignedSourceAt(cycles, duration, time) {
    const p = englishAlignmentPolicy, cycleLength = p.end - p.first;
    const frame = Math.max(0, Math.min(duration, Number.isFinite(time) ? time : 0)) * p.fps;
    const cycle = Math.min(cycles.length - 1, Math.floor(frame / cycleLength));
    const plan = cycles[cycle], position = Math.min(plan.length - 1e-6, frame - cycle * cycleLength);
    const i = Math.floor(position), fraction = position - i;
    // Interpolate the selected pair, including holds. Adding a fractional frame
    // to a held index would move forwards then backwards at every hold boundary.
    // A virtual next native frame keeps the last frame's interpolation moving
    // into the next loop instead of freezing then jumping at the boundary.
    const next = plan[i + 1] ?? Math.min(p.end, plan[i] + 1);
    const source = plan[i] + (next - plan[i]) * fraction;
    return (cycle * cycleLength + source - p.first) / p.fps;
}

export function alignmentAgreement(cues, duration, catalog, sourceSecondsAt) {
  let total = 0, matches = 0, closedTotal = 0, closedMatches = 0;
  const p = englishAlignmentPolicy, cycleLength = p.end - p.first;
  for (let n = 0; n < duration * p.fps; n++) {
    const time = (n + .5) / p.fps;
    if (time >= duration) continue;
    const wanted = mappedShape(cues.find(c => c.start <= time && time < c.end)?.value ?? 'X');
    const source = p.first + Math.floor(sourceSecondsAt(time) * p.fps + 1e-7) % cycleLength;
    const actual = englishShapeAt(catalog, source);
    total++; matches += Number(actual === wanted);
    if (wanted === 'X') { closedTotal++; closedMatches += Number(actual === 'X'); }
  }
  return { matches, total, agreement: matches / total,
    closedMatches, closedTotal, closedAgreement: closedTotal ? closedMatches / closedTotal : null };
}

// Shape availability before pose restrictions; not perceptual accuracy.
export function alignmentCoverage(cues, duration, catalog) {
  const p = englishAlignmentPolicy, cycleLength = p.end - p.first;
  let total = 0, available = 0, closedTotal = 0, closedAvailable = 0;
  for (let n = 0; n < duration * p.fps; n++) {
    const time = (n + .5) / p.fps;
    if (time >= duration) continue;
    const wanted = mappedShape(cues.find(c => c.start <= time && time < c.end)?.value ?? 'X');
    const native = p.first + n % cycleLength;
    let found = false;
    for (let i = Math.max(p.first, native - p.maxDrift); i <= Math.min(p.end - 1, native + p.maxDrift); i++)
      if (englishShapeAt(catalog, i) === wanted) found = true;
    total++; available += Number(found);
    if (wanted === 'X') { closedTotal++; closedAvailable += Number(found); }
  }
  return { total, available, closedTotal, closedAvailable };
}
