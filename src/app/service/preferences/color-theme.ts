import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ColorTheme {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly system = this.window?.matchMedia?.('(prefers-color-scheme: dark)');
  private preference: 'light' | 'dark' | null = this.read();
  private readonly current = signal(this.preference ?? (this.system?.matches ? 'dark' : 'light'));
  readonly mode = this.current.asReadonly();
  private transition: ViewTransition | null = null;
  private reveal: Animation | null = null;

  constructor() {
    this.apply();
    const systemChanged = () => {
      if (this.preference === null) {
        this.stopTransition();
        this.current.set(this.system?.matches ? 'dark' : 'light');
        this.apply();
      }
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== 'stitchweather.theme' && event.key !== null) return;
      this.stopTransition();
      this.preference = this.read();
      this.current.set(this.preference ?? (this.system?.matches ? 'dark' : 'light'));
      this.apply();
    };
    this.system?.addEventListener('change', systemChanged);
    this.window?.addEventListener('storage', storageChanged);
    inject(DestroyRef).onDestroy(() => {
      this.stopTransition();
      this.system?.removeEventListener('change', systemChanged);
      this.window?.removeEventListener('storage', storageChanged);
    });
  }

  toggle(event?: Event): void {
    const next = (this.preference ?? this.current()) === 'dark' ? 'light' : 'dark';
    this.stopTransition();
    this.preference = next;
    try {
      this.window?.localStorage.setItem('stitchweather.theme', this.preference);
    } catch {
      // The toggle remains usable when browser storage is unavailable.
    }
    const update = () => {
      // A newer click or storage event supersedes a pending snapshot callback.
      if (this.preference !== next) return;
      this.current.set(next);
      this.apply();
    };
    const root = this.document.documentElement;
    const reducedMotion = this.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!this.window || reducedMotion || typeof this.document.startViewTransition !== 'function' ||
        typeof root.animate !== 'function') {
      update();
      return;
    }
    const target = event?.currentTarget;
    const rect = target instanceof Element ? target.getBoundingClientRect() : null;
    const x = rect ? rect.left + rect.width / 2 : this.window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : this.window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, this.window.innerWidth - x), Math.max(y, this.window.innerHeight - y));
    root.classList.add('theme-reveal');
    try {
      const transition = this.document.startViewTransition(update);
      this.transition = transition;
      void transition.ready.then(async () => {
        if (this.transition !== transition) return;
        this.reveal = root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' },
        );
        await this.reveal.finished;
      }).catch(() => {
        // Skipped snapshots or unsupported pseudo-element animation still apply the theme.
        if (this.transition === transition) { transition.skipTransition(); update(); }
      });
      void transition.finished.catch(() => undefined).finally(() => {
        if (this.transition !== transition) return;
        this.transition = null;
        this.reveal?.cancel();
        this.reveal = null;
        root.classList.remove('theme-reveal');
      });
    } catch {
      this.stopTransition();
      update();
    }
  }

  private stopTransition(): void {
    this.transition?.skipTransition();
    this.transition = null;
    this.reveal?.cancel();
    this.reveal = null;
    this.document.documentElement.classList.remove('theme-reveal');
  }

  private read(): 'light' | 'dark' | null {
    try {
      const value = this.window?.localStorage.getItem('stitchweather.theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private apply(): void {
    this.document.documentElement.dataset['theme'] = this.current();
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', this.current() === 'dark' ? '#0c1b2b' : '#eefaff');
  }
}
