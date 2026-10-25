import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CityQuery, CitySearchFeedback, CountryChoice } from '../../models/city-query';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { cityRequired, countryCode, nameLength, normalizeCityQuery } from './city-query';
@Component({
  selector: 'app-city-search',
  imports: [ReactiveFormsModule, WeatherIcon],
  templateUrl: './city-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class CitySearch {
  readonly busy = input(false);
  readonly feedback = input<CitySearchFeedback | null>(null);
  readonly querySubmitted = output<CityQuery>();
  readonly queryEdited = output<void>();
  readonly retryRequested = output<void>();
  readonly form = new FormGroup({
    city: new FormControl('', { nonNullable: true, validators: [cityRequired, nameLength] }),
    country: new FormControl('', { nonNullable: true, validators: [countryCode] }),
  });
  readonly region = new FormControl('', { nonNullable: true, validators: [nameLength] });
  readonly examples = ['Córdoba', 'Buenos Aires', 'Mendoza'];
  private readonly cityField = viewChild.required<ElementRef<HTMLInputElement>>('cityField');
  private readonly countryField = viewChild.required<ElementRef<HTMLInputElement>>('countryField');
  private readonly regionField = viewChild.required<ElementRef<HTMLInputElement>>('regionField');
  private readonly feedbackPanel = viewChild<ElementRef<HTMLElement>>('feedbackPanel');
  private readonly submitButton = viewChild.required<ElementRef<HTMLButtonElement>>('submitButton');

  constructor() {
    afterRenderEffect(() => {
      const feedback = this.feedback();
      if (feedback) {
        if (feedback.retryable) this.feedbackPanel()?.nativeElement.focus();
        else this.focusCorrection(feedback);
      }
    });
  }

  get cityInvalid(): boolean {
    return this.form.controls.city.touched && this.form.controls.city.invalid;
  }
  get countryInvalid(): boolean {
    return this.form.controls.country.touched && this.form.controls.country.invalid;
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.region.markAsTouched();
    if (this.form.invalid || this.region.invalid) {
      (this.cityInvalid
        ? this.cityField()
        : this.countryInvalid
          ? this.countryField()
          : this.regionField()
      ).nativeElement.focus();
      return;
    }
    const query = normalizeCityQuery({ ...this.form.getRawValue(), region: this.region.value });
    // Solo se normaliza el valor enviado: los campos conservan lo que escribió la persona.
    this.queryEdited.emit();
    this.querySubmitted.emit(query);
  }

  chooseExample(city: string): void {
    this.form.setValue({ city, country: 'AR' });
    this.region.setValue('');
    this.submit();
  }

  chooseCountry(country: string): void {
    this.form.controls.country.setValue(country);
    this.submit();
  }

  chooseLocation(choice: CountryChoice): void {
    this.form.controls.country.setValue(choice.country);
    if (choice.city) this.form.controls.city.setValue(choice.city);
    this.region.setValue(choice.region ?? '');
    this.submitButton().nativeElement.focus();
    this.submit();
  }

  onEdited(): void {
    this.queryEdited.emit();
  }
  focusCity(): void {
    this.cityField().nativeElement.focus();
  }
  requestRetry(): void {
    this.submitButton().nativeElement.focus();
    this.retryRequested.emit();
  }
  focusCorrection(feedback = this.feedback()): void {
    const field =
      feedback?.field === 'region' ||
      (feedback?.kind === 'ambiguous' && this.form.controls.country.value.trim())
        ? this.regionField()
        : feedback?.field === 'country' || feedback?.kind === 'ambiguous'
          ? this.countryField()
          : this.cityField();
    field.nativeElement.focus();
  }
}
