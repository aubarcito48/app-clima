<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, useElementRef, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const document = globalThis.document;
const stage = useElementRef<HTMLElement>('stage');
const active = ref(0);
const paused = ref(false);
const visible = ref(true);
const pageVisible = ref(!document.hidden);
let suppressToggle = false;
let pointerStart: {
    x: number;
    y: number;
} | null = null;
const slides = [
    {
        id: 'forest',
        src: 'climate-awareness/forest.webp',
        width: 1100,
        height: 550,
        alt: 'Río turquesa entre un bosque frondoso y montañas con niebla.',
        title: 'Cuidemos nuestros bosques',
        message: 'Respetá la naturaleza y las áreas protegidas.',
    },
    {
        id: 'water',
        src: 'climate-awareness/water.webp',
        width: 1100,
        height: 503,
        alt: 'Agua cristalina que fluye entre rocas y árboles.',
        title: 'Cada gota cuenta',
        message: 'Evitá desperdiciar agua en tus tareas de todos los días.',
    },
    {
        id: 'clean-energy',
        src: 'climate-awareness/clean-energy.webp',
        width: 1100,
        height: 436,
        alt: 'Aerogeneradores sobre colinas verdes junto al mar.',
        title: 'Un futuro con energía limpia',
        message: 'Ahorrá energía y aprovechá la luz natural.',
    },
] as const;
function toggleRotation() {
    if (suppressToggle) {
        suppressToggle = false;
        return;
    }
    paused.value = ((value) => !value)(paused.value);
}
function select(index: number) {
    paused.value = true;
    active.value = (index + slides.length) % slides.length;
}
function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
        return;
    event.preventDefault();
    select(active.value + (event.key === 'ArrowRight' ? 1 : -1));
}
function pointerDown(event: PointerEvent) {
    if (event.isPrimary && event.button === 0)
        pointerStart = { x: event.clientX, y: event.clientY };
}
function pointerUp(event: PointerEvent) {
    const start = pointerStart;
    pointerStart = null;
    if (!start)
        return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) > 40 && Math.abs(delta) > Math.abs(event.clientY - start.y)) {
        select(active.value + (delta < 0 ? 1 : -1));
        suppressToggle = true;
    }
}
function cancelPointer() {
    pointerStart = null;
}
const window = document.defaultView;
const visibilityChanged = () => pageVisible.value = !document.hidden;
document.addEventListener('visibilitychange', visibilityChanged);
({ onDestroy: cleanup }).onDestroy(() => document.removeEventListener('visibilitychange', visibilityChanged));
watchEffect((onCleanup) => {
    if (!window || paused.value || !visible.value || !pageVisible.value)
        return;
    const interval = window.setInterval(() => active.value = ((value) => (value + 1) % slides.length)(active.value), 5000);
    onCleanup(() => window.clearInterval(interval));
});
watchPostEffect((onCleanup) => {
    const element = stage.value;
    if (!element || typeof IntersectionObserver === 'undefined')
        return;
    const observer = new IntersectionObserver((entries) => visible.value = entries[0]?.isIntersecting ?? false);
    observer.observe(element);
    onCleanup(() => observer.disconnect());
});

defineExpose({ toggleRotation, select, onKeydown, pointerDown, pointerUp, cancelPointer });
</script>

