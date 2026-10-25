import { Translate } from '../translate';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { WeatherIcon } from '../weather-icon/weather-icon';
import { FavoritePlaces } from '../../service/favorite-places';
import { SavedPlace } from '../../models/saved-place';

@Component({
  selector: 'app-weather-sidebar',
  imports: [Translate, WeatherIcon, NgTemplateOutlet],
  templateUrl: './weather-sidebar.html',
  styleUrl: './weather-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherSidebar {
  private readonly document = inject(DOCUMENT);
  readonly desktop = signal(true);
  readonly collapsed = model(false);
  readonly mobileOpen = signal(false);
  readonly mobileMenu = viewChild<ElementRef<HTMLDialogElement>>('mobileMenu');
  readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');
  private previousOverflow: string | null = null;
  constructor() {
    const query = this.document.defaultView?.matchMedia?.('(min-width: 1024px)');
    if (query) this.desktop.set(query.matches);
    const resize = () => {
      this.closeMenu(false);
      this.desktop.set(query!.matches);
    };
    query?.addEventListener('change', resize);
    inject(DestroyRef).onDestroy(() => {
      query?.removeEventListener('change', resize);
      this.unlockScroll();
    });
  }
  readonly favorites = inject(FavoritePlaces);
  readonly placesOpen = signal(false);
  readonly placeSelected = output<SavedPlace>();
  readonly placesButton = viewChild<ElementRef<HTMLButtonElement>>('placesButton');
  compact() {
    return this.desktop() && this.collapsed();
  }
  openMenu() {
    const dialog = this.mobileMenu()?.nativeElement;
    if (!dialog || dialog.open) return;
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    dialog.showModal();
    this.mobileOpen.set(true);
    dialog.querySelector<HTMLButtonElement>('[data-close-menu]')?.focus();
  }
  closeMenu(restoreFocus = true) {
    const dialog = this.mobileMenu()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.mobileOpen.set(false);
    this.unlockScroll();
    if (restoreFocus) this.menuTrigger()?.nativeElement.focus({ preventScroll: true });
  }
  dialogClosed() {
    this.mobileOpen.set(false);
    this.unlockScroll();
  }
  cancelMenu(event: Event) {
    event.preventDefault();
    this.closeMenu();
  }
  backdropClick(event: MouseEvent) {
    const dialog = this.mobileMenu()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.closeMenu();
  }
  private unlockScroll() {
    if (this.previousOverflow !== null) {
      this.document.body.style.overflow = this.previousOverflow;
      this.previousOverflow = null;
    }
  }
  toggleCollapsed() {
    this.collapsed.update((value) => !value);
    this.placesOpen.set(false);
  }
  togglePlaces() {
    if (this.compact()) {
      this.collapsed.set(false);
      this.placesOpen.set(true);
    } else this.placesOpen.update((value) => !value);
  }
  forecastSelected() {
    this.placesOpen.set(false);
    this.closeMenu(false);
    this.document.getElementById('city')?.focus({ preventScroll: true });
  }
  selectPlace(place: SavedPlace) {
    this.placesOpen.set(false);
    this.closeMenu(false);
    this.placeSelected.emit(place);
  }
  removePlace(id: string) {
    this.favorites.remove(id);
    this.placesButton()?.nativeElement.focus();
  }
}
