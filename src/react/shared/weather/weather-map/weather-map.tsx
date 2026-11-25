import { WeatherMapEngine } from './WeatherMapEngine';
import './weather-map.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';

import { cx } from '../../../hooks/classNames';

import { useLanguage } from '../../../hooks/useLanguage';
import { MAP_LAYERS, WeatherLayer } from './map-layers';
import { ClimateLocation } from '../../../models/weather/climate-response';

type Props = { location: ClimateLocation } & {
  children?: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
  layer?: WeatherLayer;
  onLayerChange?: (value: WeatherLayer) => void;
};
export default function WeatherMap(props: Props) {
  const { location } = props;
  const layer = props.layer ?? 'temperature';
  const layers = MAP_LAYERS;
  const opened = true;
  const language = useLanguage();
  const t = language.text;
  const languageRef = useRef(language);
  languageRef.current = language;
  const container = useRef<HTMLDivElement>(null);
  const engine = useRef<WeatherMapEngine | null>(null);
  const [status, setStatus] = useState({ loading: true, failed: false });
  const { loading, failed } = status;
  function changeLayer(value: string) {
    if (['temperature', 'rain', 'wind'].includes(value))
      props.onLayerChange?.(value as WeatherLayer);
  }
  useEffect(() => {
    if (!container.current) return;
    let active = true;
    const controller = new WeatherMapEngine(
      container.current,
      location,
      layer,
      () => languageRef.current,
      (state) => {
        if (active) setStatus(state);
      },
    );
    engine.current = controller;
    void controller.open();
    return () => {
      active = false;
      controller.close();
      engine.current = null;
    };
  }, [location]);
  useEffect(() => {
    engine.current?.changeLayer(layer);
  }, [layer]);
  useEffect(() => {
    engine.current?.refreshPopup();
  }, [language.code]);

  return (
    <>
      <div
        id={props.id}
        tabIndex={props.tabIndex}
        data-component={'app-weather-map'}
        className={cx(props.className)}
      >
        <section
          aria-labelledby={'weather-map-heading'}
          className={cx('map-card rounded-app border border-line bg-surface p-4 sm:p-5')}
        >
          <div className={cx('flex flex-wrap items-center justify-between gap-2')}>
            <h2
              id={'weather-map-heading'}
              className={cx('font-display text-lg font-bold text-ink')}
            >
              {t('Mapa del clima')}
            </h2>
            {opened ? (
              <Fragment>
                <label className={cx('text-xs font-semibold text-secondary')}>
                  <span className={cx('sr-only')}>{t('Mostrar')}</span>
                  <select
                    value={layer}
                    className={cx(
                      'min-h-11 rounded-control border border-control-line bg-surface px-3 text-ink',
                    )}
                    onChange={(event) => {
                      changeLayer((event.target as HTMLSelectElement).value);
                    }}
                  >
                    <option value={'temperature'}>{t('Temperatura')}</option>
                    <option value={'rain'}>{t('Lluvia')}</option>
                    <option value={'wind'}>{t('Viento')}</option>
                  </select>
                </label>
              </Fragment>
            ) : null}
          </div>
          <div hidden={!opened} className={cx('map-content mt-3')}>
            <div
              role={'region'}
              aria-label={t('Mapa meteorol\u00F3gico interactivo')}
              ref={container}
              className={cx('map-canvas rounded-app')}
            ></div>
            {failed || loading ? (
              <Fragment>
                <p role={'status'} className={cx('mt-2 text-xs leading-5 text-secondary')}>
                  {failed ? (
                    <Fragment>
                      {t(
                        'No se pudo cargar todo el mapa. Esper\u00E1 un minuto y volv\u00E9 a consultar la ciudad.',
                      )}
                    </Fragment>
                  ) : loading ? (
                    <Fragment>{t('Cargando mapa\u2026')}</Fragment>
                  ) : null}
                </p>
              </Fragment>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
