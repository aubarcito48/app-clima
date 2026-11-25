import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type KeyboardEvent,
} from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { searchPlaces } from '../../../api/placeSuggestions';
import type {
  WeatherQuery,
  CitySearchFeedback,
  CountryChoice,
  PlaceSuggestion,
} from '../../../models/places/city-query';
import { parsePlaceInput } from './city-query';
import WeatherIcon from '../../weather/weather-icon/weather-icon';
export type CitySearchHandle = {
  focusCity: () => void;
  cancelAutoSearch: () => void;
  chooseSuggestion: (place: Omit<PlaceSuggestion, 'id'>) => void;
};
type Props = {
  ref?: Ref<CitySearchHandle>;
  busy?: boolean;
  locating?: boolean;
  feedback: CitySearchFeedback | null;
  onQuerySubmitted: (query: WeatherQuery) => void;
  onQueryEdited: () => void;
  onRetryRequested: () => void;
  onLocationRequested: () => void;
};
export default function CitySearch(props: Props) {
  const language = useLanguage(),
    t = language.text;
  const [city, setCity] = useState(''),
    [touched, setTouched] = useState(false),
    [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]),
    [open, setOpen] = useState(false),
    [activeIndex, setActiveIndex] = useState(-1),
    [message, setMessage] = useState('');
  const field = useRef<HTMLInputElement>(null),
    panel = useRef<HTMLDivElement>(null),
    selected = useRef<Omit<PlaceSuggestion, 'id'> | null>(null),
    composing = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    controller = useRef<AbortController | null>(null);
  let invalid = false;
  try {
    parsePlaceInput(city);
  } catch {
    invalid = touched;
  }
  const visible = open && suggestions.length > 0,
    issue = props.feedback;
  const focusCity = () => field.current?.focus();
  function cancelAutoSearch() {
    clearTimeout(timer.current);
    controller.current?.abort();
    controller.current = null;
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    setMessage('');
  }
  function chooseSuggestion(place: Omit<PlaceSuggestion, 'id'>) {
    cancelAutoSearch();
    selected.current = place;
    setCity([place.name, place.region, place.country].filter(Boolean).join(', '));
    props.onQueryEdited();
    focusCity();
    props.onQuerySubmitted({ latitude: place.latitude, longitude: place.longitude });
  }
  useImperativeHandle(props.ref, () => ({ focusCity, cancelAutoSearch, chooseSuggestion }));
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (issue?.retryable) panel.current?.focus();
    else if (issue) focusCity();
  }, [issue]);
  useEffect(() => {
    if (visible && activeIndex >= 0)
      document
        .getElementById('place-option-' + suggestions[activeIndex]?.id)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [visible, activeIndex, suggestions]);
  function edited(value: string) {
    setCity(value);
    selected.current = null;
    cancelAutoSearch();
    props.onQueryEdited();
    if (composing.current) return;
    const text = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
    if (text.length < 3 || text.length > 206) return;
    timer.current = setTimeout(async () => {
      const request = new AbortController();
      controller.current = request;
      setMessage('Buscando lugares…');
      try {
        const items = await searchPlaces(text, request.signal);
        if (request.signal.aborted) return;
        setSuggestions(items);
        setActiveIndex(-1);
        setOpen(items.length > 0 && document.activeElement === field.current);
        setMessage(
          items.length
            ? `${items.length} lugares encontrados. Usá las flechas y Enter o elegí uno de la lista.`
            : 'No hay sugerencias. Probá con más letras o buscá con Enter.',
        );
      } catch {
        if (!request.signal.aborted)
          setMessage('No pudimos cargar sugerencias. Podés buscar con Enter.');
      }
    }, 300);
  }
  function submit() {
    cancelAutoSearch();
    if (composing.current) return;
    setTouched(true);
    try {
      props.onQuerySubmitted(
        selected.current
          ? { latitude: selected.current.latitude, longitude: selected.current.longitude }
          : parsePlaceInput(city),
      );
    } catch {}
  }
  function chooseLocation(choice: CountryChoice) {
    selected.current = null;
    cancelAutoSearch();
    const name = choice.city ?? parsePlaceInput(city).city;
    setCity([name, choice.region, choice.country].filter(Boolean).join(', '));
    props.onQueryEdited();
    focusCity();
    props.onQuerySubmitted({
      city: name,
      country: choice.country,
      ...(choice.region ? { region: choice.region } : {}),
    });
  }
  function close() {
    clearTimeout(timer.current);
    controller.current?.abort();
    setOpen(false);
    setActiveIndex(-1);
    setMessage('');
  }
  function keydown(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.current || event.nativeEvent.isComposing) return;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        event.key === 'ArrowDown'
          ? (index + 1) % suggestions.length
          : index < 0
            ? suggestions.length - 1
            : (index - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === 'Enter' && visible && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') close();
  }
  function locate() {
    selected.current = null;
    cancelAutoSearch();
    setCity('');
    setTouched(false);
    props.onQueryEdited();
    props.onLocationRequested();
  }
  return (
    <div data-component="app-city-search" className="block min-w-0">
      <form
        noValidate
        aria-label={t('Buscar el clima de un lugar')}
        aria-describedby="search-help"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="city" className="mb-1 block text-sm font-semibold text-ink">
          {t('Ciudad, región o provincia')}
        </label>
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <div className="relative w-full min-w-0 flex-1">
            <WeatherIcon
              name="search"
              className="pointer-events-none absolute top-[1.375rem] left-4 -translate-y-1/2 text-muted"
              size={20}
            />
            <input
              id="city"
              ref={field}
              name="city"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={visible}
              aria-controls={visible ? 'place-options' : undefined}
              aria-activedescendant={
                visible && activeIndex >= 0
                  ? 'place-option-' + suggestions[activeIndex].id
                  : undefined
              }
              value={city}
              placeholder={t('Empezá a escribir un lugar')}
              autoComplete="off"
              aria-invalid={
                invalid || issue?.kind === 'not-found' || issue?.kind === 'invalid' || undefined
              }
              aria-describedby={
                invalid
                  ? 'search-help city-error'
                  : issue
                    ? 'search-help search-feedback'
                    : 'search-help'
              }
              onChange={(e) => edited(e.currentTarget.value)}
              onKeyDown={keydown}
              onFocus={() => {
                if (suggestions.length) setOpen(true);
              }}
              onBlur={close}
              onCompositionStart={() => {
                composing.current = true;
                cancelAutoSearch();
              }}
              onCompositionEnd={(e) => {
                composing.current = false;
                edited(e.currentTarget.value);
              }}
              className="field h-11 w-full pr-4 pl-12"
            />
            {visible && (
              <div className="mt-2 overflow-hidden rounded-app border border-control-line bg-surface shadow-sm suggestions-enter">
                <ul
                  id="place-options"
                  role="listbox"
                  aria-label={t('Lugares encontrados')}
                  className="max-h-72 overflow-y-auto py-1"
                >
                  {suggestions.map((place, index) => (
                    <li
                      key={place.id}
                      id={'place-option-' + place.id}
                      role="option"
                      aria-selected={activeIndex === index}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => chooseSuggestion(place)}
                      onPointerMove={() => setActiveIndex(index)}
                      className={
                        'min-h-14 cursor-pointer px-4 py-3 text-sm text-ink hover:bg-sky' +
                        (activeIndex === index ? ' bg-sky' : '')
                      }
                    >
                      <span className="block font-semibold">{place.name}</span>
                      <span className="block text-xs leading-6 text-secondary">
                        {place.region ? place.region + ', ' : ''}
                        {new Intl.DisplayNames([language.code], { type: 'region' }).of(
                          place.country,
                        ) ?? place.country}{' '}
                        ({place.country})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={locate}
            disabled={props.locating}
            className="primary-button flex min-h-11 w-full items-center justify-center gap-2 px-5 sm:w-auto"
          >
            <WeatherIcon name="pin" size={18} />
            {t(props.locating ? 'Buscando ubicación…' : 'Usar mi ubicación')}
          </button>
        </div>
        <p id="search-help" className="mt-1 text-xs leading-5 text-muted">
          {t(
            'Escribí al menos tres letras y elegí un lugar de la lista. También podés buscar lo escrito con Enter.',
          )}
        </p>
        <p
          id="place-status"
          aria-live="polite"
          aria-atomic="true"
          className="text-xs leading-5 text-secondary"
        >
          {t(message)}
        </p>
        {suggestions.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            {t('Lugares:')} {t('Catálogo local · datos de')}{' '}
            <a
              href="https://www.geonames.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              GeoNames
            </a>
            .
          </p>
        )}
        {invalid && (
          <p id="city-error" role="alert" className="mt-3 text-sm font-medium text-danger">
            {t(
              'Escribí un lugar válido. Cada nombre admite hasta 100 caracteres; no dejes una coma sin completar.',
            )}
          </p>
        )}
        {issue && (
          <div
            ref={panel}
            tabIndex={-1}
            role="group"
            aria-labelledby="search-feedback"
            className="mt-4 rounded-app border border-blue/20 bg-sky p-4"
          >
            <p id="search-feedback" role="alert" className="text-sm leading-6 text-ink">
              {t(issue.message)}
            </p>
            {issue.retryable ? (
              <button
                type="button"
                className="primary-button mt-3 min-h-11 px-5"
                onClick={() => {
                  cancelAutoSearch();
                  focusCity();
                  props.onRetryRequested();
                }}
              >
                {t('Reintentar consulta')}
              </button>
            ) : (
              <button type="button" className="example-button mt-3" onClick={focusCity}>
                {t(
                  issue.kind === 'location'
                    ? 'Buscar por nombre'
                    : issue.kind === 'ambiguous'
                      ? 'Precisar ubicación'
                      : 'Corregir búsqueda',
                )}
              </button>
            )}
            {issue.choices && (
              <ul
                aria-label={t('Opciones para precisar el lugar')}
                className="mt-3 flex flex-wrap gap-2"
              >
                {issue.choices.map((choice) => (
                  <li key={choice.id ?? choice.label}>
                    <button
                      type="button"
                      className="example-button text-sm"
                      onClick={() => chooseLocation(choice)}
                    >
                      {choice.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
