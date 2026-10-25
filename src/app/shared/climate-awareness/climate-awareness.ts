import { DOCUMENT } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-climate-awareness',
  imports: [],
  templateUrl: './climate-awareness.html',
  styleUrl: './climate-awareness.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClimateAwareness {
  private readonly document = inject(DOCUMENT);
  readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  readonly active = signal(0);
  readonly paused = signal(false);
  private readonly visible = signal(true);
  private readonly pageVisible = signal(!this.document.hidden);
  private suppressToggle = false;
  private pointerStart: { x: number; y: number } | null = null;
  readonly slides = [
    {
      id: 'forest',
      src: 'climate-awareness/forest.webp',
      width: 1100,
      height: 550,
      alt: 'Río turquesa entre un bosque frondoso y montañas con niebla.',
      title: 'Cuidemos nuestros bosques',
      message: 'Respetá la naturaleza y las áreas protegidas.',
    },
    {
      id: 'water',
      src: 'climate-awareness/water.webp',
      width: 1100,
      height: 503,
      alt: 'Agua cristalina que fluye entre rocas y árboles.',
      title: 'Cada gota cuenta',
      message: 'Evitá desperdiciar agua en tus tareas de todos los días.',
    },
    {
      id: 'clean-energy',
      src: 'climate-awareness/clean-energy.webp',
      width: 1100,
      height: 436,
      alt: 'Aerogeneradores sobre colinas verdes junto al mar.',
      title: 'Un futuro con energía limpia',
      message: 'Ahorrá energía y aprovechá la luz natural.',
    },
  ] as const;

  constructor() {
    const window = this.document.defaultView;
    const visibilityChanged = () => this.pageVisible.set(!this.document.hidden);
    this.document.addEventListener('visibilitychange', visibilityChanged);
    inject(DestroyRef).onDestroy(() =>
      this.document.removeEventListener('visibilitychange', visibilityChanged),
    );
    effect((onCleanup) => {
      if (!window || this.paused() || !this.visible() || !this.pageVisible()) return;
      const interval = window.setInterval(
        () => this.active.update((value) => (value + 1) % this.slides.length),
        5000,
      );
      onCleanup(() => window.clearInterval(interval));
    });
    afterRenderEffect((onCleanup) => {
      const element = this.stage()?.nativeElement;
      if (!element || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver((entries) =>
        this.visible.set(entries[0]?.isIntersecting ?? false),
      );
      observer.observe(element);
      onCleanup(() => observer.disconnect());
    });
  }
  toggleRotation() {
    if (this.suppressToggle) {
      this.suppressToggle = false;
      return;
    }
    this.paused.update((value) => !value);
  }
  select(index: number) {
    this.paused.set(true);
    this.active.set((index + this.slides.length) % this.slides.length);
  }
  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.select(this.active() + (event.key === 'ArrowRight' ? 1 : -1));
  }
  pointerDown(event: PointerEvent) {
    if (event.isPrimary && event.button === 0)
      this.pointerStart = { x: event.clientX, y: event.clientY };
  }
  pointerUp(event: PointerEvent) {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start) return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) > 40 && Math.abs(delta) > Math.abs(event.clientY - start.y)) {
      this.select(this.active() + (delta < 0 ? 1 : -1));
      this.suppressToggle = true;
    }
  }
  cancelPointer() {
    this.pointerStart = null;
  }
}
