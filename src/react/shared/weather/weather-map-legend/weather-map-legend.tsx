import './weather-map-legend.css';
import { Fragment, type ReactNode } from 'react';

import { cx } from '../../../hooks/classNames';
import { MAP_LAYERS, WeatherLayer } from '../weather-map/map-layers';
import { useLanguage } from '../../../hooks/useLanguage';
type Props = { layer: WeatherLayer } & {
  children?: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
};
export default function WeatherMapLegend(props: Props) {
  const { layer } = props;
  const t = useLanguage().text;
  const layers = MAP_LAYERS;

  return (
    <>
      <div
        id={props.id}
        tabIndex={props.tabIndex}
        data-component={'app-weather-map-legend'}
        className={cx(props.className)}
      >
        <section
          aria-labelledby={'map-guide-heading'}
          className={cx('rounded-app border border-line bg-surface p-4 sm:p-5')}
        >
          <h2 id={'map-guide-heading'} className={cx('font-display text-lg font-bold text-ink')}>
            {t('C\u00F3mo leer el mapa')}
          </h2>
          {((legend) => (
            <Fragment>
              <div className={cx('map-legend mt-3')}>
                <div className={cx('legend-heading')}>
                  <strong>
                    {t(legend.label)}
                    {' · '}
                    {legend.unit}
                  </strong>
                  <span>{'OpenWeather'}</span>
                </div>
                <div
                  aria-hidden={'true'}
                  className={cx('legend-gradient')}
                  style={{ background: legend.gradient }}
                ></div>
                <div className={cx('legend-ticks')}>
                  {legend.ticks.map((tick, index) => (
                    <Fragment key={tick.value}>
                      <Fragment>
                        <span style={{ left: tick.position + '%' }}>{tick.value}</span>
                      </Fragment>
                    </Fragment>
                  ))}
                </div>
                <p>
                  {t(
                    'Escala orientativa. Los colores representan condiciones regionales, incluso al acercar a un barrio.',
                  )}
                </p>
              </div>
              <p className={cx('mt-3 text-xs leading-6 text-secondary')}>
                {t(
                  'Arrastr\u00E1 para explorar y toc\u00E1 un punto para consultar su clima. Us\u00E1 + o \u2212 para acercar o alejar.',
                )}
              </p>
              <p className={cx('mt-2 text-xs leading-6 text-muted')}>
                {t(
                  'Vista regional orientativa; no reemplaza los avisos meteorol\u00F3gicos oficiales.',
                )}
              </p>
            </Fragment>
          ))(layers[layer]!)}
        </section>
      </div>
    </>
  );
}
