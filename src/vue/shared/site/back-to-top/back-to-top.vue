<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import WeatherIcon from '../../weather/weather-icon/weather-icon.vue';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const document = globalThis.document;
const visible = ref(false);
function scrollToTop(): void {
    const window = document.defaultView;
    if (!window)
        return;
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
    });
}
const destroyRef = { onDestroy: cleanup };
onMounted(() => {
    const window = document.defaultView;
    if (!window)
        return;
    const update = () => visible.value = window.scrollY > 320;
    update();
    window.addEventListener('scroll', update, { passive: true });
    destroyRef.onDestroy(() => window.removeEventListener('scroll', update));
});

defineExpose({ scrollToTop });
</script>

<template>
<div data-component="app-back-to-top"><template v-if="visible">
  <button type="button" class="back-to-top" :aria-label="(t('Volver arriba')) ?? undefined" :title="t('Volver arriba')" @click="scrollToTop()">
    <WeatherIcon name="arrow" class="-rotate-90" :size="22" />
  </button>
</template></div>
</template>

<style scoped lang="scss">
[data-component="app-back-to-top"] {
  position: fixed;
  right: max(1.25rem, calc(env(safe-area-inset-right) + 0.75rem));
  bottom: max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem));
  z-index: 40;
}

.back-to-top {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-blue);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-blue);
  box-shadow: 0 6px 20px #12395226;
  transition:
    background-color 160ms,
    transform 160ms;
}

.back-to-top:hover {
  background: var(--color-sky);
  transform: translateY(-2px);
}

.back-to-top:active {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .back-to-top {
    transition: none;
  }

  .back-to-top:hover {
    transform: none;
  }
}

</style>
