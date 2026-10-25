import { Pipe, PipeTransform, inject } from '@angular/core';
import { Language } from '../service/language';

/** Impure so a language change also updates unchanged input strings. */
@Pipe({ name: 'translate', pure: false })
export class Translate implements PipeTransform {
  private readonly language = inject(Language);
  transform(
    value: string | null | undefined,
    params?: Readonly<Record<string, string | number>>,
  ): string {
    return this.language.text(value, params);
  }
}
