import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { WeatherPreview } from '../../models/weather-preview';
import { WeatherMusic } from '../weather-music/weather-music';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { FavoritePlaces } from '../../service/favorite-places';
import { SavedPlace } from '../../models/saved-place';

@Component({
  selector: 'app-weather-sidebar',
  imports: [WeatherMusic, WeatherIcon],
  templateUrl: './weather-sidebar.html',
  styleUrl: './weather-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherSidebar {
  readonly weather = input<WeatherPreview | null>(null);
  readonly favorites = inject(FavoritePlaces);
  readonly placesOpen = signal(false);
  readonly placeSelected = output<SavedPlace>();
  readonly placesButton = viewChild<ElementRef<HTMLButtonElement>>('placesButton');
  removePlace(id: string) {
    this.favorites.remove(id);
    this.placesButton()?.nativeElement.focus();
  }
}
