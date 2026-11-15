// A monotonic playback clock. It uses audio energy, never phonetic mouth labels.
export function rhythmTimeline(energy, hop, duration, strength = 1) {
  if (!Array.isArray(energy) || !energy.length || energy.some(v => !Number.isFinite(v) || v < 0 || v > 1)
    || !Number.isFinite(hop) || hop <= 0 || !Number.isFinite(duration) || duration <= 0
    || !Number.isFinite(strength) || strength < 0 || strength > 1) throw new Error('Invalid rhythm input');
  const step = .005, rows = [{ time: 0, phase: 0, rate: 1 }];
  let phase = 0, rate = 1;
  for (let i = 1; i <= Math.ceil(duration / step); i++) {
    const time = Math.min(duration, i * step), dt = time - rows.at(-1).time;
    const position = time / hop, index = Math.min(energy.length - 1, Math.floor(position));
    const value = energy[index] + (energy[Math.min(index + 1, energy.length - 1)] - energy[index]) * (position - Math.floor(position));
    const target = 1 + strength * .1 * (2 * value - 1);
    const nextRate = rate + (target - rate) * (1 - Math.exp(-dt / .16));
    phase += dt * (rate + nextRate) / 2;
    rate = nextRate; rows.push({ time, phase, rate });
  }
  return rows;
}
