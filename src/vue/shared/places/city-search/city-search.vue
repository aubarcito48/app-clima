<script setup lang="ts">
import { ref, computed, useTemplateRef, watchPostEffect, onUnmounted } from 'vue';
import type { WeatherQuery, CitySearchFeedback, CountryChoice, PlaceSuggestion } from '../../../models/places/city-query';
import { parsePlaceInput } from './city-query';
import { useLanguage } from '../../../service/preferences/language';
import { searchPlaces } from '../../../api/placeSuggestions';
import WeatherIcon from '../../weather/weather-icon/weather-icon.vue';
const props = withDefaults(defineProps<{busy?:boolean; locating?:boolean; feedback?:CitySearchFeedback|null}>(), {busy:false,locating:false,feedback:null});
const emit = defineEmits<{querySubmitted:[query:WeatherQuery];queryEdited:[];retryRequested:[];locationRequested:[]}>();
const language = useLanguage(); const t = language.text;
const busy = computed(()=>props.busy); const locating = computed(()=>props.locating); const feedback = computed(()=>props.feedback);
const city = ref(''); const touched = ref(false); const suggestions = ref<readonly PlaceSuggestion[]>([]);
const suggestionsLoading = ref(false); const suggestionMessage = ref(''); const open = ref(false); const activeIndex = ref(-1);
const cityField = useTemplateRef<HTMLInputElement>('cityField'); const feedbackPanel = useTemplateRef<HTMLElement>('feedbackPanel');
let composing = false; let selectedPlace: Omit<PlaceSuggestion,'id'>|null = null;
let timer: ReturnType<typeof setTimeout>|undefined; let controller: AbortController|null = null;
const cityInvalid = computed(()=>{if(!touched.value)return false;try{parsePlaceInput(city.value);return false}catch{return true}});
const popupVisible = computed(()=>open.value && suggestions.value.length>0);
function focusCity(){cityField.value?.focus()}
function countryLabel(code:string){return new Intl.DisplayNames([language.code.value],{type:'region'}).of(code)??code}
function cancelAutoSearch(){ clearTimeout(timer); controller?.abort();controller=null;open.value=false;suggestions.value=[];activeIndex.value=-1;suggestionsLoading.value=false;suggestionMessage.value='' }
function submit(){cancelAutoSearch();if(composing)return;touched.value=true;if(cityInvalid.value)return;emit('querySubmitted',selectedPlace?{latitude:selectedPlace.latitude,longitude:selectedPlace.longitude}:parsePlaceInput(city.value))}
function chooseSuggestion(place:Omit<PlaceSuggestion,'id'>){cancelAutoSearch();city.value=[place.name,place.region,place.country].filter(Boolean).join(', ');selectedPlace=place;emit('queryEdited');focusCity();emit('querySubmitted',{latitude:place.latitude,longitude:place.longitude})}
function chooseLocation(choice:CountryChoice){selectedPlace=null;cancelAutoSearch();const name=choice.city??parsePlaceInput(city.value).city;city.value=[name,choice.region,choice.country].filter(Boolean).join(', ');emit('queryEdited');focusCity();emit('querySubmitted',{city:name,country:choice.country,...(choice.region?{region:choice.region}:{})})}
function onEdited(){selectedPlace=null;cancelAutoSearch();emit('queryEdited');if(composing)return;const text=city.value.normalize('NFC').trim().replace(/\s+/gu,' ');if(text.length<3||text.length>206)return;timer=setTimeout(async()=>{const current=new AbortController();controller=current;suggestionsLoading.value=true;suggestionMessage.value='Buscando lugares…';try{const items=await searchPlaces(text,current.signal);if(current.signal.aborted)return;suggestions.value=items;activeIndex.value=-1;open.value=items.length>0&&document.activeElement===cityField.value;suggestionMessage.value=items.length?items.length+' lugares encontrados. Usá las flechas y Enter o elegí uno de la lista.':'No hay sugerencias. Probá con más letras o buscá con Enter.'}catch{if(!current.signal.aborted)suggestionMessage.value='No pudimos cargar sugerencias. Podés buscar con Enter.'}finally{if(!current.signal.aborted)suggestionsLoading.value=false}},300)}
function compositionStart(){composing=true;onEdited()}
function compositionEnd(){composing=false;onEdited()}
function closeSuggestions(){clearTimeout(timer);controller?.abort();open.value=false;activeIndex.value=-1;suggestionsLoading.value=false;suggestionMessage.value=''}
function reopenSuggestions(){if(suggestions.value.length)open.value=true}
function onKeydown(event:KeyboardEvent){if(composing||event.isComposing)return;if((event.key==='ArrowDown'||event.key==='ArrowUp')&&suggestions.value.length){event.preventDefault();open.value=true;const count=suggestions.value.length;activeIndex.value=event.key==='ArrowDown'?(activeIndex.value+1)%count:activeIndex.value<0?count-1:(activeIndex.value-1+count)%count}else if(event.key==='Enter'&&popupVisible.value&&activeIndex.value>=0){event.preventDefault();chooseSuggestion(suggestions.value[activeIndex.value])}else if(event.key==='Escape'){event.preventDefault();closeSuggestions()}else if(event.key==='Tab')closeSuggestions()}
function focusCorrection(){focusCity()}
function requestRetry(){cancelAutoSearch();focusCity();emit('retryRequested')}
function useLocation(){selectedPlace=null;cancelAutoSearch();city.value='';touched.value=false;emit('queryEdited');emit('locationRequested')}
watchPostEffect(()=>{if(feedback.value?.retryable)feedbackPanel.value?.focus();else if(feedback.value)focusCity()});
watchPostEffect(()=>{if(open.value&&activeIndex.value>=0)document.getElementById('place-option-'+suggestions.value[activeIndex.value]?.id)?.scrollIntoView?.({block:'nearest'})});
onUnmounted(cancelAutoSearch);
defineExpose({focusCity,cancelAutoSearch,chooseSuggestion});
</script>
<template>
<div data-component="app-city-search" class="block min-w-0"><form :novalidate="true" aria-describedby="search-help" :aria-label="t('Buscar el clima de un lugar')" @submit.prevent="submit()">
  <label for="city" class="mb-1 block text-sm font-semibold text-ink">{{ t('Ciudad, regi\u00F3n o provincia') }}</label>
  <div class="flex flex-col items-start gap-3 sm:flex-row">
    <div class="relative w-full min-w-0 flex-1">
      <WeatherIcon name="search" class="pointer-events-none absolute top-[1.375rem] left-4 -translate-y-1/2 text-muted" :size="20" />
      <input id="city" name="city" type="search" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" autocomplete="off" class="field h-11 w-full pr-4 pl-12" :aria-expanded="popupVisible" :aria-controls="(popupVisible ? 'place-options' : undefined)" :aria-activedescendant="((popupVisible && (activeIndex >= 0)) ? ('place-option-' + suggestions[activeIndex].id) : undefined)" :placeholder="t('Empez\u00E1 a escribir un lugar')" :aria-invalid="(((cityInvalid || (feedback?.kind === 'not-found')) || (feedback?.kind === 'invalid')) ? 'true' : undefined)" :aria-describedby="(cityInvalid ? 'search-help city-error' : (feedback ? 'search-help search-feedback' : 'search-help'))" @input="onEdited()" @keydown="onKeydown($event)" @focus="reopenSuggestions()" @blur="closeSuggestions()" @compositionstart="compositionStart()" @compositionend="compositionEnd()" ref="cityField" v-model="city" />
      <template v-if="popupVisible">
        <div class="mt-2 overflow-hidden rounded-app border border-control-line bg-surface shadow-sm">
          <ul id="place-options" role="listbox" class="max-h-72 overflow-y-auto py-1" :aria-label="t('Lugares encontrados')">
            <template v-for="(place, index) in suggestions" :key="place.id">
              <li role="option" class="min-h-14 cursor-pointer px-4 py-3 text-sm text-ink hover:bg-sky" :id="('place-option-' + place.id)" :aria-selected="(activeIndex === index)" :class="{ 'bg-sky': (activeIndex === index) }" @pointerdown="$event.preventDefault()" @click="chooseSuggestion(place)" @keydown.enter="$event.preventDefault();
