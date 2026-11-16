import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { About } from '../../shared/about/about';
import { WeatherSidebar } from '../../shared/weather-sidebar/weather-sidebar';
import { SiteFooter } from '../../shared/site-footer/site-footer';
import { BackToTop } from '../../shared/back-to-top/back-to-top';
import { Translate } from '../../shared/translate';
import { SavedPlace } from '../../models/saved-place';
import { SectionNavigation } from '../../shared/section-navigation/section-navigation';
import { Isabel } from '../../shared/isabel/isabel';

@Component({
  selector: 'app-about-page',
  imports: [About, WeatherSidebar, SiteFooter, BackToTop, Translate, SectionNavigation, Isabel],
  templateUrl: './about-page.html',
  styleUrl: './about-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  readonly sections = [
    { id: 'nuestra-historia', label: 'Nuestra historia' },
    { id: 'tecnologias', label: 'Tecnologías' },
    { id: 'preguntas-frecuentes', label: 'Preguntas frecuentes' },
  ];
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  constructor() {
    afterNextRender(() => {
      this.document.getElementById('main-content')?.focus({ preventScroll: true });
      this.document.defaultView?.scrollTo({ top: 0 });
    });
  }
  selectPlace(place: SavedPlace) {
    void this.router.navigate(['/'], { state: { weatherPlace: place } });
  }
}
