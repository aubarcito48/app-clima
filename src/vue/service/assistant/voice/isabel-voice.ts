import { VoiceHttpError } from '../../../api/voice-error';
import { ref } from 'vue';
import { Subscription, retry, tap, throwError, timer } from 'rxjs';
import { apiBaseUrl } from '../../../api/http';
const environment = { apiBaseUrl };
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
class IsabelVoiceEngine {
  readonly enabled = ref(true);
  readonly progress = ref(0);
  readonly mouthOpening = ref(0);
  readonly speechTime = ref(0);
  readonly gesture = ref<IsaGesture>('isa-awake');
  readonly state = ref<'idle' | 'loading' | 'speaking' | 'blocked' | 'busy' | 'error'>('idle');
  readonly waitingForVoice = ref(false);
  private request?: Subscription;
  private audio?: HTMLAudioElement;
  private url?: string;
  private generation = 0;
  private clips: (VoiceClip & {
    language: 'es' | 'en';
  })[] = [];
  private playingClip = false;
  private streamComplete = false;
  private envelope: Float32Array = new Float32Array();
  private mouthFrame?: number;
  private cues: IsaCue[] = [];
  private playback?: ReturnType<typeof createIsaPlayback>;
  setEnabled(value: boolean): void {
    this.enabled.value = value;
    if (!value) this.stop();
  }
  speak(text: string, language: 'es' | 'en' = 'es', segments?: IsaSegment[]): void {
    this.stop();
    if (!this.enabled.value || !text.trim()) return;
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
      pause_ms: 0,
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
    this.state.value = 'loading';
    this.request = requestVoice(`${environment.apiBaseUrl}/api/v1/voz/`, {
      texto: narration,
      ...(language === 'en' ? { idioma: language as 'en' } : {}),
      ...performance,
    })
      .pipe(
        retry({
          count: 1,
          delay: (error: unknown) => {
            if (!(error instanceof VoiceHttpError) || error.status !== 429)
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
            this.waitingForVoice.value = true;
            return timer(Math.max(1, seconds) * 1000).pipe(
              tap(() => (this.waitingForVoice.value = false)),
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
          this.state.value =
            error instanceof VoiceHttpError && error.status === 429 ? 'busy' : 'error';
        },
      });
  }
  private playNext(generation: number): void {
    if (generation !== this.generation) return;
    const clip = this.clips.shift();
    if (!clip) {
      if (this.streamComplete) this.stop();
      else this.state.value = 'loading';
      return;
    }
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
        this.progress.value = Math.min(
          1,
          (clip.index + audio.currentTime / audio.duration) / clip.total,
        );
    };
    audio.onplaying = () => {
      if (generation !== this.generation) return;
      this.state.value = 'speaking';
      if (this.mouthFrame !== undefined) cancelAnimationFrame(this.mouthFrame);
      const animateMouth = () => {
        if (generation !== this.generation) return;
        const frame = Math.floor(audio.currentTime / VOICE_FRAME_SECONDS);
        const level = audio.paused ? 0 : (this.envelope[frame] ?? 0);
        this.mouthOpening.value = Math.round(level * 20) / 20;
        this.speechTime.value =
          this.playback?.sourceSecondsAt(audio.currentTime) ??
          isaSpeechTimeAt(this.cues, clip.segments, audio.currentTime);
        this.gesture.value = audio.paused
          ? 'isa-awake'
          : isaGestureAt(this.cues, audio.currentTime);
        this.mouthFrame = requestAnimationFrame(animateMouth);
      };
      animateMouth();
    };
    audio.onended = () => {
      if (generation !== this.generation) return;
      if (this.mouthFrame !== undefined) cancelAnimationFrame(this.mouthFrame);
      this.mouthFrame = undefined;
      this.playingClip = false;
      this.mouthOpening.value = 0;
      this.gesture.value = 'isa-awake';
      this.playNext(generation);
    };
    audio.onerror = () => {
      if (generation !== this.generation) return;
      this.stop();
      this.state.value = 'error';
    };
    void prepared.then(() => {
      if (generation === this.generation && audio === this.audio) this.playAudio(audio, generation);
    });
  }
  resume(): void {
    if (this.enabled.value && this.state.value === 'blocked' && this.audio)
      this.playAudio(this.audio, this.generation);
  }
  private playAudio(audio: HTMLAudioElement, generation: number): void {
    // Called directly by the resume button to retain the browser's user gesture.
    void audio.play().catch((error: unknown) => {
      if (generation !== this.generation || audio !== this.audio) return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.state.value = 'blocked';
      } else {
        this.stop();
        this.state.value = 'error';
      }
    });
  }
  stop(): void {
    this.generation++;
    this.clips = [];
    this.playingClip = false;
    this.streamComplete = false;
    if (this.mouthFrame !== undefined) cancelAnimationFrame(this.mouthFrame);
    this.mouthFrame = undefined;
    this.envelope = new Float32Array();
    this.mouthOpening.value = 0;
    this.speechTime.value = 0;
    this.gesture.value = 'isa-awake';
    this.cues = [];
    this.playback = undefined;
    this.waitingForVoice.value = false;
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
    this.progress.value = 0;
    this.state.value = 'idle';
  }
}

const voice = new IsabelVoiceEngine();
export function useIsabelVoice() {
  return voice;
}
if (import.meta.hot) import.meta.hot.dispose(() => voice.stop());