<template>
<div data-component="app-climate-awareness"><section class="awareness-slider" :aria-label="t('Concientizaci\u00F3n clim\u00E1tica')" :aria-roledescription="t('carrusel')" @keydown="onKeydown($event)">
  <div class="image-stage" @pointerdown="pointerDown($event)" @pointerup="pointerUp($event)" @pointercancel="cancelPointer()" ref="stage">
    <template v-for="(slide, index) in slides" :key="slide.id">
      <figure class="awareness-slide" role="group" :hidden="(active !== index)" :aria-roledescription="t('diapositiva')" :aria-label="t('{index} de {total}', { 'index': (index + 1), 'total': slides.length })">
        <img draggable="false" :src="slide.src" :alt="t(slide.alt)" :width="slide.width" :height="slide.height" :loading="((index === 0) ? 'eager' : 'lazy')" />
        <figcaption >
          <h2 class="font-display text-sm font-bold leading-5">{{ t(slide.title) }}</h2>
          <p class="mt-1 text-xs leading-5">{{ t(slide.message) }}</p>
        </figcaption>
      </figure>
    </template><button type="button" class="image-toggle" :aria-label="(paused ? (t('Reanudar presentaci\u00F3n ambiental')) : (t('Pausar presentaci\u00F3n ambiental')))" :title="(paused ? (t('Toc\u00E1 para reanudar')) : (t('Toc\u00E1 para pausar')))" @click="toggleRotation()"></button>
  </div>
  <img class="slider-mascot" src="stitch-coast.svg" alt="" aria-hidden="true" width="160" height="135" draggable="false" />
  <div class="slider-controls">
    <div class="flex items-center" role="group" :aria-label="t('Elegir imagen ambiental')">
      <template v-for="(slide, index) in slides" :key="slide.id">
        <button type="button" class="slide-dot" :aria-label="t('Ver imagen {index}: {title}', { 'index': (index + 1), 'title': (t(slide.title)) })" :aria-current="((active === index) ? 'true' : undefined)" @focus="paused = true" @click="select(index)">
          <span aria-hidden="true"></span>
        </button>
      </template></div>
  </div>
  <p class="sr-only" aria-atomic="true" :aria-live="(paused ? 'polite' : 'off')">
    {{ t('Imagen') }} {{ (active + 1) }} {{ t('de') }} {{ slides.length }}:
    {{ t(slides[active].title) }}.
  </p>
</section>
</div>
</template>

<style scoped>
[data-component="app-climate-awareness"] {
  display: block;
  min-width: 0;
}
.awareness-slider {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-control-line);
  border-radius: var(--radius-app);
  background: #123952;
  color: #ffffff;
  isolation: isolate;
}
.image-stage {
  position: relative;
  height: clamp(13rem, 18vw, 15rem);
  touch-action: pan-y;
}
.image-toggle {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-control);
  background: transparent;
}
.image-toggle:focus-visible {
  outline: 3px solid #ffe1a0;
  outline-offset: -4px;
}
.awareness-slide {
  position: absolute;
  inset: 0;
  margin: 0;
}
.awareness-slide[hidden] {
  display: none;
}
.awareness-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  user-select: none;
}
.awareness-slide figcaption {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  width: min(66%, 21rem);
  flex-direction: column;
  justify-content: center;
  padding: 3.5rem 1rem 2.5rem;
  background: #0a263be8;
  color: #ffffff;
}
.slider-controls {
  position: absolute;
  z-index: 1;
  right: 0.35rem;
  bottom: 0.25rem;
  left: 0.35rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}
.slider-mascot {
  position: absolute;
  z-index: 2;
  top: 0.5rem;
  right: 0.75rem;
  width: 3.25rem;
  height: auto;
  pointer-events: none;
  user-select: none;
}
.slide-dot {
  display: inline-flex;
  width: 1.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #102d43;
  color: #ffffff;
}
.slide-dot {
  background: transparent;
}
.slide-dot span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-app);
  border: 1px solid white;
  background: #102d43;
}
.slide-dot[aria-current='true'] span {
  width: 1.25rem;
  background: #ffe1a0;
  border-color: #ffe1a0;
}

.slide-dot:focus-visible {
  outline: 3px solid #ffe1a0;
  outline-offset: -3px;
}
@media (min-width: 640px) {
  .awareness-slide figcaption {
    width: min(40%, 25rem);
    padding: 4.25rem 2rem 2.5rem;
  }
  .slider-mascot {
    width: 4rem;
  }

  .awareness-slide h2 {
    font-size: 1.125rem;
    line-height: 1.5rem;
  }

  .awareness-slide p {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.5rem;
  }

  .slider-controls {
    left: 1rem;
    bottom: 0.5rem;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .awareness-slide:not([hidden]) {
    animation: awareness-enter 220ms ease;
  }
  @keyframes awareness-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}

</style>
