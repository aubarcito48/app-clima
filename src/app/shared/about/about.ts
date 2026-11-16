import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Language } from '../../service/language';
import { ScrollReveal } from '../scroll-reveal';

@Component({
  selector: 'app-about',
  imports: [ScrollReveal],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  private readonly language = inject(Language);
  readonly english = computed(() => this.language.code() === 'en');
  text(es: string, en: string): string {
    return this.english() ? en : es;
  }
  readonly credits = [
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
  readonly questions = computed(() =>
    this.english()
      ? [
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
            'No. The alerts section currently shows information for Argentina from the SMN when available. An empty or unavailable section does not guarantee there is no risk. Follow official instructions for your area.',
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
            'No. La sección de alertas muestra actualmente información para Argentina del SMN cuando está disponible. Que no aparezca una alerta o falle la consulta no garantiza que no exista riesgo. Seguí las indicaciones oficiales de tu zona.',
          ],
        ],
  );
}
