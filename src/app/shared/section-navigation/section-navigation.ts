import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { Language } from '../../service/language';

export interface ScrollSection {
  id: string;
  label: string;
}

@Component({
  selector: 'app-section-navigation',
  imports: [],
  templateUrl: './section-navigation.html',
  styleUrl: './section-navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionNavigation {
  readonly language = inject(Language);
  readonly sections = input.required<readonly ScrollSection[]>();
  readonly activeIndex = signal(0);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const window = this.document.defaultView;
      if (!window) return;
      let frame: number | undefined;
      const update = () => {
        frame = undefined;
        const readingLine = Math.min(180, window.innerHeight * 0.25);
        let current = 0;
        this.sections().forEach((section, index) => {
          const target = this.document.getElementById(section.id);
          if (target && target.getBoundingClientRect().top <= readingLine) current = index;
        });
        if (
          window.scrollY > 0 &&
          window.scrollY + window.innerHeight >= this.document.documentElement.scrollHeight - 2
        ) {
          current = this.sections().length - 1;
        }
        this.activeIndex.set(current);
      };
      const schedule = () => {
        frame ??= window.requestAnimationFrame(update);
      };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      const observer =
        typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
      observer?.observe(this.document.body);
      schedule();
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        observer?.disconnect();
        if (frame !== undefined) window.cancelAnimationFrame(frame);
      });
    });
  }

  goTo(event: MouseEvent, id: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = this.document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const window = this.document.defaultView;
    target.scrollIntoView({
      behavior: window?.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
    target.focus({ preventScroll: true });
  }
}
