<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import WeatherIcon from '../weather-icon/weather-icon.vue';
import { useFavoritePlaces } from '../../../service/places/favorite-places';
import { SavedPlace } from '../../../models/places/saved-place';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const route = useRoute();
const t = useLanguage().text;
const emit = defineEmits<{(event: 'placeSelected', value?: any): void}>();
const document = globalThis.document;
const desktop = ref(true);
const mobileOpen = ref(false);
const mobileMenu = useTemplateRef<HTMLDialogElement>('mobileMenu');
const menuTrigger = useTemplateRef<HTMLButtonElement>('menuTrigger');
let previousOverflow: string | null = null;
const favorites = useFavoritePlaces();
const placesOpen = ref(false);
const placesButton = useTemplateRef<HTMLButtonElement>('placesButton');
function openMenu() {
    const dialog = mobileMenu.value;
    if (!dialog || dialog.open)
        return;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    mobileOpen.value = true;
    dialog.querySelector<HTMLButtonElement>('[data-close-menu]')?.focus();
}
function closeMenu(restoreFocus = true) {
    const dialog = mobileMenu.value;
    if (dialog?.open)
        dialog.close();
    mobileOpen.value = false;
    unlockScroll();
    if (restoreFocus)
        menuTrigger.value?.focus({ preventScroll: true });
}
function dialogClosed() {
    mobileOpen.value = false;
    unlockScroll();
}
function cancelMenu(event: Event) {
    event.preventDefault();
    closeMenu();
}
function backdropClick(event: MouseEvent) {
    const dialog = mobileMenu.value;
    if (!dialog || event.target !== dialog)
        return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
        closeMenu();
}
function unlockScroll() {
    if (previousOverflow !== null) {
        document.body.style.overflow = previousOverflow;
        previousOverflow = null;
    }
}
function togglePlaces() {
    placesOpen.value = ((value) => !value)(placesOpen.value);
}
function forecastSelected() {
    placesOpen.value = false;
    closeMenu(false);
    document.getElementById('city')?.focus({ preventScroll: true });
}
function aboutSelected() {
    placesOpen.value = false;
    closeMenu(false);
}
function selectPlace(place: SavedPlace) {
    placesOpen.value = false;
    closeMenu(false);
    emit('placeSelected', place);
}
function removePlace(id: string) {
    favorites.remove(id);
    placesButton.value?.focus();
}
const query = document.defaultView?.matchMedia?.('(min-width: 1024px)');
if (query)
    desktop.value = query.matches;
const resize = () => {
    closeMenu(false);
    desktop.value = query!.matches;
};
query?.addEventListener('change', resize);
cleanup(() => {
    query?.removeEventListener('change', resize);
    unlockScroll();
});

defineExpose({ openMenu, closeMenu, dialogClosed, cancelMenu, backdropClick, togglePlaces, forecastSelected, aboutSelected, selectPlace, removePlace });
</script>

<template>
<div data-component="app-weather-sidebar">



