import { Translate } from '../../preferences/translate';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { WeatherIcon } from '../../weather/weather-icon/weather-icon';
import { emergencyDirectory } from './emergency-directory';

@Component({
  selector: 'app-emergency-contacts',
  imports: [Translate, WeatherIcon],
  templateUrl: './emergency-contacts.html',
  styleUrl: './emergency-contacts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmergencyContacts {
  readonly selectedCountry = input<string | null>(null);
  readonly directory = computed(() => emergencyDirectory(this.selectedCountry()));
  readonly viewport = viewChild<ElementRef<HTMLElement>>('contactsViewport');
  readonly canPrevious = signal(false);
  readonly canNext = signal(false);

  constructor() {
    afterRenderEffect((onCleanup) => {
      this.directory();
      const viewport = this.viewport()?.nativeElement;
      if (!viewport) return;
      viewport.scrollLeft = 0;
      this.updateControls();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.updateControls());
        observer.observe(viewport);
        onCleanup(() => observer.disconnect());
      }
    });
  }
  updateControls() {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    this.canPrevious.set(viewport.scrollLeft > 2);
    this.canNext.set(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2);
  }
  move(direction: number) {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    const reduce =
      viewport.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')
        .matches ?? true;
    viewport.scrollBy({
      left: direction * Math.max(240, viewport.clientWidth - 24),
      behavior: reduce ? 'instant' : 'smooth',
    });
  }
  onKeydown(event: KeyboardEvent) {
    if (event.target !== this.viewport()?.nativeElement) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.move(event.key === 'ArrowRight' ? 1 : -1);
    }
  }
}
