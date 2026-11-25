<script setup lang="ts">
import { computed, ref, watchEffect, onMounted, onUnmounted } from 'vue';
import type { createIsaPortrait } from './isa-portrait';
import type { IsaSegment } from '../../../models/assistant/isa-performance';
import { useIsabelVoice } from '../../../service/assistant/voice/isabel-voice';
import { useLanguage } from '../../../service/preferences/language';
import { useElementRef, untracked } from '../../../composables/runtime';
import { IsaLifecycle, type IsaPhase } from './isa-lifecycle';

const props = withDefaults(
  defineProps<{
    sidebar?: boolean;
    presenceOnly?: boolean;
    busy?: boolean;
    text?: string | null;
    segments?: IsaSegment[];
  }>(),
  { sidebar: false, presenceOnly: false, busy: false, text: null },
);
const voice = useIsabelVoice();
const language = useLanguage();
const t = language.text;
const playbackBlocked = computed(() => voice.enabled.value && voice.state.value === 'blocked');
const voiceAction = computed(() =>
  playbackBlocked.value ? 'Reproducir audio' : voice.enabled.value ? 'Silenciar' : 'Activar voz',
);
const avatarFailed = ref(false);
const reducedMotion = ref(false);
const horizontalNavbar = ref(false);
const host = useElementRef<HTMLElement>('avatar');
const portraitReady = ref(false);
const phase = ref<IsaPhase>('sleeping');
const lifecycle = new IsaLifecycle((value) => {
  phase.value = value;
});
let controller: Awaited<ReturnType<typeof createIsaPortrait>> | undefined;
let destroyed = false;
let lastPose = '';
let motionQuery: MediaQueryList | undefined;
let layoutQuery: MediaQueryList | undefined;
const motionChanged = (event: MediaQueryListEvent) => {
  reducedMotion.value = event.matches;
};
const layoutChanged = (event: MediaQueryListEvent) => {
  horizontalNavbar.value = event.matches;
};

async function loadAvatar() {
  try {
    const { createIsaPortrait } = await import('./isa-portrait');
    if (destroyed || !host.value) return;
    const portrait = await createIsaPortrait(host.value);
    if (destroyed) {
      portrait.destroy();
      return;
    }
    controller = portrait;
    portraitReady.value = true;
  } catch {
    if (!destroyed) avatarFailed.value = true;
  }
}

onMounted(() => {
  if (props.presenceOnly) return;
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  layoutQuery = window.matchMedia('(max-width: 1023px)');
  reducedMotion.value = motionQuery.matches;
  horizontalNavbar.value = layoutQuery.matches;
  motionQuery.addEventListener('change', motionChanged);
  layoutQuery.addEventListener('change', layoutChanged);
  void loadAvatar();
});

let previousText: string | null = null;
let previousSegments: IsaSegment[] | undefined;
let attempted = false;
watchEffect((onCleanup) => {
  if (props.presenceOnly) return;
  const advice = props.text;
  const segments = props.segments;
  const enabled = voice.enabled.value;
  const code = language.code.value;
  if (advice !== previousText || segments !== previousSegments) {
    previousText = advice;
    previousSegments = segments;
    attempted = false;
  }
  untracked(() => {
    voice.stop();
    if (advice && enabled && !attempted) {
      attempted = true;
      voice.speak(advice, code, segments);
    }
  });
  onCleanup(() => voice.stop());
});
watchEffect(() => {
  const busy = props.busy;
  const state = voice.state.value;
  untracked(() => lifecycle.update(busy, state));
});
watchEffect(() => {
  const ready = portraitReady.value;
  const state = voice.state.value;
  const reduced = reducedMotion.value;
  const currentPhase = phase.value;
  const lookDown = props.sidebar && horizontalNavbar.value;
  if (!ready || !controller) return;
  const expression =
    state === 'speaking' || currentPhase === 'awake'
      ? 'isa-awake'
      : currentPhase === 'sleeping'
        ? 'isa-sleep'
        : currentPhase === 'right'
          ? lookDown
            ? 'isa-down'
            : 'isa-right'
          : 'isa-awake';
  const key = `${reduced ? 'static' : 'animated'}:${expression}`;
  if (key === lastPose) return;
  lastPose = key;
  if (reduced) controller.setExpression(expression);
  else controller.play(expression);
});
watchEffect(() => {
  if (!portraitReady.value || !controller) return;
  const state = voice.state.value;
  controller.setSpeechLanguage(language.code.value);
  controller.setWorking(props.busy || state === 'loading');
  controller.setSpeaking(state === 'speaking');
});
watchEffect(() => {
  if (portraitReady.value && voice.state.value === 'speaking')
    controller?.setSpeechTime(voice.speechTime.value);
});

