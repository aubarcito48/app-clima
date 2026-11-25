export type IsaPose = 'isa-sleep' | 'isa-awake' | 'isa-right' | 'isa-down';
type Branch = 'sleep' | 'right' | 'down';

/** A continuous position: a new request changes the target, never restarts a clip. */
export class IsaMotion {
  branch: Branch = 'sleep';
  position = 1;
  velocity = 0;
  pose: IsaPose = 'isa-sleep';

  private get destination(): Branch | null {
    return this.pose === 'isa-awake' ? null : this.pose.slice(4) as Branch;
  }

  private get target(): number {
    return this.destination === this.branch ? 1 : 0;
  }

  get moving(): boolean {
    return Math.abs(this.position - this.target) > 0.001 || Math.abs(this.velocity) > 0.01
      || (this.destination !== null && this.destination !== this.branch);
  }

  get progress(): number {
    return this.moving ? (this.target === 1 ? this.position : 1 - this.position) : 1;
  }

  request(pose: IsaPose, immediate = false): void {
    this.pose = pose;
    if (immediate) {
      if (this.destination) this.branch = this.destination;
      this.position = this.destination ? 1 : 0;
      this.velocity = 0;
    }
  }

  advance(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    // All paths share one front frame. Change branches only after reaching it.
    if (this.destination && this.destination !== this.branch
        && this.position < 0.003 && Math.abs(this.velocity) < 0.04) {
      this.branch = this.destination;
      this.position = 0;
      this.velocity = 0;
    }
    const target = this.target;
    const stiffness = target === 0 ? 55 : this.branch === 'sleep' ? 40 : 170;
    const frequency = Math.sqrt(stiffness);
    const dt = Math.min(seconds, 0.05);
    const offset = this.position - target;
    const coefficient = this.velocity + frequency * offset;
    const decay = Math.exp(-frequency * dt);
    // Exact critically damped solution; stable across different screen refresh rates.
    const next = target + (offset + coefficient * dt) * decay;
    this.velocity = (this.velocity - frequency * coefficient * dt) * decay;
    this.position = Math.max(0, Math.min(1, next));
    if (next !== this.position) this.velocity = 0;
    if (Math.abs(this.position - target) <= 0.001 && Math.abs(this.velocity) <= 0.01) {
      this.position = target;
      this.velocity = 0;
    }
  }
}
