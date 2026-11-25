<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import WeatherIcon from '../weather-icon/weather-icon.vue';
const query = matchMedia('(min-width: 1024px)');
const desktop = ref(query.matches);
const menu = ref<HTMLDialogElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const opened = ref(false);
let overflow: string | null = null;
function close(restore = true) {
  menu.value?.close?.(); opened.value = false;
  if (overflow !== null) { document.body.style.overflow = overflow; overflow = null; }
  if (restore) trigger.value?.focus();
}
function open() {
  overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
  menu.value?.showModal(); opened.value = true;
}
function resized() { close(false); desktop.value = query.matches; }
query.addEventListener('change', resized);
onUnmounted(() => { query.removeEventListener('change', resized); close(false); });
</script>
<template>
  <div data-component="app-weather-sidebar">
    <header v-if="!desktop" class="mobile-header">
      <RouterLink to="/" aria-label="StitchWeather, inicio" class="relative flex items-center gap-3 rounded-app">
        <span class="stitch-logo" aria-hidden="true">S</span><span class="brand-copy font-display text-lg font-bold text-ink">StitchWeather</span>
      </RouterLink>
      <div class="header-assistant"><slot /></div>
      <button ref="trigger" class="menu-control" type="button" aria-label="Abrir menú" aria-haspopup="dialog" :aria-expanded="opened" aria-controls="mobile-navigation" @click="open"><WeatherIcon name="menu" :size="23" /></button>
    </header>
    <component :is="desktop ? 'div' : 'dialog'" :id="desktop ? undefined : 'mobile-navigation'" ref="menu" :class="desktop ? 'desktop-shell' : 'mobile-menu'" :aria-label="desktop ? undefined : 'Navegación principal'" @cancel.prevent="close()" @close="close(false)">
      <aside class="stitch-sidebar">
        <div class="relative flex items-center justify-between gap-2">
          <RouterLink to="/" aria-label="StitchWeather, inicio" class="relative flex items-center gap-3 rounded-app">
            <span class="stitch-logo" aria-hidden="true">S</span><span class="brand-copy"><span class="block font-display text-lg font-bold tracking-tight text-ink">Stitch<span class="text-brand-accent">Weather</span></span><span class="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-secondary">TU CLIMA, MÁS AZUL</span></span>
          </RouterLink>
          <button v-if="!desktop" type="button" aria-label="Cerrar menú" class="menu-control" @click="close()"><WeatherIcon name="close" :size="22" /></button>
        </div>
        <nav aria-label="Navegación principal" class="relative mt-4 grid gap-2">
          <RouterLink to="/sobre-nosotros" class="sidebar-link" active-class="bg-surface" @click="close(false)"><WeatherIcon name="sparkles" :size="20" />Sobre nosotros</RouterLink>
          <RouterLink to="/" class="sidebar-link" exact-active-class="bg-surface" @click="close(false)"><WeatherIcon name="cloud-sun" :size="20" />Pronóstico</RouterLink>
        </nav>
        <div v-if="desktop" class="sidebar-note"><slot /></div>
      </aside>
    </component>
  </div>
</template>
<style scoped src="./weather-sidebar.css"></style>
