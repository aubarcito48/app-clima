import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { WeatherIcon } from '../weather-icon/weather-icon';

@Component({
  selector: 'app-emergency-contacts',
  imports: [WeatherIcon],
  templateUrl: './emergency-contacts.html',
  styleUrl: './emergency-contacts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmergencyContacts {
  readonly selectedCountry = input<string | null>(null);
  readonly viewport = viewChild<ElementRef<HTMLElement>>('contactsViewport');
  readonly canPrevious = signal(false);
  readonly canNext = signal(false);
  // https://www.argentina.gob.ar/tema/emergencias (verified 2026-10-25).
  readonly contacts = [
    {
      number: '911',
      name: 'Policía y emergencias',
      detail: 'Ayuda policial y coordinación de emergencias.',
      coverage: 'Argentina',
    },
    {
      number: '100',
      name: 'Bomberos',
      detail: 'Incendios en viviendas, comercios e industrias.',
      coverage: 'Argentina',
    },
    {
      number: '103',
      name: 'Defensa Civil',
      detail: 'Asistencia ante inundaciones y otros desastres.',
      coverage: 'Argentina',
    },
    {
      number: '105',
      name: 'Emergencia ambiental',
      detail: 'Avisos sobre posibles catástrofes ambientales.',
      coverage: 'Argentina',
    },
    {
      number: '106',
      name: 'Prefectura Naval',
      detail: 'Emergencias en ríos, lagos y costas.',
      coverage: 'Ámbito de Prefectura · Argentina',
    },
    {
      number: '107',
      name: 'SAME · Emergencias médicas',
      detail: 'Solicitud de ambulancia.',
      coverage: 'CABA y localidades de la provincia de Buenos Aires',
    },
  ] as const;

  constructor() {
    afterRenderEffect((onCleanup) => {
      const viewport = this.viewport()?.nativeElement;
      if (!viewport) return;
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
