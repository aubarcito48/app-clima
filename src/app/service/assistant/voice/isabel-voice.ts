import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Subscription, retry, tap, throwError, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { voiceEnvelope, VOICE_FRAME_SECONDS } from './voice-envelope';
import { requestVoice, VoiceClip } from './voice-stream';
import { createIsaPlayback } from '../../../shared/assistant/isabel/isa-playback';
import {
  IsaCue,
  IsaGesture,
  IsaSegment,
  isaGestureAt,
  isaSpeechTimeAt,
  readIsaSegments,
  readIsaTimeline,
} from '../../../models/assistant/isa-performance';

@Injectable({
  providedIn: 'root',
})
export class IsabelVoice {
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
  private clips: (VoiceClip & { language: 'es' | 'en' })[] = [];
  private playingClip = false;
  private streamComplete = false;
  private presentationReady = true;
  private startedNarration = false;
  private startupTimer?: ReturnType<typeof setTimeout>;
  private envelope: Float32Array = new Float32Array();
  private mouthFrame?: number;
  private cues: IsaCue[] = [];
  private playback?: ReturnType<typeof createIsaPlayback>;

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    if (!value) this.stop();
  }

  setPresentationReady(value: boolean): void {
    this.presentationReady = value;
    if (value && !this.playingClip && this.clips.length) this.playNext(this.generation);
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
    this.request = requestVoice(`${environment.apiBaseUrl}/api/v1/voz/`, {
      texto: narration,
      ...(language === 'en' ? { idioma: language as 'en' } : {}),
      ...performance,
    })
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
        next: (clip) => {
          if (generation !== this.generation) return;
          this.clips.push({ ...clip, language });
          if (!this.playingClip) this.playNext(generation);
        },
        complete: () => {
          if (generation !== this.generation) return;
          this.streamComplete = true;
          if (!this.playingClip) this.playNext(generation);
        },
        error: (error: unknown) => {
          if (generation !== this.generation) return;
          this.stop();
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 429 ? 'busy' : 'error',
          );
        },
      });
  }

  private playNext(generation: number): void {
    if (generation !== this.generation || !this.presentationReady) return;
    // Give multipart speech a bounded head start for the following phrase.
    if (
      !this.startedNarration &&
      (this.clips[0]?.total ?? 0) > 1 &&
      this.clips.length === 1 &&
      !this.streamComplete
    ) {
      if (this.startupTimer === undefined) {
        this.startupTimer = setTimeout(() => {
          this.startupTimer = undefined;
          if (generation !== this.generation) return;
          this.startedNarration = true;
          this.playNext(generation);
        }, 750);
      }
      return;
    }
    if (this.startupTimer !== undefined) clearTimeout(this.startupTimer);
    this.startupTimer = undefined;
    const clip = this.clips.shift();
    if (!clip) {
      if (this.streamComplete) this.stop();
      else this.state.set('loading');
      return;
    }
    this.startedNarration = true;
    this.playingClip = true;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(clip.blob);
    // Keep the same media element so Safari retains a user's playback permission.
    const audio = this.audio ?? new Audio();
    this.audio = audio;
    audio.src = this.url;
    this.envelope = new Float32Array();
    this.cues = [];
    this.playback = undefined;
    const prepared = clip.blob
      .arrayBuffer()
      .then((buffer) => {
        if (generation !== this.generation) return;
        this.envelope = voiceEnvelope(buffer);
        this.cues = readIsaTimeline(buffer);
        this.playback = createIsaPlayback(buffer, clip.language);
      })
      .catch(() => {
        /* Audio remains usable if optional animation metadata fails. */
      });
    audio.ontimeupdate = () => {
      if (generation === this.generation && Number.isFinite(audio.duration) && audio.duration > 0)
        this.progress.set(
          Math.min(1, (clip.index + audio.currentTime / audio.duration) / clip.total),
        );
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
            isaSpeechTimeAt(this.cues, clip.segments, audio.currentTime),
        );
        this.gesture.set(audio.paused ? 'isa-awake' : isaGestureAt(this.cues, audio.currentTime));
        this.mouthFrame = requestAnimationFrame(animateMouth);
      };
      animateMouth();
    };
    audio.onended = () => {
      if (generation !== this.generation) return;
      if (this.mouthFrame !== undefined) cancelAnimationFrame(this.mouthFrame);
      this.mouthFrame = undefined;
      this.playingClip = false;
      this.mouthOpening.set(0);
      this.gesture.set('isa-awake');
      this.playNext(generation);
    };
    audio.onerror = () => {
      if (generation !== this.generation) return;
      this.stop();
      this.state.set('error');
    };
    void prepared.then(() => {
      if (generation === this.generation && audio === this.audio) this.playAudio(audio, generation);
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
    if (this.startupTimer !== undefined) clearTimeout(this.startupTimer);
    this.startupTimer = undefined;
    this.startedNarration = false;
    this.clips = [];
    this.playingClip = false;
    this.streamComplete = false;
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
