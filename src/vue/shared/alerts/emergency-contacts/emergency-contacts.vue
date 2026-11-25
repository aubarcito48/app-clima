<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, useElementRef, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import WeatherIcon from '../../weather/weather-icon/weather-icon.vue';
import { emergencyDirectory } from './emergency-directory';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const props = withDefaults(defineProps<{ selectedCountry?: string | null }>(), { selectedCountry: null });
const selectedCountry = computed(() => props.selectedCountry);
const directory = computed(() => emergencyDirectory(selectedCountry.value));
const contactsViewportRef = useElementRef<HTMLElement>('contactsViewport');
const canPrevious = ref(false);
const canNext = ref(false);
function updateControls() {
    const viewport = contactsViewportRef.value;
    if (!viewport)
        return;
    canPrevious.value = viewport.scrollLeft > 2;
    canNext.value = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2;
}
function move(direction: number) {
    const viewport = contactsViewportRef.value;
    if (!viewport)
        return;
    const reduce = viewport.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')
        .matches ?? true;
    viewport.scrollBy({
        left: direction * Math.max(240, viewport.clientWidth - 24),
        behavior: reduce ? 'instant' : 'smooth',
    });
}
function onKeydown(event: KeyboardEvent) {
    if (event.target !== contactsViewportRef.value)
        return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
    }
}
watchPostEffect((onCleanup) => {
    directory.value;
    const viewport = contactsViewportRef.value;
    if (!viewport)
        return;
    viewport.scrollLeft = 0;
    updateControls();
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => updateControls());
        observer.observe(viewport);
        onCleanup(() => observer.disconnect());
    }
});

defineExpose({ updateControls, move, onKeydown });
</script>

<template>
<div data-component="app-emergency-contacts"><section aria-labelledby="emergency-heading" :aria-roledescription="(directory ? (t('carrusel')) : undefined)">
  <div class="contacts-header flex items-start justify-between gap-2 px-1">
    <div class="min-w-0 flex-1">
      <h2 id="emergency-heading" class="font-display text-sm font-bold text-ink">
        {{ t('Tel\u00E9fonos \u00FAtiles') }}
        <template v-if="directory"><template v-for="book in [directory]">
          · {{ t(book.name) }}
        </template></template></h2>
      <p id="contacts-help" class="mt-1 text-xs text-muted">
        <template v-if="directory">
          {{ t('Desliz\u00E1 o us\u00E1 las flechas para ver los contactos.') }}
        </template><template v-else-if="selectedCountry">
          {{ t('Todav\u00EDa no tenemos tel\u00E9fonos nacionales verificados para este pa\u00EDs.') }}
        </template><template v-else>
          {{ t('Busc\u00E1 una ciudad para ver los tel\u00E9fonos de su pa\u00EDs.') }}
        </template></p>
    </div>
    <template v-if="directory">
      <div class="flex gap-2" role="group" :aria-label="t('Controles de tel\u00E9fonos \u00FAtiles')">
        <button type="button" class="carousel-control" aria-controls="emergency-viewport" :aria-label="t('Ver tel\u00E9fonos anteriores')" :disabled="!(canPrevious)" @click="move(-(1))">
          <WeatherIcon name="arrow" class="rotate-180" :size="18" />
        </button>
        <button type="button" class="carousel-control" aria-controls="emergency-viewport" :aria-label="t('Ver m\u00E1s tel\u00E9fonos')" :disabled="!(canNext)" @click="move(1)">
          <WeatherIcon name="arrow" :size="18" />
        </button>
      </div>
    </template></div>
  <template v-if="directory"><template v-for="book in [directory]">
    <div id="emergency-viewport" class="contacts-viewport mt-2" tabindex="0" role="region" aria-describedby="contacts-help" :aria-label="t('Tel\u00E9fonos \u00FAtiles de {country}, desplazables horizontalmente', { 'country': (t(book.name)) })" @scroll="updateControls()" @keydown="onKeydown($event)" ref="contactsViewport">
      <ul class="contacts-track">
        <template v-for="(contact, index) in book.contacts" :key="contact.number">
          <li class="contact-card textured-card" :class="{ 'priority-contact': (contact.number === book.contacts[0].number) }">
            <a class="contact-link" :href="('tel:' + contact.number)" :aria-label="t('Llamar al {number}, {name}. Cobertura: {coverage}', { 'number': contact.number, 'name': (t(contact.name)), 'coverage': (t(book.name)) })" @focus="($event.currentTarget as HTMLAnchorElement).scrollIntoView({ 'block': 'nearest', 'inline': 'nearest' })" ref="contactLink">
              <span class="flex items-center justify-between gap-3"><span class="font-display text-2xl font-bold tracking-tight text-ink">{{ contact.number }}</span><span class="flex items-center gap-1 text-xs font-semibold text-blue"><WeatherIcon name="phone" :size="16" />{{ t('Llamar') }}</span></span>
              <span class="mt-1 block text-sm font-semibold leading-5 text-ink">{{ t(contact.name) }}</span>
              <span class="mt-1 block text-xs leading-5 text-secondary">{{ t(contact.detail) }}</span>
              <span class="mt-auto block pt-2 text-[11px] leading-4 text-muted">{{ t(book.name) }}</span>
            </a>
          </li>
        </template></ul>
    </div>
    <p class="mt-1 px-1 text-[11px] leading-5 text-muted">
      {{ t('N\u00FAmeros para usar dentro del pa\u00EDs consultado. La disponibilidad de cada servicio depende de la zona.') }}
      <a target="_blank" rel="noopener noreferrer" class="inline-flex min-h-6 items-center rounded-app text-blue underline" :href="book.source">{{ t('Fuente oficial') }}<span class="sr-only"> {{ t('(se abre en otra pesta\u00F1a)') }}</span></a>.
    </p>
  </template></template></section>
</div>
</template>

<style scoped>
[data-component="app-emergency-contacts"] {
  display: block;
  min-width: 0;
}
@media (min-width: 1280px) {
  .contacts-header {
    /* Leave the fixed section dots and back-to-top button their own click area. */
    padding-inline-end: 5rem;
  }
}
.carousel-control {
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-control-line);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-blue);
}
.carousel-control:hover:not(:disabled) {
  background: var(--color-sky);
}
.contacts-viewport {
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding: 0.75rem;
  border-radius: var(--radius-app);
  padding: 1rem 0.75rem 1.25rem;
  scrollbar-width: none;
}
.contacts-viewport::-webkit-scrollbar {
  display: none;
}
.contacts-track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 15rem;
  gap: 1.5rem;
}
.contact-card {
  scroll-snap-align: start;
}
.contact-link {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 10rem;
  height: 100%;
  flex-direction: column;
  border-radius: inherit;
  padding: 0.8rem 1rem;
}
.contact-link:focus-visible {
  outline: 3px solid var(--color-contact-focus);
  outline-offset: 4px;
}
.contact-card:hover {
  border-color: var(--color-blue);
}
.priority-contact {
  border-color: #a2ddf5;
  background-color: var(--color-contact-priority);
}
@media (prefers-reduced-motion: no-preference) {
  .contact-card {
    transition:
      border-color 180ms ease,
      transform 180ms ease;
  }
  .contact-card:hover {
    transform: translateY(-2px);
  }
}

</style>