function toggleVoice() {
  if (playbackBlocked.value) voice.resume();
  else voice.setEnabled(!voice.enabled.value);
}
function retryVoice() {
  if (props.text && voice.enabled.value && ['busy', 'error'].includes(voice.state.value))
    voice.speak(props.text, language.code.value, props.segments);
}
onUnmounted(() => {
  destroyed = true;
  lifecycle.destroy();
  voice.stop();
  controller?.destroy();
  motionQuery?.removeEventListener('change', motionChanged);
  layoutQuery?.removeEventListener('change', layoutChanged);
});
</script>

<template>
  <div data-component="app-isabel" :class="{ 'is-sidebar': sidebar }">
    <template v-if="presenceOnly">
      <section
        class="isa-card rounded-app border border-line bg-surface p-4 text-ink"
        aria-label="Isa"
      >
        <div class="isa-stage is-presence">
          <img
            src="isa-bot/runtime/isa-sleep-v3.webp"
            width="320"
            height="320"
            alt="Isa"
            class="isa-fallback"
          />
        </div>
        <div class="isa-copy min-w-0 flex-1">
          <p class="mt-1 text-sm leading-6 text-secondary">
            {{ t('Tu compa\u00F1era del clima. Te leo el consejo para tu d\u00EDa.') }}
          </p>
          <p class="isa-status mt-2" aria-hidden="true"></p>
        </div>
      </section> </template
    ><template v-else>
      <section
        class="isa-card rounded-app border border-line bg-surface p-4 text-ink"
        aria-label="Isa"
      >
        <svg class="isa-edge-filter" width="0" height="0" aria-hidden="true" focusable="false">
          <defs>
            <filter id="isa-dark-edge" color-interpolation-filters="sRGB">
              <feMorphology in="SourceAlpha" operator="erode" radius="1" result="cleanEdge" />
              <feComposite in="SourceGraphic" in2="cleanEdge" operator="in" />
            </filter>
          </defs>
        </svg>
        <button
          type="button"
          class="isa-stage"
          :aria-label="'Isa: ' + t(voiceAction)"
          :aria-pressed="playbackBlocked ? undefined : voice.enabled.value"
          :title="t(voiceAction)"
          :class="{ 'is-speaking': voice.state.value === 'speaking' && !reducedMotion }"
          @click="toggleVoice()"
        >
          <span class="isa-avatar" aria-hidden="true" ref="avatar"></span>
          <template v-if="!portraitReady || avatarFailed">
            <img
              class="isa-fallback"
              src="isa-bot/runtime/isa-sleep-v3.webp"
              width="320"
              height="320"
              alt=""
              aria-hidden="true"
            />
          </template>
        </button>
        <div class="isa-copy min-w-0 flex-1">
          <p class="mt-1 text-sm leading-6 text-secondary">
            {{ t('Tu compa\u00F1era del clima. Te leo el consejo para tu d\u00EDa.') }}
          </p>
          <p
            class="isa-status mt-2 text-xs leading-5 text-secondary"
            role="status"
            aria-live="polite"
          >
            <template v-if="voice.state.value === 'loading'">
              {{
                t(
                  voice.waitingForVoice.value
                    ? 'La voz est\u00E1 ocupada. Reintentando\u2026'
                    : 'Isa est\u00E1 preparando tu audio\u2026',
                )
              }} </template
            ><template v-else-if="voice.state.value === 'speaking'">
              {{ t('Isa est\u00E1 hablando\u2026') }} </template
            ><template v-else-if="voice.state.value === 'blocked'">
              {{
                t(
                  'Toc\u00E1 a Isa para escuchar el consejo. Tambi\u00E9n pod\u00E9s leerlo como texto.',
                )
              }} </template
            ><template v-else-if="voice.state.value === 'error'">
              {{
                t('No pudimos reproducir la voz. El consejo sigue disponible como texto.')
              }} </template
            ><template v-else-if="voice.state.value === 'busy'">
              {{ t('La voz sigue ocupada. Pod\u00E9s volver a intentarlo.') }}
            </template>
          </p>
          <template
            v-if="
              voice.enabled.value &&
              text &&
              (voice.state.value === 'busy' || voice.state.value === 'error')
            "
          >
            <button
              type="button"
              class="mt-2 rounded-app border border-line px-3 py-2 text-sm"
              @click="retryVoice()"
            >
              {{ t('Reintentar voz') }}
            </button>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
