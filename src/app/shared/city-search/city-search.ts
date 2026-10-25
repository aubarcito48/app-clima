import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  WeatherQuery,
  CitySearchFeedback,
  CountryChoice,
  PlaceSuggestion,
} from '../../models/city-query';
import { PlaceSuggestions } from '../../service/place-suggestions';
import { Subject, switchMap, EMPTY, of, catchError, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { cityRequired, parsePlaceInput } from './city-query';

@Component({
  selector: 'app-city-search',
  imports: [ReactiveFormsModule, WeatherIcon],
  templateUrl: './city-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class CitySearch {
  readonly busy = input(false);
  readonly locating = input(false);
  readonly feedback = input<CitySearchFeedback | null>(null);
  readonly querySubmitted = output<WeatherQuery>();
  readonly queryEdited = output<void>();
  readonly retryRequested = output<void>();
  readonly locationRequested = output<void>();
  readonly form = new FormGroup({
    city: new FormControl('', {
      nonNullable: true,
      validators: [
        cityRequired,
        (control) => {
          if (!control.value.trim()) return null;
          try {
            parsePlaceInput(control.value);
            return null;
          } catch {
            return { place: true };
          }
        },
      ],
    }),
  });
  readonly suggestions = signal<readonly PlaceSuggestion[]>([]);
  readonly suggestionsLoading = signal(false);
  readonly suggestionMessage = signal('');
  readonly open = signal(false);
  readonly activeIndex = signal(-1);
  private readonly places = inject(PlaceSuggestions);
  private readonly lookups = new Subject<string | null>();
  private readonly cityField = viewChild.required<ElementRef<HTMLInputElement>>('cityField');
  private readonly feedbackPanel = viewChild<ElementRef<HTMLElement>>('feedbackPanel');
  private timer: ReturnType<typeof setTimeout> | undefined;
  private composing = false;
  private selectedPlace: PlaceSuggestion | null = null;
  private readonly countryNames = new Intl.DisplayNames(['es'], { type: 'region' });
  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelAutoSearch());
    this.lookups
      .pipe(
        switchMap((text) =>
          text
            ? this.places.search(text).pipe(
                map((items) => ({ items, failed: false })),
                catchError(() => of({ items: [] as PlaceSuggestion[], failed: true })),
              )
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.suggestionsLoading.set(false);
        this.suggestions.set(result.items);
        this.activeIndex.set(-1);
        this.open.set(
          result.items.length > 0 && document.activeElement === this.cityField().nativeElement,
        );
        this.suggestionMessage.set(
          result.failed
            ? 'No pudimos cargar sugerencias. Podés buscar con Enter.'
            : result.items.length
              ? `${result.items.length} lugares encontrados. Usá las flechas y Enter o elegí uno de la lista.`
              : 'No hay sugerencias. Probá con más letras o buscá con Enter.',
        );
      });
    afterRenderEffect(() => {
      const feedback = this.feedback();
      if (feedback?.retryable) this.feedbackPanel()?.nativeElement.focus();
      else if (feedback) this.focusCity();
    });
    afterRenderEffect(() => {
      const index = this.activeIndex();
      if (this.open() && index >= 0)
        document
          .getElementById('place-option-' + this.suggestions()[index]?.id)
          ?.scrollIntoView?.({ block: 'nearest' });
    });
  }
  get cityInvalid(): boolean {
    return this.form.controls.city.touched && this.form.controls.city.invalid;
  }
  countryLabel(code: string): string {
    return this.countryNames.of(code) ?? code;
  }
  submit(): void {
    this.cancelAutoSearch();
    if (this.composing) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (this.selectedPlace)
      this.emit({ latitude: this.selectedPlace.latitude, longitude: this.selectedPlace.longitude });
    else this.emit(parsePlaceInput(this.form.controls.city.value));
  }
  private emit(query: WeatherQuery): void {
    this.querySubmitted.emit(query);
  }
  chooseSuggestion(place: PlaceSuggestion): void {
    this.cancelAutoSearch();
    this.form.controls.city.setValue(
      [place.name, place.region, place.country].filter(Boolean).join(', '),
    );
    this.selectedPlace = place;
    this.queryEdited.emit();
    this.focusCity();
    this.emit({ latitude: place.latitude, longitude: place.longitude });
  }
  chooseLocation(choice: CountryChoice): void {
    this.selectedPlace = null;
    this.cancelAutoSearch();
    const city = choice.city ?? parsePlaceInput(this.form.controls.city.value).city;
    this.form.controls.city.setValue(
      [city, choice.region, choice.country].filter(Boolean).join(', '),
    );
    this.queryEdited.emit();
    this.focusCity();
    this.emit({
      city,
      country: choice.country,
      ...(choice.region ? { region: choice.region } : {}),
    });
  }
  onEdited(): void {
    this.selectedPlace = null;
    this.cancelAutoSearch();
    this.queryEdited.emit();
    if (this.composing) return;
    const text = this.form.controls.city.value.normalize('NFC').trim().replace(/\s+/gu, ' ');
    if (text.length < 3 || text.length > 206) return;
    this.timer = setTimeout(() => {
      this.suggestionsLoading.set(true);
      this.suggestionMessage.set('Buscando lugares…');
      this.lookups.next(text);
    }, 300);
  }
  compositionStart(): void {
    this.composing = true;
    this.onEdited();
  }
  compositionEnd(): void {
    this.composing = false;
    this.onEdited();
  }
  cancelAutoSearch(): void {
    clearTimeout(this.timer);
    this.lookups.next(null);
    this.open.set(false);
    this.suggestions.set([]);
    this.activeIndex.set(-1);
    this.suggestionsLoading.set(false);
    this.suggestionMessage.set('');
  }
  get popupVisible(): boolean {
    return this.open() && this.suggestions().length > 0;
  }
  closeSuggestions(): void {
    clearTimeout(this.timer);
    this.lookups.next(null);
    this.open.set(false);
    this.activeIndex.set(-1);
    this.suggestionsLoading.set(false);
    this.suggestionMessage.set('');
  }
  reopenSuggestions(): void {
    if (this.suggestions().length) this.open.set(true);
  }
  onKeydown(event: KeyboardEvent): void {
    if (this.composing || event.isComposing) return;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && this.suggestions().length) {
      event.preventDefault();
      this.open.set(true);
      const count = this.suggestions().length;
      this.activeIndex.set(
        event.key === 'ArrowDown'
          ? (this.activeIndex() + 1) % count
          : this.activeIndex() < 0
            ? count - 1
            : (this.activeIndex() - 1 + count) % count,
      );
    } else if (event.key === 'Enter' && this.popupVisible && this.activeIndex() >= 0) {
      event.preventDefault();
      this.chooseSuggestion(this.suggestions()[this.activeIndex()]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSuggestions();
    } else if (event.key === 'Tab') this.closeSuggestions();
  }
  focusCity(): void {
    this.cityField().nativeElement.focus();
  }
  focusCorrection(): void {
    this.focusCity();
  }
  requestRetry(): void {
    this.cancelAutoSearch();
    this.focusCity();
    this.retryRequested.emit();
  }
  useLocation(): void {
    this.selectedPlace = null;
    this.cancelAutoSearch();
    this.form.controls.city.setValue('');
    this.form.controls.city.markAsUntouched();
    this.queryEdited.emit();
    this.locationRequested.emit();
  }
}