<template v-if="desktop">
  <div class="desktop-shell">
    <aside id="desktop-navigation" class="stitch-sidebar">
      
  <div class="relative flex items-center justify-between gap-2">
    
  <RouterLink to="/" class="relative flex items-center gap-3 rounded-app" :aria-label="t('StitchWeather, inicio')">
    <span class="stitch-logo" aria-hidden="true">S</span>
    <span class="brand-copy"><span class="block font-display text-lg font-bold tracking-tight text-ink">Stitch<span class="text-brand-accent">Weather</span></span><span class="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-secondary">{{ t('TU CLIMA, M\u00C1S AZUL') }}</span></span>
  </RouterLink>

    <template v-if="!(desktop)">
      <button data-close-menu="" type="button" class="menu-control shrink-0" :aria-label="t('Cerrar men\u00FA')" @click="closeMenu()">
        <WeatherIcon name="close" :size="22" />
      </button>
    </template></div>
  <div class="sidebar-preferences">
    
    
  </div>
  <nav class="relative mt-4 grid gap-2" :aria-label="t('Navegaci\u00F3n principal')">
    <RouterLink to="/sobre-nosotros" active-class="bg-surface" class="sidebar-link" @click="aboutSelected()" >
      <WeatherIcon name="sparkles" :size="20" />
      <span >{{ t('Sobre nosotros') }}</span>
    </RouterLink>
    <RouterLink to="/" fragment="pronostico" class="sidebar-link" :aria-current="((!(placesOpen) && !((route.path === '/sobre-nosotros'))) ? 'location' : undefined)" :class="{ 'bg-surface': (!(placesOpen) && !((route.path === '/sobre-nosotros'))) }" @click="forecastSelected()"><WeatherIcon name="cloud-sun" :size="20" /><span >{{ t('Pron\u00F3stico') }}</span></RouterLink>
    <button type="button" class="sidebar-link" aria-controls="favorite-places" :aria-expanded="placesOpen" :class="{ 'bg-surface': placesOpen }" @click="togglePlaces()" ref="placesButton">
      <WeatherIcon name="heart" :size="20" /><span >{{ t('Mis lugares') }}</span><span class="favorite-count ml-auto rounded-app bg-sun-soft px-2 py-0.5 text-xs font-bold text-badge-ink">{{ favorites.places.value.length }}</span>
    </button>
  </nav>
  <p class="sr-only" aria-live="polite" aria-atomic="true">
    {{ t(favorites.announcement.value) }}
  </p>
  <template v-if="favorites.storageWarning.value">
    <p class="relative mt-3 text-xs leading-5 text-secondary">
      {{ t(favorites.storageWarning.value) }}
    </p>
  </template><section id="favorite-places" aria-labelledby="favorite-heading" class="relative mt-4 min-w-0" :hidden="!(placesOpen)">
    <h2 id="favorite-heading" class="text-sm font-bold text-ink">
      {{ t('Tus lugares guardados') }}
    </h2>
    <template v-if="favorites.places.value.length">
      <ul class="mt-2 grid gap-2">
        <template v-for="(place, index) in favorites.places.value" :key="place.id">
          <li class="flex min-w-0 items-center gap-1 rounded-app bg-surface p-2">
            <button type="button" class="min-h-11 min-w-0 flex-1 rounded-control px-1 text-left" @click="selectPlace(place)">
              <span class="block break-words text-sm font-semibold text-ink">{{ place.name }}</span><span class="mt-1 block break-words text-xs text-secondary">{{ (place.region ? (place.region + ', ') : '') }}{{ place.country }}</span>
            </button>
            <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-blue hover:bg-sky" :aria-label="t('Eliminar {place} de Mis lugares', { 'place': ((place.name + ', ') + place.country) })" @click="removePlace(place.id)">
              <WeatherIcon name="close" :size="17" />
            </button>
          </li>
        </template></ul>
    </template><template v-else>
      <p class="mt-2 text-xs leading-6 text-secondary">
        {{ t('Todav\u00EDa no guardaste lugares. Consult\u00E1 una ciudad y toc\u00E1 el coraz\u00F3n para agregarla.') }}
      </p>
    </template><p class="mt-2 text-[11px] leading-5 text-muted">
      {{ t('Guardados en este navegador.') }}
    </p>
  </section>
  <template v-if="desktop">
    <div class="sidebar-note">
      
  <slot />

    </div>
  </template></aside>
  </div>
