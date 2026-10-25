import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Language } from '../../service/language';

@Component({
  selector: 'app-language-toggle',
  template: `
    <div class="language-control" role="group" [attr.aria-label]="language.text('Idioma')">
      <button
        type="button"
        lang="es"
        aria-label="Español"
        [attr.aria-pressed]="language.code() === 'es'"
        (click)="language.set('es')"
      >
        ES
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        lang="en"
        aria-label="English"
        [attr.aria-pressed]="language.code() === 'en'"
        (click)="language.set('en')"
      >
        EN
      </button>
    </div>
  `,
  styles: `
    :host {
      display: inline-block;
      flex-shrink: 0;
    }
    .language-control {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0 6px;
      border: 1px solid var(--color-control-line);
      border-radius: 14px;
      background: var(--color-surface);
      color: var(--color-secondary);
      font-size: 12px;
    }
    button {
      min-height: 44px;
      min-width: 30px;
      padding: 0 4px;
      cursor: pointer;
      border-radius: 8px;
    }
    button[aria-pressed='true'] {
      color: var(--color-blue);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    button:hover {
      background: var(--color-sky);
    }
    button:focus-visible {
      outline: 2px solid var(--color-blue);
      outline-offset: 1px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageToggle {
  readonly language = inject(Language);
}
