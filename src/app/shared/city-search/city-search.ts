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
import { CityQuery, CitySearchFeedback } from '../../models/city-query';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { cityRequired, normalizeCityQuery } from './city-query';
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
  readonly form = new FormGroup({
    city: new FormControl('', { nonNullable: true, validators: [cityRequired] }),
    country: new FormControl('', { nonNullable: true }),
  });
  readonly examples = ['Córdoba', 'Buenos Aires', 'Mendoza'];
  private readonly cityField = viewChild.required<ElementRef<HTMLInputElement>>('cityField');
  private readonly countryField = viewChild.required<ElementRef<HTMLInputElement>>('countryField');

  constructor() {
    afterRenderEffect(() => {
      const feedback = this.feedback();
      if (feedback) {
        const field = feedback.kind === 'ambiguous' ? this.countryField() : this.cityField();
        field.nativeElement.focus();
      }
    });
  }

  get cityInvalid(): boolean {
    return this.form.controls.city.touched && this.form.controls.city.invalid;
  }

  submit(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.cityField().nativeElement.focus();
      return;
    }
    const query = normalizeCityQuery(this.form.getRawValue());
    // Solo se normaliza el valor enviado: los campos conservan lo que escribió la persona.
    this.queryEdited.emit();
    this.querySubmitted.emit(query);
  }

  chooseExample(city: string): void {
    if (this.busy()) return;
    this.form.setValue({ city, country: 'AR' });
    this.submit();
  }

  chooseCountry(country: string): void {
    if (this.busy()) return;
    this.form.controls.country.setValue(country);
    this.submit();
  }

  onEdited(): void {
    this.queryEdited.emit();
  }
}
