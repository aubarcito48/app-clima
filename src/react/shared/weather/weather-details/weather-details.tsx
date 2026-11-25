import './weather-details.css';
import { type ReactNode } from 'react';

import { cx } from '../../../hooks/classNames';
import { WeatherPreview } from '../../../models/weather/weather-preview';
import WeatherIcon from '../weather-icon/weather-icon';
import { useLanguage } from '../../../hooks/useLanguage';
type Props = { weather?: WeatherPreview | null } & {
  children?: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
};
export default function WeatherDetails(props: Props) {
  const { weather = null } = props;
  const t = useLanguage().text;

  return (
    <>
      <div
        id={props.id}
        tabIndex={props.tabIndex}
        data-component={'app-weather-details'}
        className={cx(props.className)}
      >
        <section aria-label={t('Detalles del clima')} className={cx('metrics-panel textured-card')}>
          <h2 className={cx('relative z-10 mb-3 font-display text-sm font-bold text-ink')}>
            {t('Tu clima de un vistazo')}
          </h2>
          <div className={cx('relative z-10 grid grid-cols-2 gap-x-4 gap-y-4')}>
            <div className={cx('metric-card')}>
              <dl>
                <dt>
                  <WeatherIcon name={'drop'} size={22}></WeatherIcon>
                  <span>{t('Humedad')}</span>
                </dt>
                <dd>{weather?.humidity == null ? t('No disponible') : weather?.humidity + ' %'}</dd>
              </dl>
              <p>{t('Humedad relativa')}</p>
            </div>
            <div className={cx('metric-card')}>
              <dl>
                <dt>
                  <WeatherIcon name={'wind'} size={22}></WeatherIcon>
                  <span>{t('Viento')}</span>
                </dt>
                <dd>{weather?.wind == null ? t('No disponible') : weather?.wind + ' km/h'}</dd>
              </dl>
              <p>
                {t(weather?.windDirection?.label ?? 'Direcci\u00F3n no disponible')}
                {weather?.windDirection && weather?.wind !== 0
                  ? ' (' + t(weather?.windDirection?.abbreviation) + ')'
                  : ''}
              </p>
            </div>
            <div className={cx('metric-card')}>
              <dl>
                <dt>
                  <WeatherIcon name={'sunrise'} size={22}></WeatherIcon>
                  <span>{t('Amanecer')}</span>
                </dt>
                <dd>{weather?.sunrise ?? t('No disponible')}</dd>
              </dl>
              <p>{t('Hora local de la ciudad')}</p>
            </div>
            <div className={cx('metric-card')}>
              <dl>
                <dt>
                  <WeatherIcon name={'sunset'} size={22}></WeatherIcon>
                  <span>{t('Atardecer')}</span>
                </dt>
                <dd>{weather?.sunset ?? t('No disponible')}</dd>
              </dl>
              <p>{t('Hora local de la ciudad')}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
