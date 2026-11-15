import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { createIsaPortrait } from './isa-portrait';
import { IsabelVoice } from '../../service/isabel-voice';
import { Language } from '../../service/language';
import { Translate } from '../translate';
import { IsaLifecycle, type IsaPhase } from './isa-lifecycle';
import type { IsaSegment } from '../../models/isa-performance';

@Component({
  selector: 'app-isabel',
  imports: [Translate],
  templateUrl: './isabel.html',
  styleUrl: './isabel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-sidebar]': 'sidebar()' },
})
export class Isabel {
  readonly sidebar = input(false);
  readonly busy = input(false);
  readonly text = input<string | null>(null);
  readonly segments = input<IsaSegment[] | undefined>();
  readonly voice = inject(IsabelVoice);
  readonly language = inject(Language);
  readonly avatarFailed = signal(false);
  readonly reducedMotion = signal(false);
  private readonly horizontalNavbar = signal(false);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('avatar');
  private readonly ready = signal(false);
  protected readonly portraitReady = this.ready.asReadonly();
  private controller?: Awaited<ReturnType<typeof createIsaPortrait>>;
  private destroyed = false;
  private readonly phase = signal<IsaPhase>('sleeping');
  private readonly lifecycle = new IsaLifecycle((phase) => this.phase.set(phase));
  private lastPose = '';
  private readonly destroyRef = inject(DestroyRef);
  private motionQuery?: MediaQueryList;
  private layoutQuery?: MediaQueryList;
  private readonly layoutChanged = (event: MediaQueryListEvent) =>
    this.horizontalNavbar.set(event.matches);
  private readonly motionChanged = (event: MediaQueryListEvent) =>
    this.reducedMotion.set(event.matches);

  constructor() {
    afterNextRender(() => {
      this.motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.reducedMotion.set(this.motionQuery?.matches ?? false);
      this.motionQuery?.addEventListener('change', this.motionChanged);
      this.layoutQuery = window.matchMedia?.('(max-width: 1023px)');
      this.horizontalNavbar.set(this.layoutQuery?.matches ?? false);
      this.layoutQuery?.addEventListener('change', this.layoutChanged);
      void this.loadAvatar();
    });
    let previousText: string | null = null;
    let previousSegments: IsaSegment[] | undefined;
    let attempted = false;
    effect((onCleanup) => {
      const text = this.text();
      const segments = this.segments();
      const enabled = this.voice.enabled();
      const language = this.language.code();
      if (text !== previousText || segments !== previousSegments) {
        previousText = text;
        previousSegments = segments;
        attempted = false;
      }
      untracked(() => {
        this.voice.stop();
        if (text && enabled && !attempted) {
          attempted = true;
          this.voice.speak(text, language, segments);
        }
      });
      onCleanup(() => this.voice.stop());
    });
    effect(() => {
      const busy = this.busy();
      const state = this.voice.state();
      untracked(() => this.lifecycle.update(busy, state));
    });
    effect(() => {
      const ready = this.ready();
      const state = this.voice.state();
      const reducedMotion = this.reducedMotion();
      const phase = this.phase();
      const lookDown = this.sidebar() && this.horizontalNavbar();
      if (!ready || !this.controller) return;
      const expression =
        state === 'speaking'
          ? 'isa-awake'
          : phase === 'awake'
            ? 'isa-awake'
            : phase === 'sleeping'
              ? 'isa-sleep'
              : phase === 'right'
                ? lookDown
                  ? 'isa-down'
                  : 'isa-right'
                : 'isa-awake';
      const animation = expression;
      const poseKey = `${reducedMotion ? 'static' : 'animated'}:${reducedMotion ? expression : animation}`;
      if (poseKey === this.lastPose) return;
      this.lastPose = poseKey;
      if (reducedMotion) {
        this.controller.setExpression(expression);
      } else {
        this.controller.play(animation);
      }
    });
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.lifecycle.destroy();
      this.voice.stop();
      this.controller?.destroy();
      this.motionQuery?.removeEventListener('change', this.motionChanged);
      this.layoutQuery?.removeEventListener('change', this.layoutChanged);
    });
    effect(() => {
      if (!this.ready()) return;
      const state = this.voice.state();
      this.controller?.setWorking(this.busy() || state === 'loading');
      this.controller?.setSpeaking(state === 'speaking');
    });
    effect(() => {
      if (this.ready() && this.voice.state() === 'speaking') {
        this.controller?.setSpeechTime(this.voice.speechTime());
      }
    });
  }

  toggleVoice(): void {
    this.voice.setEnabled(!this.voice.enabled());
  }

  private async loadAvatar(): Promise<void> {
    try {
      const { createIsaPortrait } = await import('./isa-portrait');
      if (this.destroyed) return;
      const controller = await createIsaPortrait(this.host().nativeElement);
      if (this.destroyed) {
        controller.destroy();
        return;
      }
      this.controller = controller;
      this.ready.set(true);
    } catch {
      if (!this.destroyed) this.avatarFailed.set(true);
    }
  }
}
