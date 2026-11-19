import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ENGLISH } from './translations';

export type LanguageCode = 'es' | 'en';
export const LANGUAGE_KEY = 'stitchweather.language';

@Injectable({ providedIn: 'root' })
export class Language {
  private readonly document = inject(DOCUMENT);
  private readonly selected = signal<LanguageCode>(this.read());
  readonly code = this.selected.asReadonly();
  readonly locale = computed(() => (this.code() === 'en' ? 'en-US' : 'es-AR'));

  constructor() {
    this.apply();
  }

  set(code: LanguageCode): void {
    this.selected.set(code);
    this.apply();
    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_KEY, code);
    } catch {
      /* The choice still works for this session. */
    }
  }

  text(
    value: string | null | undefined,
    params: Readonly<Record<string, string | number>> = {},
  ): string {
    const result = this.translate(value);
    return result.replace(/\{(\w+)\}/gu, (token, name: string) =>
      params[name] == null ? token : String(params[name]),
    );
  }

  private translate(value: string | null | undefined): string {
    if (!value || this.code() === 'es') return value ?? '';
    const key = value.trim().replace(/\s+/gu, ' ');
    const translated = ENGLISH[key];
    if (translated) return value.replace(value.trim(), translated);
    const saved = key.match(/^(.*) se (guardó en|quitó de) Mis lugares\.$/u);
    if (saved)
      return `${saved[1]} was ${saved[2] === 'guardó en' ? 'saved to' : 'removed from'} My places.`;
    const count = key.match(
      /^(\d+) lugares encontrados\. Usá las flechas y Enter o elegí uno de la lista\.$/u,
    );
    if (count)
      return `${count[1]} places found. Use the arrow keys and Enter or choose one from the list.`;
    return value;
  }

  private read(): LanguageCode {
    try {
      const saved = this.document.defaultView?.localStorage.getItem(LANGUAGE_KEY);
      if (saved === 'es' || saved === 'en') return saved;
    } catch {
      /* Storage can be unavailable. */
    }
    return 'es';
  }

  private apply(): void {
    this.document.documentElement.lang = this.code();
    this.document.title = `StitchWeather · ${this.text('Tu clima, más azul')}`;
  }
}
