import Isabel from '../shared/assistant/isabel/isabel';
import ClimateAwareness from '../shared/weather/climate-awareness/climate-awareness';
import BackToTop from '../shared/site/back-to-top/back-to-top';
import SectionNavigation from '../shared/site/section-navigation/section-navigation';
const sections = [
  { id: 'inicio-clima', label: 'Inicio' },
  { id: 'pronostico', label: 'Pronóstico' },
  { id: 'clima-contenido', label: 'Clima actual' },
  { id: 'contactos-utiles', label: 'Contactos útiles' },
];
import { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFavoritePlaces } from '../hooks/useFavoritePlaces';
import type { CitySearchHandle } from '../shared/places/city-search/CitySearch';
import './weather.css';
import WeatherMap from '../shared/weather/weather-map/weather-map';
import WeatherMapLegend from '../shared/weather/weather-map-legend/weather-map-legend';
import type { WeatherLayer } from '../shared/weather/weather-map/map-layers';
import WeatherAlerts from '../shared/alerts/weather-alerts/weather-alerts';
import EmergencyContacts from '../shared/alerts/emergency-contacts/emergency-contacts';
import { useLanguage } from '../hooks/useLanguage';
import { useWeather } from '../hooks/useWeather';
import WeatherSidebar from '../shared/weather/weather-sidebar/weather-sidebar';
import SiteFooter from '../shared/site/site-footer/site-footer';
import Forecast from '../shared/weather/forecast/forecast';
import CitySearch from '../shared/places/city-search/CitySearch';
import CurrentWeather from '../shared/weather/current-weather/current-weather';
import WeatherDetails from '../shared/weather/weather-details/weather-details';
import WeatherLoading from '../shared/weather/weather-loading/weather-loading';
export default function WeatherScreen() {
  const { text: t } = useLanguage();
  const climate = useWeather();
  const [mapLayer, setMapLayer] = useState<WeatherLayer>('temperature');
  const favorites = useFavoritePlaces();
  const citySearch = useRef<CitySearchHandle>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const place = location.state?.weatherPlace;
    if (
      place &&
      Number.isFinite(place.latitude) &&
      Number.isFinite(place.longitude) &&
      Math.abs(place.latitude) <= 90 &&
      Math.abs(place.longitude) <= 180
    ) {
      void climate.search({ latitude: place.latitude, longitude: place.longitude });
      void navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.key]);
  return (
    <div data-component="app-weather">
      <a href="#main-content" className="skip-link">
        {t('Saltar al contenido')}
      </a>
      <div className="weather-layout mx-auto min-h-screen max-w-400 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <WeatherSidebar onPlaceSelected={(place) => citySearch.current?.chooseSuggestion(place)}>
          <Isabel
            sidebar
            text={climate.weather?.advice?.text ?? null}
            segments={climate.weather?.advice?.segments}
            busy={climate.state === 'loading'}
          />
        </WeatherSidebar>
        <div className="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-8">
          <main id="main-content" tabIndex={-1} className="pb-10">
            <header
              data-reveal=""
              id="inicio-clima"
              tabIndex={-1}
              className="mb-7 grid grid-cols-1 items-start gap-5"
            >
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {t('Hola, explorador')}
                </h1>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  {t('Tu clima y tus planes para el día.')}
                </p>
              </div>
              <ClimateAwareness />
            </header>
            <section
              id="pronostico"
              tabIndex={-1}
              className="search-panel scroll-mt-6 rounded-app border border-line bg-surface px-4 py-3 sm:px-5"
              aria-label={t('Consulta de ciudad')}
            >
              <CitySearch
                ref={citySearch}
                locating={climate.locating}
                onLocationRequested={climate.locate}
                busy={climate.state === 'loading'}
                feedback={climate.feedback}
                onQueryEdited={climate.editQuery}
                onQuerySubmitted={climate.search}
                onRetryRequested={climate.retry}
              />
            </section>
            <div className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-2">
              <p
                role="status"
                aria-label={t('Estado de la consulta del clima')}
                aria-atomic="true"
                className="text-sm text-secondary"
              >
                {climate.state === 'loading' ? (
                  <>
                    {t('Consultando el clima de')} {climate.requestedCity}…
                  </>
                ) : climate.state === 'ready' ? (
                  <>
                    {t('Explorando')} <strong>{climate.weather?.city}</strong>
                    {!climate.weather?.forecast.length && (
                      <span className="sr-only">{t('Pronóstico no disponible.')}</span>
                    )}
                  </>
                ) : climate.cancelled ? (
                  t('Búsqueda cancelada. Podés consultar otra ciudad.')
                ) : climate.feedback ? (
                  <>
                    {t('No se pudo completar la consulta de')} {climate.requestedCity}
                    {t('. Revisá el aviso de búsqueda.')}
                  </>
                ) : (
                  t('Elegí una ciudad. Nosotros ponemos el contexto.')
                )}
              </p>
              {climate.state !== 'initial' && (
                <button
                  type="button"
                  className="min-h-11 rounded-control px-2 text-xs text-secondary underline"
                  onClick={() => {
                    climate.reset();
                    document.getElementById('city')?.focus();
                  }}
                >
                  {t(climate.state === 'loading' ? 'Cancelar búsqueda' : 'Volver al inicio')}
                </button>
              )}
            </div>
            <div
              id="clima-contenido"
              tabIndex={-1}
              className="mt-2"
              aria-busy={climate.state === 'loading'}
            >
              {climate.state === 'loading' ? (
                <WeatherLoading />
              ) : (
                <div className="grid items-stretch gap-6">
                  <CurrentWeather
                    weather={climate.weather}
                    showDetails={!climate.weather}
                    favorite={favorites.contains(climate.response?.ubicacion ?? null)}
                    onFavoriteToggled={() => {
                      if (climate.response) favorites.toggle(climate.response.ubicacion);
                    }}
                    unit={climate.temperatureUnit}
                    onSearchRequested={() => document.getElementById('city')?.focus()}
                  />
                  {climate.response && (
                    <div className="weather-context-grid">
                      <div className="weather-context-stack">
                        <WeatherAlerts location={climate.response.ubicacion} />
                        <WeatherDetails weather={climate.weather} />
                        <WeatherMapLegend layer={mapLayer} />
                      </div>
                      <WeatherMap
                        location={climate.response.ubicacion}
                        layer={mapLayer}
                        onLayerChange={setMapLayer}
                      />
                    </div>
                  )}
                  <Forecast
                    weather={climate.weather}
                    unit={climate.temperatureUnit}
                    onUnitChange={climate.setTemperatureUnit}
                  />
                </div>
              )}
            </div>
            {climate.state === 'ready' && (
              <a
                href="https://openweathermap.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-xs text-secondary underline"
              >
                <span className="rounded-app bg-white px-2 py-1">
                  <img
                    src="openweather-logo.png"
                    alt="OpenWeather"
                    width={90}
                    height={40}
                    className="h-auto w-20"
                  />
                </span>
                {t('Datos meteorológicos proporcionados por OpenWeather')}
              </a>
            )}
            <aside
              className="mt-6 px-1 text-xs leading-6 text-muted"
              aria-label={t('Información del servicio')}
            >
              {t(
                'La disponibilidad del pronóstico puede variar. Consultá las condiciones antes de organizar tus planes.',
              )}
            </aside>
            <EmergencyContacts
              id="contactos-utiles"
              tabIndex={-1}
              className="mt-8 block"
              selectedCountry={climate.response?.ubicacion.pais ?? null}
            />
          </main>
          <SiteFooter />
        </div>
      </div>
      <BackToTop />
      <SectionNavigation sections={sections} />
    </div>
  );
}
