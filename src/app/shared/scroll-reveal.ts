import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  host: {
    class: 'scroll-reveal',
    '[class.reveal-ready]': 'enabled()',
    '[class.reveal-pending]': 'pending()',
    '[class.reveal-from-left]': 'direction() === "left"',
    '[style.--reveal-delay]': 'delay() + "ms"',
    '(focusin)': 'reveal()',
  },
})
export class ScrollReveal {
  readonly direction = input<'bottom' | 'left'>('bottom', { alias: 'revealFrom' });
  readonly delay = input(0, {
    alias: 'revealDelay',
    transform: (value: number) => Math.max(0, Math.min(160, value)),
  });
  protected readonly enabled = signal(false);
  protected readonly pending = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      if (typeof window.matchMedia !== 'function' || typeof IntersectionObserver === 'undefined')
        return;
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motion.matches) return;

      const stopMotion = () => {
        if (motion.matches) this.reveal();
      };
      this.destroyRef.onDestroy(() => {
        this.observer?.disconnect();
        motion.removeEventListener('change', stopMotion);
      });
      try {
        this.observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) this.reveal();
          },
          { threshold: 0, rootMargin: '0px 0px -48px 0px' },
        );
        this.observer.observe(this.element.nativeElement);
        motion.addEventListener('change', stopMotion);
        this.enabled.set(true);
        this.pending.set(true);
      } catch {
        this.reveal();
      }
    });
  }

  protected reveal(): void {
    this.pending.set(false);
    this.observer?.disconnect();
  }
}
