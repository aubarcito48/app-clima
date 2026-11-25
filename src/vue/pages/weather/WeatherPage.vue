<script setup lang="ts">
import WeatherSidebar from '../../shared/weather/weather-sidebar/weather-sidebar.vue';
import SiteFooter from '../../shared/site/site-footer/site-footer.vue';
import BackToTop from '../../shared/site/back-to-top/back-to-top.vue';
</script>
<template>
  <a href="#main-content" class="skip-link">Saltar al contenido</a>
  <div class="weather-layout mx-auto min-h-screen max-w-400 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
    <WeatherSidebar />
    <div class="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-8">
      <main id="main-content" tabindex="-1" class="pb-10">
        <h1 class="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Hola, explorador</h1>
        <p class="mt-2 text-sm leading-6 text-secondary">Tu clima y tus planes para el día.</p>
      </main>
      <SiteFooter />
    </div>
  </div>
  <BackToTop />
</template>
