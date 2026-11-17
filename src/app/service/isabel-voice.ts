import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription, retry, tap, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { voiceEnvelope, VOICE_FRAME_SECONDS } from './voice-envelope';
import { createIsaPlayback } from '../shared/isabel/isa-playback';
import {
  IsaCue,
  IsaGesture,
  IsaSegment,
  isaGestureAt,
  isaSpeechTimeAt,
  readIsaSegments,
  readIsaTimeline,
} from '../models/isa-performance';

@Injectable({
  providedIn: 'root',
})
export class IsabelVoice {
  private readonly http = inject(HttpClient);
  readonly enabled = signal(true);
  readonly progress = signal(0);
  readonly mouthOpening = signal(0);
  readonly speechTime = signal(0);
  readonly gesture = signal<IsaGesture>('isa-awake');
  readonly state = signal<'idle' | 'loading' | 'speaking' | 'blocked' | 'busy' | 'error'>('idle');
  readonly waitingForVoice = signal(false);
  private request?: Subscription;
  private audio?: HTMLAudioElement;
  private url?: string;
  private generation = 0;
  private envelope: Float32Array = new Float32Array();
  private mouthFrame?: number;
  private cues: IsaCue[] = [];
  private playback?: ReturnType<typeof createIsaPlayback>;

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    if (!value) this.stop();
  }

  speak(text: string, language: 'es' | 'en' = 'es', segments?: IsaSegment[]): void {
    this.stop();
    if (!this.enabled() || !text.trim()) return;
    const narration =
      language === 'es'
        ? `¡Buenas, explorador!\n${text.trim()}\n¡Hasta luego, explorador!`
        : `Hello, explorer!\n${text.trim()}\nSee you later, explorer!`;
    const generation = this.generation;
    const plan = readIsaSegments(segments, text.trim());
    const neutral = (text: string): IsaSegment => ({
      text,
      gesture: 'isa-awake',
      speed: 1,
      energy: 1,
      pause_ms: 160,
    });
    const performance = plan
      ? {
          segmentos: [
            neutral(language === 'es' ? '¡Buenas, explorador!' : 'Hello, explorer!'),
            ...plan,
            {
              ...neutral(
                language === 'es' ? '¡Hasta luego, explorador!' : 'See you later, explorer!',
              ),
              pause_ms: 0,
            },
          ],
        }
      : {};
    this.state.set('loading');
    this.request = this.http
      .post(
        `${environment.apiBaseUrl}/api/v1/voz/`,
        { texto: narration, ...(language === 'en' ? { idioma: language } : {}), ...performance },
        {
          responseType: 'blob',
          // Piper may take 45 s, then the optional Rhubarb probe up to 60 s.
          timeout: 120000,
        },
      )
      .pipe(
        retry({
          count: 1,
          delay: (error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 429)
              return throwError(() => error);
            const header = error.headers.get('Retry-After');
            const seconds =
              header === null
                ? 5
                : /^\d+$/.test(header.trim())
                  ? Number(header)
                  : (Date.parse(header) - Date.now()) / 1000;
            // Respect a long Retry-After without keeping an invisible retry alive.
            if (!Number.isFinite(seconds) || seconds > 30) return throwError(() => error);
            this.waitingForVoice.set(true);
            return timer(Math.max(1, seconds) * 1000).pipe(
              tap(() => this.waitingForVoice.set(false)),
            );
          },
        }),
      )
      .subscribe({
        next: (blob) => {
          if (generation !== this.generation) return;
          if (blob.type !== 'audio/wav' || blob.size < 44) {
            this.state.set('error');
            return;
          }
          this.url = URL.createObjectURL(blob);
          const audio = (this.audio = new Audio(this.url));
          const prepared = blob
            .arrayBuffer()
            .then((buffer) => {
              if (generation === this.generation) {
                this.envelope = voiceEnvelope(buffer);
                this.cues = plan ? readIsaTimeline(buffer) : [];
                this.playback = createIsaPlayback(buffer, language);
              }
            })
            .catch(() => {
              /* El audio sigue funcionando si no se puede analizar. */
            });
          audio.ontimeupdate = () => {
            if (
              generation === this.generation &&
              Number.isFinite(audio.duration) &&
              audio.duration > 0
            )
              this.progress.set(Math.min(1, audio.currentTime / audio.duration));
          };
          audio.onplaying = () => {
            if (generation !== this.generation) return;
            this.state.set('speaking');
            if (this.mouthFrame !== undefined) cancelAnimationFrame(this.mouthFrame);
            const animateMouth = () => {
              if (generation !== this.generation) return;
              const frame = Math.floor(audio.currentTime / VOICE_FRAME_SECONDS);
              const level = audio.paused ? 0 : (this.envelope[frame] ?? 0);
              this.mouthOpening.set(Math.round(level * 20) / 20);
              this.speechTime.set(
                this.playback?.sourceSecondsAt(audio.currentTime) ??
                  isaSpeechTimeAt(this.cues, performance.segmentos ?? [], audio.currentTime),
              );
              this.gesture.set(
                audio.paused ? 'isa-awake' : isaGestureAt(this.cues, audio.currentTime),
              );
              this.mouthFrame = requestAnimationFrame(animateMouth);
            };
            animateMouth();
          };
          audio.onended = () => this.stop();
          audio.onerror = () => {
            if (generation !== this.generation) return;
            this.stop();
            this.state.set('error');
          };
          void prepared.then(() => {
            if (generation !== this.generation || audio !== this.audio) return;
            this.playAudio(audio, generation);
          });
        },
        error: (error: unknown) => {
          if (generation !== this.generation) return;
          this.waitingForVoice.set(false);
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 429 ? 'busy' : 'error',
          );
        },
      });
  }

  resume(): void {
    if (this.enabled() && this.state() === 'blocked' && this.audio)
      this.playAudio(this.audio, this.generation);
  }

  private playAudio(audio: HTMLAudioElement, generation: number): void {
    // Called directly by the resume button to retain the browser's user gesture.
    void audio.play().catch((error: unknown) => {
      if (generation !== this.generation || audio !== this.audio) return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.state.set('blocked');
      } else {
        this.stop();
        this.state.set('error');
      }
    });
  }

  stop(): void {
    this.generation++;
    if (this.mouthFrame !== undefined) cancelAnimationFrame(this.mouthFrame);
    this.mouthFrame = undefined;
    this.envelope = new Float32Array();
    this.mouthOpening.set(0);
    this.speechTime.set(0);
    this.gesture.set('isa-awake');
    this.cues = [];
    this.playback = undefined;
    this.waitingForVoice.set(false);
    this.request?.unsubscribe();
    this.request = undefined;
    if (this.audio) {
      this.audio.onended =
        this.audio.onerror =
        this.audio.onplaying =
        this.audio.ontimeupdate =
          null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = undefined;
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
    this.progress.set(0);
    this.state.set('idle');
  }
}
