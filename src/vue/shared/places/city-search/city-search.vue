<script setup lang="ts">
import { ref, computed, useTemplateRef, watchPostEffect } from 'vue';
import type { WeatherQuery, CitySearchFeedback, CountryChoice, PlaceSuggestion } from '../../../models/places/city-query';
import { parsePlaceInput } from './city-query';
import { useLanguage } from '../../../service/preferences/language';
import WeatherIcon from '../../weather/weather-icon/weather-icon.vue';
const props = defineProps<{ busy?: boolean; feedback?: CitySearchFeedback | null }>();
const emit = defineEmits<{ querySubmitted: [query: WeatherQuery]; queryEdited: []; retryRequested: [] }>();
const t = useLanguage().text;
const city = ref(''); const touched = ref(false); const field = useTemplateRef<HTMLInputElement>('cityField');
const composing = ref(false);
const cityInvalid = computed(() => { if (!touched.value) return false; try { parsePlaceInput(city.value); return false; } catch { return true; } });
function focusCity() { field.value?.focus(); }
function cancelAutoSearch() {}
function submit() { if (composing.value) return; touched.value = true; if (!cityInvalid.value) emit('querySubmitted', parsePlaceInput(city.value)); }
function onEdited() { emit('queryEdited'); }
function chooseLocation(choice: CountryChoice) { const value = choice.city ?? parsePlaceInput(city.value).city; city.value = [value,choice.region,choice.country].filter(Boolean).join(', '); emit('queryEdited'); emit('querySubmitted', { city: value, country: choice.country, ...(choice.region ? {region: choice.region} : {}) }); }
function chooseSuggestion(place: Omit<PlaceSuggestion, 'id'>) { city.value = [place.name,place.region,place.country].filter(Boolean).join(', '); emit('queryEdited'); emit('querySubmitted',{latitude:place.latitude,longitude:place.longitude}); }
watchPostEffect(() => { if (props.feedback && !props.feedback.retryable) focusCity(); });
defineExpose({ focusCity, cancelAutoSearch, chooseSuggestion });
</script>
<template>
<div data-component="app-city-search" class="block min-w-0">
<form @submit.prevent="submit" novalidate :aria-label="t('Buscar el clima de un lugar')" aria-describedby="search-help">
<label for="city" class="mb-1 block text-sm font-semibold text-ink">{{ t('Ciudad, región o provincia') }}</label>
<div class="relative w-full min-w-0"><WeatherIcon name="search" class="pointer-events-none absolute top-[1.375rem] left-4 -translate-y-1/2 text-muted" :size="20" />
<input id="city" ref="cityField" v-model="city" name="city" type="search" :placeholder="t('Empezá a escribir un lugar')" autocomplete="off" :aria-invalid="cityInvalid || undefined" :aria-describedby="cityInvalid ? 'search-help city-error' : feedback ? 'search-help search-feedback' : 'search-help'" @input="onEdited" @compositionstart="composing = true" @compositionend="composing = false" class="field h-11 w-full pr-4 pl-12" /></div>
<p id="search-help" class="mt-1 text-xs leading-5 text-muted">{{ t('También podés buscar lo escrito con Enter.') }}</p>
<p v-if="cityInvalid" id="city-error" role="alert" class="mt-3 text-sm font-medium text-danger">{{ t('Escribí un lugar válido. Cada nombre admite hasta 100 caracteres; no dejes una coma sin completar.') }}</p>
<div v-if="feedback" tabindex="-1" role="group" aria-labelledby="search-feedback" class="mt-4 rounded-app border border-blue/20 bg-sky p-4">
<p id="search-feedback" role="alert" class="text-sm leading-6 text-ink">{{ t(feedback.message) }}</p>
<button v-if="feedback.retryable" type="button" class="primary-button mt-3 min-h-11 px-5" @click="emit('retryRequested')">{{ t('Reintentar consulta') }}</button>
<button v-else type="button" class="example-button mt-3" @click="focusCity">{{ t('Corregir búsqueda') }}</button>
<ul v-if="feedback.choices?.length" :aria-label="t('Opciones para precisar el lugar')" class="mt-3 flex flex-wrap gap-2"><li v-for="choice in feedback.choices" :key="choice.id ?? choice.label"><button type="button" class="example-button text-sm" @click="chooseLocation(choice)">{{ choice.label }}</button></li></ul>
</div>
</form></div>
</template>
