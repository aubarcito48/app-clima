import Isabel from '../shared/assistant/isabel/isabel';
import BackToTop from '../shared/site/back-to-top/back-to-top';
import SectionNavigation from '../shared/site/section-navigation/section-navigation';
const sections = [
  { id: 'nuestra-historia', label: 'Nuestra historia' },
  { id: 'tecnologias', label: 'Tecnologías' },
  { id: 'preguntas-frecuentes', label: 'Preguntas frecuentes' },
];
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useEffect, useRef } from 'react';
import WeatherSidebar from '../shared/weather/weather-sidebar/weather-sidebar';
import SiteFooter from '../shared/site/site-footer/site-footer';
import About from '../shared/site/about/about';
export default function AboutPage() {
  const navigate = useNavigate();
  const { text: t } = useLanguage();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('Saltar al contenido')}
      </a>
      <div className="mx-auto min-h-screen max-w-400 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <WeatherSidebar
          onPlaceSelected={(place) => void navigate('/', { state: { weatherPlace: place } })}
        >
          <Isabel sidebar presenceOnly />
        </WeatherSidebar>
        <div className="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-8">
          <main ref={main} id="main-content" tabIndex={-1} className="pb-10">
            <h1 className="sr-only">{t('Sobre nosotros')}</h1>
            <About />
          </main>
          <SiteFooter />
        </div>
      </div>
      <BackToTop />
      <SectionNavigation sections={sections} />
    </>
  );
}
