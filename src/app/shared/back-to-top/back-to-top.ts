import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Translate } from '../translate';
import { WeatherIcon } from '../weather-icon/weather-icon';

@Component({
  selector: 'app-back-to-top',
  imports: [Translate, WeatherIcon],
  templateUrl: './back-to-top.html',
  styleUrl: './back-to-top.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackToTop {
  private readonly document = inject(DOCUMENT);
  readonly visible = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const window = this.document.defaultView;
      if (!window) return;
      const update = () => this.visible.set(window.scrollY > 320);
      update();
      window.addEventListener('scroll', update, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', update));
    });
  }

  scrollToTop(): void {
    const window = this.document.defaultView;
    if (!window) return;
    this.document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
}
