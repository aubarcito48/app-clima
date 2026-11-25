export type IsaPhase = 'sleeping' | 'awake' | 'right' | 'front' | 'resting';

export class IsaLifecycle {
  private active = false;
  private speaking = false;
  private restTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly change: (phase: IsaPhase) => void) {}

  update(busy: boolean, state: string): void {
    const speaking = state === 'speaking';
    const active = busy || speaking || state === 'loading';
    if (speaking) {
      clearTimeout(this.restTimer);
      if (!this.speaking) {
        this.change('front');
      }
    } else if (active) {
      this.clearTimers();
      this.change(state === 'loading' ? 'right' : 'awake');
    } else if (this.active) {
      this.clearTimers();
      this.change('resting');
      this.restTimer = setTimeout(() => this.change('sleeping'), 5000);
    }
    this.speaking = speaking;
    this.active = active;
  }

  destroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    clearTimeout(this.restTimer);
  }
}
