import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { WeatherPreview } from '../../models/weather-preview';

const PLAYLISTS = {
  calm: {
    id: '37i9dQZF1DX4sWSpwq3Li',
    name: 'Peaceful Piano',
    reason: 'Un poco de piano para acompañar el frío o la lluvia.',
  },
  bright: {
    id: '37i9dQZF1DX3rxVfibe1L',
    name: 'Mood Booster',
    reason: 'Una selección con energía para acompañar un día cálido.',
  },
  chill: {
    id: '37i9dQZF1DX4WYpdgoIcn',
    name: 'Chill Hits',
    reason: 'Un ritmo tranquilo para acompañar tu día.',
  },
} as const;
export function weatherPlaylist(weather: Pick<WeatherPreview, 'temperature' | 'description'>) {
  const description = (weather.description ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/lluv|llov|torment|nieve|nevad|llovizn/u.test(description) || weather.temperature < 15)
    return PLAYLISTS.calm;
  if (weather.temperature >= 24) return PLAYLISTS.bright;
  return PLAYLISTS.chill;
}

@Component({
  selector: 'app-weather-music',
  imports: [],
  templateUrl: './weather-music.html',
  styleUrl: './weather-music.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherMusic {
  readonly compact = input(false);
  readonly weather = input<WeatherPreview | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  readonly playlist = computed(() => (this.weather() ? weatherPlaylist(this.weather()!) : null));
  readonly loadedFor = signal<string | null>(null);
  readonly key = computed(
    () => `${this.weather()?.city}:${this.weather()?.updatedAtUtc}:${this.playlist()?.id}`,
  );
  readonly embedUrl = computed(() => {
    const playlist = this.playlist();
    // Only fixed local IDs enter this resource URL; never user or API content.
    return playlist
      ? this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator`,
        )
      : null;
  });
}
