import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { voiceEnvelope, VOICE_FRAME_SECONDS } from './voice-envelope';

@Injectable({
  providedIn: 'root',
})
export class IsabelVoice {
  private readonly http = inject(HttpClient);
  readonly enabled = signal(true);
  readonly progress = signal(0);
  readonly mouthOpening = signal(0);
  readonly state = signal<'idle' | 'loading' | 'speaking' | 'blocked' | 'error'>('idle');
  private request?: Subscription;
  private audio?: HTMLAudioElement;
  private url?: string;
  private generation = 0;
  private envelope: Float32Array = new Float32Array();
  private mouthFrame?: number;

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    if (!value) this.stop();
  }

  speak(text: string, language: 'es' | 'en' = 'es'): void {
    this.stop();
    if (!this.enabled() || !text.trim()) return;
    const generation = this.generation;
    this.state.set('loading');
    this.request = this.http
      .post(
        `${environment.apiBaseUrl}/api/v1/voz/`,
        language === 'es' ? { texto: text } : { texto: text, idioma: language },
        {
          responseType: 'blob',
          timeout: 50000,
        },
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
          void blob
            .arrayBuffer()
            .then((buffer) => {
              if (generation === this.generation) this.envelope = voiceEnvelope(buffer);
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
          void audio.play().catch((error: unknown) => {
            if (generation !== this.generation) return;
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
              this.state.set('blocked');
            } else {
              this.stop();
              this.state.set('error');
            }
          });
        },
        error: () => {
          if (generation === this.generation) this.state.set('error');
        },
      });
  }

  stop(): void {
    this.generation++;
    if (this.mouthFrame !== undefined) cancelAnimationFrame(this.mouthFrame);
    this.mouthFrame = undefined;
    this.envelope = new Float32Array();
    this.mouthOpening.set(0);
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