chooseSuggestion(place)" @keydown.space="$event.preventDefault();
chooseSuggestion(place)" @pointermove="activeIndex = index">
                <span class="block font-semibold">{{ place.name }}</span>
                <span class="block text-xs leading-6 text-secondary">{{ (place.region ? (place.region + ', ') : '') }}{{ countryLabel(place.country) }} ({{ place.country }})</span>
              </li>
            </template></ul>
        </div>
      </template></div>
    <button type="button" class="primary-button flex min-h-11 w-full items-center justify-center gap-2 px-5 sm:w-auto" :disabled="locating" @click="useLocation()">
      <WeatherIcon name="pin" :size="18" />
      {{ (locating ? (t('Buscando ubicaci\u00F3n\u2026')) : (t('Usar mi ubicaci\u00F3n'))) }}
    </button>
  </div>
  <p id="search-help" class="mt-1 text-xs leading-5 text-muted">
    {{ t('Escrib\u00ED al menos tres letras y eleg\u00ED un lugar de la lista. Tambi\u00E9n pod\u00E9s buscar lo escrito con Enter.') }}
  </p>
  <p id="place-status" aria-live="polite" aria-atomic="true" class="text-xs leading-5 text-secondary" :class="{ 'mt-1': !(!(suggestionMessage)) }">
    {{ t(suggestionMessage) }}
  </p>
  <template v-if="suggestions.length">
    <p class="mt-2 text-xs text-muted">
      {{ t('Lugares:') }}
      {{ t('Cat\u00E1logo local \u00B7 datos de') }}
      <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" class="underline">GeoNames</a>.
    </p>
  </template><template v-if="cityInvalid">
    <p id="city-error" role="alert" class="mt-3 text-sm font-medium text-danger">
      {{ t('Escrib\u00ED un lugar v\u00E1lido. Cada nombre admite hasta 100 caracteres; no dejes una coma sin completar.') }}
    </p>
  </template><template v-if="feedback"><template v-for="issue in [feedback]">
    <div tabindex="-1" role="group" aria-labelledby="search-feedback" class="mt-4 rounded-app border border-blue/20 bg-sky p-4" ref="feedbackPanel">
      <p id="search-feedback" role="alert" class="text-sm leading-6 text-ink">
        {{ t(issue.message) }}
      </p>
      <template v-if="issue.retryable">
        <button type="button" class="primary-button mt-3 min-h-11 px-5" @click="requestRetry()">
          {{ t('Reintentar consulta') }}
        </button>
      </template><template v-else>
        <button type="button" class="example-button mt-3" @click="focusCity()">
          {{ ((issue.kind === 'location') ? (t('Buscar por nombre')) : ((issue.kind === 'ambiguous') ? (t('Precisar ubicaci\u00F3n')) : (t('Corregir b\u00FAsqueda')))) }}
        </button>
      </template><template v-if="issue.choices?.length">
        <ul class="mt-3 flex flex-wrap gap-2" :aria-label="t('Opciones para precisar el lugar')">
          <template v-for="(choice, index) in issue.choices" :key="(choice.id ?? choice.label)">
            <li >
              <button type="button" class="example-button text-sm" @click="chooseLocation(choice)">
                {{ choice.label }}
              </button>
            </li>
          </template></ul>
      </template></div>
  </template></template></form>
</div>
</template>