</template><template v-else>
  <header class="mobile-header">
    
  <RouterLink to="/" class="relative flex items-center gap-3 rounded-app" :aria-label="t('StitchWeather, inicio')">
    <span class="stitch-logo" aria-hidden="true">S</span>
    <span class="brand-copy"><span class="block font-display text-lg font-bold tracking-tight text-ink">Stitch<span class="text-brand-accent">Weather</span></span><span class="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-secondary">{{ t('TU CLIMA, M\u00C1S AZUL') }}</span></span>
  </RouterLink>

    <div class="header-assistant">
      
  <slot />

    </div>
    <button type="button" class="menu-control" aria-haspopup="dialog" aria-controls="mobile-navigation" :aria-label="t('Abrir men\u00FA')" :aria-expanded="mobileOpen" @click="openMenu()" ref="menuTrigger">
      <WeatherIcon name="menu" :size="23" />
    </button>
  </header>
  <dialog id="mobile-navigation" class="mobile-menu" :aria-label="t('Navegaci\u00F3n principal')" @cancel="cancelMenu($event)" @keydown.escape="cancelMenu($event)" @close="dialogClosed()" @click="backdropClick($event)" ref="mobileMenu">
    <aside class="stitch-sidebar">
  <div class="relative flex items-center justify-between gap-2">
    
  <RouterLink to="/" class="relative flex items-center gap-3 rounded-app" :aria-label="t('StitchWeather, inicio')">
    <span class="stitch-logo" aria-hidden="true">S</span>
    <span class="brand-copy"><span class="block font-display text-lg font-bold tracking-tight text-ink">Stitch<span class="text-brand-accent">Weather</span></span><span class="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-secondary">{{ t('TU CLIMA, M\u00C1S AZUL') }}</span></span>
  </RouterLink>

    <template v-if="!(desktop)">
      <button data-close-menu="" type="button" class="menu-control shrink-0" :aria-label="t('Cerrar men\u00FA')" @click="closeMenu()">
        <WeatherIcon name="close" :size="22" />
      </button>
    </template></div>
  <div class="sidebar-preferences">
    
    
  </div>
  <nav class="relative mt-4 grid gap-2" :aria-label="t('Navegaci\u00F3n principal')">
    <RouterLink to="/sobre-nosotros" active-class="bg-surface" class="sidebar-link" @click="aboutSelected()" >
      <WeatherIcon name="sparkles" :size="20" />
      <span >{{ t('Sobre nosotros') }}</span>
    </RouterLink>
    <RouterLink to="/" fragment="pronostico" class="sidebar-link" :aria-current="((!(placesOpen) && !((route.path === '/sobre-nosotros'))) ? 'location' : undefined)" :class="{ 'bg-surface': (!(placesOpen) && !((route.path === '/sobre-nosotros'))) }" @click="forecastSelected()"><WeatherIcon name="cloud-sun" :size="20" /><span >{{ t('Pron\u00F3stico') }}</span></RouterLink>
    <button type="button" class="sidebar-link" aria-controls="favorite-places" :aria-expanded="placesOpen" :class="{ 'bg-surface': placesOpen }" @click="togglePlaces()" ref="placesButton">
      <WeatherIcon name="heart" :size="20" /><span >{{ t('Mis lugares') }}</span><span class="favorite-count ml-auto rounded-app bg-sun-soft px-2 py-0.5 text-xs font-bold text-badge-ink">{{ favorites.places.value.length }}</span>
    </button>
  </nav>
  <p class="sr-only" aria-live="polite" aria-atomic="true">
    {{ t(favorites.announcement.value) }}
  </p>
  <template v-if="favorites.storageWarning.value">
    <p class="relative mt-3 text-xs leading-5 text-secondary">
      {{ t(favorites.storageWarning.value) }}
    </p>
  </template><section id="favorite-places" aria-labelledby="favorite-heading" class="relative mt-4 min-w-0" :hidden="!(placesOpen)">
    <h2 id="favorite-heading" class="text-sm font-bold text-ink">
      {{ t('Tus lugares guardados') }}
    </h2>
    <template v-if="favorites.places.value.length">
      <ul class="mt-2 grid gap-2">
        <template v-for="(place, index) in favorites.places.value" :key="place.id">
          <li class="flex min-w-0 items-center gap-1 rounded-app bg-surface p-2">
            <button type="button" class="min-h-11 min-w-0 flex-1 rounded-control px-1 text-left" @click="selectPlace(place)">
              <span class="block break-words text-sm font-semibold text-ink">{{ place.name }}</span><span class="mt-1 block break-words text-xs text-secondary">{{ (place.region ? (place.region + ', ') : '') }}{{ place.country }}</span>
            </button>
            <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-blue hover:bg-sky" :aria-label="t('Eliminar {place} de Mis lugares', { 'place': ((place.name + ', ') + place.country) })" @click="removePlace(place.id)">
              <WeatherIcon name="close" :size="17" />
            </button>
          </li>
        </template></ul>
    </template><template v-else>
      <p class="mt-2 text-xs leading-6 text-secondary">
        {{ t('Todav\u00EDa no guardaste lugares. Consult\u00E1 una ciudad y toc\u00E1 el coraz\u00F3n para agregarla.') }}
      </p>
    </template><p class="mt-2 text-[11px] leading-5 text-muted">
      {{ t('Guardados en este navegador.') }}
    </p>
  </section>
  <template v-if="desktop">
    <div class="sidebar-note">
      
  <slot />

    </div>
  </template></aside>
  </dialog>
