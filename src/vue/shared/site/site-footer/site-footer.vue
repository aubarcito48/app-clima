<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;


</script>

<template>
<div data-component="app-site-footer"><footer class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line py-6 text-xs leading-6 text-muted">
  <p >{{ t('Hecho para entender el cielo y disfrutar el día.') }}</p>
  <p >StitchWeather <span aria-hidden="true">·</span> {{ t('Tu clima, más azul') }}</p>
</footer>
</div>
</template>
