<script setup lang="ts">
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { useLanguage } from '../../service/preferences/language';
import type { SavedPlace } from '../../models/places/saved-place';
const router = useRouter();
const t = useLanguage().text;
const sections = [
  { id: 'nuestra-historia', label: 'Nuestra historia' },
  { id: 'tecnologias', label: 'Tecnologías' },
  { id: 'preguntas-frecuentes', label: 'Preguntas frecuentes' },
];
onMounted(() => document.getElementById('main-content')?.focus({ preventScroll: true }));
function selectPlace(place: SavedPlace) {
  void router.push({ path: '/', state: { weatherPlace: { ...place } } });
}
import Isabel from '../../shared/assistant/isabel/isabel.vue';
import About from '../../shared/site/about/about.vue';
import WeatherSidebar from '../../shared/weather/weather-sidebar/weather-sidebar.vue';
import SiteFooter from '../../shared/site/site-footer/site-footer.vue';
import BackToTop from '../../shared/site/back-to-top/back-to-top.vue';
import SectionNavigation from '../../shared/site/section-navigation/section-navigation.vue';
</script>
<template>
  <a href="#main-content" class="skip-link">{{ t('Saltar al contenido') }}</a>
  <div class="mx-auto min-h-screen max-w-400 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
    <WeatherSidebar @placeSelected="selectPlace"
      ><Isabel :sidebar="true" :presenceOnly="true"
    /></WeatherSidebar>
    <div class="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-8">
      <main id="main-content" tabindex="-1" class="pb-10">
        <h1 class="sr-only">{{ t('Sobre nosotros') }}</h1>
        <About />
      </main>
      <SiteFooter />
    </div>
  </div>
  <BackToTop />
  <SectionNavigation :sections="sections" />
</template>
