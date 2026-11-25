<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { useLanguage } from '../../../service/preferences/language';

const cleanup = useCleanup();
const t = useLanguage().text;
const language = useLanguage();
const english = computed(() => language.code.value === 'en');
function text(es: string, en: string): string {
    return english.value ? en : es;
}
const credits = [
    {
        name: 'OpenWeather',
        mark: 'OW',
        url: 'https://openweathermap.org/',
        logo: 'openweather-logo.png',
        es: 'Datos meteorológicos proporcionados por OpenWeather. Condiciones actuales y pronósticos para tus consultas.',
        en: 'Weather data provided by OpenWeather. Current conditions and forecasts for your searches.',
        links: [{ name: 'Atribución / Attribution', url: 'https://openweathermap.org/faq' }],
    },
    {
        name: 'Piper',
        mark: 'P',
        url: 'https://github.com/OHF-Voice/piper1-gpl',
        logo: 'credits/piper.svg',
        es: 'El motor de voz de código abierto que permite hablar a Isa. Gracias a Open Home Foundation y a sus colaboradores.',
        en: 'The open-source speech engine that gives Isa a voice. Thank you to Open Home Foundation and its contributors.',
        links: [
            { name: 'GPL-3.0', url: 'https://github.com/OHF-Voice/piper1-gpl/blob/main/COPYING' },
        ],
    },
    {
        name: 'Sharvard & Cori',
        mark: 'Aa',
        url: 'https://huggingface.co/rhasspy/piper-voices',
        logo: 'credits/voices.svg',
        es: 'Las voces de Isa: Sharvard medium en español y Cori medium en inglés. Gracias a Vincent Aubanel, Maria Luisa Garcia Lecumberri, Martin Cooke y LISTA por Sharvard; a Cori Samuel, NVIDIA y el equipo HiFi-TTS por las grabaciones inglesas. Síntesis con ajustes de ritmo.',
        en: 'Isa’s voices: Sharvard medium in Spanish and Cori medium in English. Thanks to Vincent Aubanel, Maria Luisa Garcia Lecumberri, Martin Cooke and LISTA for Sharvard; to Cori Samuel, NVIDIA and the HiFi-TTS team for the English recordings. Synthesized with timing adjustments.',
        links: [
            { name: 'Sharvard · CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/' },
            { name: 'Cori · CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
            { name: 'Sharvard dataset', url: 'https://doi.org/10.7488/ds/75' },
            { name: 'HiFi-TTS dataset', url: 'https://www.openslr.org/109/' },
        ],
    },
    {
        name: 'Groq',
        mark: 'g',
        url: 'https://groq.com/',
        logo: 'credits/groq.svg',
        es: 'Los consejos generados con IA convierten las condiciones meteorológicas en sugerencias prácticas para tu día.',
        en: 'AI-generated advice turns weather conditions into practical suggestions for your day.',
        links: [{ name: 'GroqCloud', url: 'https://console.groq.com/docs/overview' }],
    },
    {
        name: 'Servicio Meteorológico Nacional',
        mark: 'SMN',
        url: 'https://www.smn.gob.ar/alertas',
        logo: 'credits/smn.png',
        es: 'La fuente de las alertas meteorológicas oficiales que se muestran para Argentina. Consultá siempre el aviso original.',
        en: 'The source of official weather alerts shown for Argentina. Always check the original bulletin.',
        links: [],
    },
];
const questions = computed(() => english.value ? [
    [
        'Is StitchWeather free?',
        'Yes. This is a personal learning and portfolio project. You do not need an account or a subscription to check the weather.',
    ],
    [
        'Where do the forecasts come from?',
        'Current conditions and forecasts come from OpenWeather. They are estimates that can change. Check the observation time and your local official weather service before making important decisions.',
    ],
    [
        'Who is Isa?',
        'Isa is the animated weather companion. Her advice is generated with AI and read with a synthetic voice. It may contain mistakes and is not an official weather warning.',
    ],
    [
        'Do I have to share my location?',
        'No. You can search for a city manually. If you choose the location option, the browser asks for permission and coordinates are sent to the backend to retrieve weather for that place.',
    ],
    [
        'Where are my saved places stored?',
        'Favorites, language and appearance preferences are saved in this browser. They do not sync between devices. You can remove places using their remove button or clear the site’s browser storage.',
    ],
    [
        'Why might the weather or Isa take a while to load?',
        'The app depends on external services and the backend may need time to start. Voice generation can also take a few seconds. If audio is unavailable, you can still read the advice.',
    ],
    [
        'Does the app replace official alerts?',
        'No. Depending on the searched location, we check official notices from SMN (Argentina), INMET (Brazil), DMC (Chile) or INUMET (Uruguay). Other countries are not covered yet. An empty or unavailable section does not guarantee there is no risk. Follow official instructions for your area.',
    ],
]
    : [
        [
            '¿StitchWeather es gratis?',
            'Sí. Es un proyecto personal de aprendizaje y portfolio. No necesitás una cuenta ni una suscripción para consultar el clima.',
        ],
        [
            '¿De dónde salen los pronósticos?',
            'Las condiciones actuales y el pronóstico provienen de OpenWeather. Son estimaciones que pueden cambiar. Revisá la hora de observación y el servicio meteorológico oficial de tu zona antes de tomar decisiones importantes.',
        ],
        [
            '¿Quién es Isa?',
            'Isa es la compañera animada del clima. Sus consejos se generan con IA y se leen con una voz sintética. Pueden contener errores y no son una alerta meteorológica oficial.',
        ],
        [
            '¿Tengo que compartir mi ubicación?',
            'No. Podés buscar una ciudad manualmente. Si elegís usar tu ubicación, el navegador te pide permiso y las coordenadas se envían al backend para consultar el clima de ese lugar.',
        ],
        [
            '¿Dónde se guardan mis lugares favoritos?',
            'Los favoritos, el idioma y la apariencia se guardan en este navegador. No se sincronizan entre dispositivos. Podés quitar lugares con su botón de eliminar o borrar los datos del sitio desde el navegador.',
        ],
        [
            '¿Por qué a veces tarda en cargar el clima o la voz?',
            'La app depende de servicios externos y el backend puede necesitar tiempo para iniciar. Generar la voz también puede llevar unos segundos. Si el audio no está disponible, podés leer el consejo.',
        ],
        [
            '¿La app reemplaza las alertas oficiales?',
            'No. Según la ubicación consultada, verificamos avisos oficiales del SMN (Argentina), INMET (Brasil), DMC (Chile) o INUMET (Uruguay). Los demás países todavía no tienen cobertura. Que no aparezca una alerta o falle la consulta no garantiza que no exista riesgo. Seguí las indicaciones oficiales de tu zona.',
        ],
    ]);

defineExpose({ text });
</script>

<template>
<div data-component="app-about"><section id="sobre-nosotros" tabindex="-1" aria-labelledby="about-heading" class="about-section">
  <div class="story-card" id="nuestra-historia" tabindex="-1">
    <div class="story-copy" v-reveal>
      <p class="section-label">{{ text('Nuestra historia', 'Our story') }}</p>
      <h2 id="about-heading">
        {{ text('De una idea para aprender', 'From an idea to learn') }}
        <span >{{ text('a una experiencia con voz propia', 'to an experience with its own voice') }}</span>
      </h2>
      <p >
        {{ text('Soy Nahuel Argandoña, desarrollador full stack de Córdoba, Argentina. StitchWeather nació para aprender, poner en práctica mis conocimientos y crear algo útil para mi portfolio.', 'I’m Nahuel Argandoña, a full-stack developer from Córdoba, Argentina. StitchWeather began as a way to learn, put my skills into practice and build something useful for my portfolio.') }}
      </p>
      <p >
        {{ text('Una consulta del clima se convirtió en pronósticos, lugares favoritos e Isa: una compañera que lee consejos prácticos en español e inglés. Cada detalle forma parte de ese aprendizaje.', 'A simple weather search grew into forecasts, saved places and Isa: a companion who reads practical weather advice in Spanish and English. Every detail is part of that learning process.') }}
      </p>
      <a class="portfolio-link" href="https://portfolio-nahuel48.vercel.app/" target="_blank" rel="noopener noreferrer">
        {{ text('Conocé mi portfolio', 'Visit my portfolio') }}<span class="sr-only">
          ({{ text('abre en una pestaña nueva', 'opens in a new tab') }})</span>
      </a>
    </div>
    <figure class="portrait" v-reveal>
      <img src="nahuel.jpg" width="972" height="1296" loading="lazy" :alt="text('Retrato de Nahuel Argandoña', 'Portrait of Nahuel Argandoña')" />
      <figcaption >
        <strong >Nahuel Argandoña</strong><span >{{ text('Creador de StitchWeather', 'Creator of StitchWeather') }}</span>
      </figcaption>
    </figure>
  </div>
  <section id="tecnologias" tabindex="-1" aria-labelledby="credits-heading" class="credits-section">
    <p class="section-label" v-reveal>{{ text('Tecnologías', 'Technology') }}</p>
    <h3 id="credits-heading" v-reveal>
      {{ text('Los proyectos detrás de StitchWeather', 'The projects behind StitchWeather') }}
    </h3>
    <p class="section-intro" v-reveal>
      {{ text('Gracias a los proyectos, las personas y los servicios que hacen posible esta experiencia.', 'Thank you to the projects, people and services that make this experience possible.') }}
    </p>
    <div class="credits-grid">
      <template v-for="(credit, index) in credits" :key="credit.name">
        <article class="credit-card textured-card" v-reveal>
          <template v-if="credit.logo">
            <div class="provider-logo">
              <img width="120" height="120" loading="lazy" :src="credit.logo" :alt="credit.name" />
            </div>
          </template><template v-else>
            <span class="credit-mark" aria-hidden="true">{{ credit.mark }}</span>
          </template><h4 >
            <a target="_blank" rel="noopener noreferrer" :href="credit.url">{{ credit.name }}<span class="sr-only">
                ({{ text('abre en una pestaña nueva', 'opens in a new tab') }})</span></a>
          </h4>
          <p >{{ text(credit.es, credit.en) }}</p>
          <ul class="credit-links">
            <template v-for="(link, index) in credit.links" :key="link.url">
              <li >
                <a target="_blank" rel="noopener noreferrer" :href="link.url">{{ link.name }}<span class="sr-only">
                    ({{ text('abre en una pestaña nueva', 'opens in a new tab') }})</span></a>
              </li>
            </template></ul>
        </article>
      </template></div>
  </section>
  <section id="preguntas-frecuentes" tabindex="-1" aria-labelledby="faq-heading" class="faq-section">
    <h3 id="faq-heading" v-reveal>
      {{ text('Preguntas frecuentes', 'Frequently asked questions') }}
    </h3>
    <p class="section-intro" v-reveal>
      {{ text('Algunas respuestas antes de explorar el clima.', 'A few answers before you explore the weather.') }}
    </p>
    <div class="faq-list">
      <template v-for="(question, index) in questions" :key="index">
        <details v-reveal>
          <summary >
            <span class="faq-number" aria-hidden="true">0{{ (index + 1) }}</span><span class="question-text">{{ question[0] }}</span><span class="faq-symbol" aria-hidden="true"></span>
          </summary>
          <p >{{ question[1] }}</p>
        </details>
      </template></div>
  </section>
</section>
</div>
</template>

<style scoped>
[data-component="app-about"] {
  display: block;
  min-width: 0;
}
.about-section {
  --gold: var(--color-blue);
  --cream: var(--color-ink);
  --muted: var(--color-secondary);
  color: var(--cream);
  padding: 0 clamp(1.5rem, 4vw, 4rem) clamp(1.5rem, 4vw, 4rem);
}
.story-card {
  display: grid;
  align-items: center;
  gap: 3rem;
  padding-bottom: 3.5rem;
}
.story-copy {
  align-self: start;
}
.story-copy .section-label {
  min-height: 1.75rem;
}
.section-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  margin: 0 0 2rem;
  color: var(--gold);
  font: 600 0.85rem var(--font-mono);
  letter-spacing: 0.3em;
  text-transform: uppercase;
}
h2,
h3,
h4 {
  font-family: var(--font-display);
  color: var(--cream);
}
.section-label::before,
.section-label::after {
  content: '';
  width: 3rem;
  height: 1px;
  background: var(--color-selected-line);
}
h2 {
  margin: 0 0 1.7rem;
  font-size: clamp(2rem, 3.6vw, 3.4rem);
  line-height: 1.12;
  letter-spacing: -0.025em;
}
h2 span {
  display: block;
  color: var(--color-brand-accent);
}
.story-copy > p:not(.section-label) {
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.8;
  margin: 0 0 1.4rem;
}
.portfolio-link {
  display: inline-flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-control-line);
  border-radius: var(--radius-control);
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  text-decoration: none;
}
.portrait {
  margin: 0;
  padding-bottom: 1.5rem;
}
.portrait > img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  object-position: center 28%;
  border-radius: var(--radius-app);
}
figcaption {
  position: relative;
  width: fit-content;
  margin: -2.5rem 0 0 -1rem;
  padding: 1rem 1.5rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-sidebar);
}
figcaption strong,
figcaption span {
  display: block;
}
figcaption strong {
  font: 700 1.35rem var(--font-display);
}
figcaption span {
  color: var(--muted);
  margin-top: 0.25rem;
  font-size: 0.8rem;
}
.credits-section {
  padding-block: 2.5rem 3rem;
  text-align: center;
}
h3 {
  max-width: 40rem;
  margin: 0 auto;
  font-size: clamp(2rem, 3.5vw, 3rem);
  line-height: 1.1;
  font-weight: 700;
}
.section-intro {
  max-width: 42rem;
  margin: 1.6rem auto 3.5rem;
  color: var(--muted);
  line-height: 1.7;
}
.credits-grid {
  display: grid;
  gap: 3rem 2rem;
}
.credit-card {
  padding: 1.5rem;
}
.credit-card > * {
  position: relative;
  z-index: 1;
}
.credit-card h4 {
  color: var(--color-ink);
}
.provider-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 8rem;
  height: 8rem;
  margin: 0 auto 1.4rem;
  border-radius: var(--radius-app);
  background: #fff;
  padding: 0.6rem;
}
.provider-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
h4 {
  margin: 0 0 0.7rem;
  font-size: 1.3rem;
  font-weight: 700;
}
h4 a {
  text-decoration: none;
}
.credit-card p {
  margin: 0;
  color: var(--color-secondary);
  font-size: 0.85rem;
  line-height: 1.75;
}
.credit-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
  list-style: none;
  padding: 0;
  margin: 0.9rem 0 0;
  color: var(--color-blue);
  font-size: 0.75rem;
}
.faq-section {
  margin: 3.5rem 0 1rem;
}
.faq-section h3,
.faq-section > .section-intro {
  max-width: none;
  margin-inline: 0;
  text-align: left;
}
.faq-section h3::after {
  display: block;
  content: '';
  width: 4rem;
  height: 1px;
  background: var(--color-selected-line);
  margin: 1.3rem 0 0;
}
.faq-section > .section-intro {
  font: 1.1rem/1.7 var(--font-display);
}
.faq-list {
  border-top: 1px solid var(--color-line);
}
details {
  border-bottom: 1px solid var(--color-line);
}
summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.65rem 0.5rem;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
.faq-number {
  color: var(--gold);
  font: 0.85rem var(--font-display);
}
.question-text {
  flex: 1;
  font: 700 1.1rem/1.5 var(--font-display);
}
.faq-symbol::before {
  content: '+';
  font-size: 1.6rem;
  color: var(--gold);
  font-weight: 300;
}
details[open] .faq-symbol::before {
  content: '\2212';
}
details > p {
  margin: 0;
  padding: 0 1.5rem 1.5rem 2.6rem;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.8;
}
a:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 5px;
}
@media (min-width: 640px) {
  .credits-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1100px) {
  .story-card {
    grid-template-columns: 1.15fr 1fr;
    gap: 3rem;
  }
  .credits-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

</style>
