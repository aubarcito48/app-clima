import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ColorTheme {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly system = this.window?.matchMedia?.('(prefers-color-scheme: dark)');
  private preference: 'light' | 'dark' | null = this.read();
  private readonly current = signal(this.preference ?? (this.system?.matches ? 'dark' : 'light'));
  readonly mode = this.current.asReadonly();

  constructor() {
    this.apply();
    const systemChanged = () => {
      if (this.preference === null) {
        this.current.set(this.system?.matches ? 'dark' : 'light');
        this.apply();
      }
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== 'stitchweather.theme' && event.key !== null) return;
      this.preference = this.read();
      this.current.set(this.preference ?? (this.system?.matches ? 'dark' : 'light'));
      this.apply();
    };
    this.system?.addEventListener('change', systemChanged);
    this.window?.addEventListener('storage', storageChanged);
    inject(DestroyRef).onDestroy(() => {
      this.system?.removeEventListener('change', systemChanged);
      this.window?.removeEventListener('storage', storageChanged);
    });
  }

  toggle(): void {
    this.preference = this.current() === 'dark' ? 'light' : 'dark';
    this.current.set(this.preference);
    try {
      this.window?.localStorage.setItem('stitchweather.theme', this.preference);
    } catch {
      // The toggle remains usable when browser storage is unavailable.
    }
    this.apply();
  }

  private read(): 'light' | 'dark' | null {
    try {
      const value = this.window?.localStorage.getItem('stitchweather.theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private apply(): void {
    this.document.documentElement.dataset['theme'] = this.current();
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', this.current() === 'dark' ? '#0c1b2b' : '#eefaff');
  }
}
