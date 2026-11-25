<script setup lang="ts">
import About from '../../shared/site/about/about.vue';
import WeatherSidebar from '../../shared/weather/weather-sidebar/weather-sidebar.vue';
import SiteFooter from '../../shared/site/site-footer/site-footer.vue';
import BackToTop from '../../shared/site/back-to-top/back-to-top.vue';
</script>
<template>
  <a href="#main-content" class="skip-link">Saltar al contenido</a>
  <div class="mx-auto min-h-screen max-w-400 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
    <WeatherSidebar />
    <div class="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-8">
      <main id="main-content" tabindex="-1" class="pb-10"><h1 class="sr-only">Sobre nosotros</h1><About /></main>
      <SiteFooter />
    </div>
  </div>
  <BackToTop />
</template>