</template></div>
</template>

<style scoped>
[data-component="app-weather-sidebar"] {
  position: sticky;
  top: 0;
  z-index: 30;
  display: block;
  align-self: start;
  min-width: 0;
}
.stitch-sidebar {
  position: relative;
  overflow: hidden;
  background: var(--color-sidebar);
  padding: 1.75rem 1.5rem;
}
.stitch-sidebar::before {
  content: '';
  position: absolute;
  width: 10rem;
  height: 10rem;
  border-radius: 50%;
  background: var(--color-sidebar-glow);
  left: -3.5rem;
  top: -3.5rem;
}
.stitch-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border-radius: var(--radius-app);
  background: #246b91;
  color: white;
  font: bold 1.3rem var(--font-display);
  box-shadow: 0 2px 4px #12395216;
}
.sidebar-note {
  position: relative;
  display: block;
  margin-top: 1.5rem;
}
.sidebar-preferences {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.75rem;
}
.sidebar-link {
  display: flex;
  width: 100%;
  min-height: 2.75rem;
  height: 2.75rem;
  align-items: center;
  gap: 0.75rem;
  border-radius: var(--radius-control);
  padding: 0.5rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-blue);
}
.sidebar-link:hover {
  background: var(--color-hover);
}
@media (min-width: 1024px) {
  [data-component="app-weather-sidebar"] {
    height: 100dvh;
  }

  .stitch-sidebar {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100dvh;
    min-height: 0;
    overflow-y: auto;
    padding: 2rem 1.75rem;
  }
  .sidebar-note {
    display: block;
    margin-top: auto;
    padding-top: 2rem;
    color: var(--color-secondary);
  }
}

.menu-control {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-control-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-blue);
}
.menu-control:hover {
  background: var(--color-sky);
}
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--color-sidebar);
  padding: 1rem 1.25rem;
  padding-top: max(1rem, env(safe-area-inset-top));
  border-bottom: 1px solid var(--color-line);
  box-shadow: 0 4px 14px #1239520a;
}
.mobile-header > .menu-control {
  color: #ffffff;
}
:global(html[data-theme='light']) .mobile-header > .menu-control {
  border-color: var(--color-primary);
  background: var(--color-primary);
}
:global(html[data-theme='light']) .mobile-header > .menu-control:hover {
  background: var(--color-primary-hover);
}
.header-assistant {
  min-width: 0;
  margin-left: auto;
}
@media (max-width: 640px) {
  .mobile-header {
    gap: 0.75rem;
    padding-block: 0.5rem;
    padding-top: max(0.5rem, env(safe-area-inset-top));
  }
  .mobile-header .brand-copy {
    display: none;
  }
  .mobile-header .stitch-logo {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--radius-app);
    font-size: 1.15rem;
  }
}
.mobile-menu {
  margin: 0;
  width: min(20rem, calc(100vw - 2.5rem));
  max-width: none;
  height: 100dvh;
  max-height: none;
  border: 0;
  padding: 0;
  background: var(--color-sidebar);
  overflow-x: hidden;
  overflow-y: auto;
}
.mobile-menu::backdrop {
  background: #12395266;
}
.mobile-menu .stitch-sidebar {
  min-height: 100%;
  padding: 1.5rem;
}
.desktop-shell {
  position: relative;
  height: 100dvh;
}
.desktop-shell .stitch-sidebar {
  height: 100%;
  position: relative;
}
@media (prefers-reduced-motion: no-preference) {
  .mobile-menu {
    transform: translateX(-100%);
    opacity: 0;
    transition:
      transform 240ms ease,
      opacity 240ms ease,
      display 240ms allow-discrete,
      overlay 240ms allow-discrete;
  }
  .mobile-menu[open] {
    transform: translateX(0);
    opacity: 1;
    animation: menu-enter 240ms ease;
  }
  .mobile-menu::backdrop {
    background: #12395200;
    transition:
      background-color 240ms ease,
      display 240ms allow-discrete,
      overlay 240ms allow-discrete;
  }
  .mobile-menu[open]::backdrop {
    background: #12395266;
    animation: menu-backdrop-enter 240ms ease;
  }
  @keyframes menu-enter {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes menu-backdrop-enter {
    from {
      background: #12395200;
    }
    to {
      background: #12395266;
    }
  }
}

</style>