[data-component='app-isabel'] {
  display: block;
}
.isa-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}
[data-component='app-isabel'].is-sidebar .isa-card {
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: center;
}
[data-component='app-isabel'].is-sidebar .isa-stage {
  width: 200px;
  max-width: 100%;
  height: auto;
  aspect-ratio: 1;
  flex-basis: auto;
}
.isa-stage {
  padding: 0;
  border: 0;
  cursor: pointer;
  position: relative;
  width: 108px;
  height: 116px;
  flex: 0 0 108px;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: transparent;
}
.isa-avatar {
  display: block;
  width: 100%;
  height: 100%;
}
.isa-stage.is-presence {
  cursor: default;
}
.isa-edge-filter {
  position: absolute;
  pointer-events: none;
}
/* Trim the white matte by one displayed pixel, without recoloring gray hair.
   One shared filter covers poses, both speech takes and the loading fallback. */
html[data-theme='dark'] .isa-avatar,
html[data-theme='dark'] .isa-fallback {
  filter: url('#isa-dark-edge');
}
.isa-fallback {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.isa-status {
  min-height: 3.75rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.isa-stage:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
.isa-stage:disabled {
  opacity: 0.6;
  cursor: default;
}
@media (max-width: 480px) {
  .isa-card {
    align-items: flex-start;
    gap: 0.5rem;
  }
  .isa-stage {
    width: 76px;
    height: 90px;
    flex-basis: 76px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-speaking .isa-avatar {
    animation: none;
  }
}
@media (max-width: 1023px) {
  [data-component='app-isabel'].is-sidebar .isa-card {
    flex-direction: row;
    gap: 0.75rem;
    text-align: left;
  }
  [data-component='app-isabel'].is-sidebar .isa-stage {
    width: 80px;
    height: 80px;
    flex: 0 0 80px;
  }
  [data-component='app-isabel'].is-sidebar .isa-copy {
    max-width: 15rem;
  }
  [data-component='app-isabel'].is-sidebar .isa-status {
    min-height: 0;
    margin-top: 0;
    justify-content: flex-start;
  }
}
@media (max-width: 640px) {
  [data-component='app-isabel'].is-sidebar .isa-card {
    width: 10rem;
    flex-direction: column;
    gap: 0;
    text-align: center;
  }
  [data-component='app-isabel'].is-sidebar .isa-stage {
    width: 88px;
    height: 88px;
    flex-basis: auto;
  }
  [data-component='app-isabel'].is-sidebar .isa-copy {
    width: 100%;
    max-width: 10rem;
  }
  [data-component='app-isabel'].is-sidebar .isa-copy > p:first-child {
    display: none;
  }
  [data-component='app-isabel'].is-sidebar .isa-status {
    min-height: 1rem;
    justify-content: center;
    font-size: 0.6875rem;
    line-height: 1rem;
  }
}
</style>
