import './weather-alerts.css';
import { Fragment, useState, useEffect, type ReactNode } from 'react';

import { cx } from '../../../hooks/classNames';
import { ClimateResponse } from '../../../models/weather/climate-response';
import {
  ALERT_SOURCES,
  AlertSeverity,
  WeatherAlertsResponse,
} from '../../../models/alerts/weather-alerts';
import { getJson } from '../../../api/http';
import { readWeatherAlerts } from '../../../models/alerts/weather-alerts';
import WeatherIcon from '../../weather/weather-icon/weather-icon';
import { useLanguage } from '../../../hooks/useLanguage';
type AlertsState = {
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  data: WeatherAlertsResponse | null;
};
type Props = { location?: ClimateResponse['ubicacion'] | null } & {
  children?: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
};
export default function WeatherAlerts(props: Props) {
  const { location = null } = props;
  const language = useLanguage(),
    t = language.text;
  const source =
    location && Object.hasOwn(ALERT_SOURCES, location.pais) ? ALERT_SOURCES[location.pais] : null;
  const [result, setResult] = useState<AlertsState>({ status: 'idle', data: null });
  const [refresh, setRefresh] = useState(0);
  function retry() {
    setRefresh((value) => value + 1);
  }
  function severity(value: AlertSeverity) {
    return {
      Extreme: 'Extrema',
      Severe: 'Alta',
      Moderate: 'Moderada',
      Minor: 'Baja',
      Unknown: 'No especificada',
    }[value];
  }
  function localTime(value: string) {
    return new Intl.DateTimeFormat(language.locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hourCycle: 'h23',
    }).format(
      new Date(Date.parse(value) + (location?.desplazamiento_horario_segundos ?? 0) * 1000),
    );
  }
  useEffect(() => {
    if (!location) {
      setResult({ status: 'idle', data: null });
      return;
    }
    const place = location;
    let active: AbortController | null = null;
    const load = async () => {
      active?.abort();
      const request = new AbortController();
      active = request;
      setResult({ status: 'loading', data: null });
      try {
        const raw = await getJson(
          '/api/v1/alertas/',
          new URLSearchParams({
            latitud: String(place.latitud),
            longitud: String(place.longitud),
            pais: place.pais,
          }),
          request.signal,
          35000,
        );
        if (!request.signal.aborted)
          setResult({ status: 'ready', data: readWeatherAlerts(raw, place) });
      } catch {
        if (!request.signal.aborted) setResult({ status: 'unavailable', data: null });
      }
    };
    void load();
    const interval = setInterval(load, 180000);
    return () => {
      active?.abort();
      clearInterval(interval);
    };
  }, [location, refresh]);

  return (
    <>
      <div
        id={props.id}
        tabIndex={props.tabIndex}
        data-component={'app-weather-alerts'}
        className={cx(props.className)}
      >
        {location ? (
          <Fragment>
            {((place) => (
              <Fragment>
                <section
                  id={'alertas'}
                  aria-labelledby={'alerts-heading'}
                  aria-busy={result.status === 'loading'}
                  className={cx('rounded-app border border-line bg-surface p-4 sm:p-5')}
                >
                  <div className={cx('flex flex-wrap items-start justify-between gap-2')}>
                    <div>
                      <h2
                        id={'alerts-heading'}
                        className={cx(
                          'flex items-center gap-2 font-display text-lg font-bold text-ink',
                        )}
                      >
                        <WeatherIcon name={'alert'} size={22}></WeatherIcon>
                        {t('Alertas meteorol\u00F3gicas')}
                      </h2>
                      <p className={cx('mt-1 text-xs leading-6 text-secondary')}>
                        {t('Avisos oficiales para')} {place.nombre}
                        {t('. Hora local de la ciudad.')}
                      </p>
                    </div>
                    {source ? (
                      <Fragment>
                        {((provider) => (
                          <Fragment>
                            <a
                              target={'_blank'}
                              rel={'noopener noreferrer'}
                              href={provider.url}
                              className={cx(
                                'inline-flex min-h-11 items-center rounded-app px-2 text-xs font-semibold text-blue underline',
                              )}
                            >
                              {t('Consultar')} {provider.short}
                              <span className={cx('sr-only')}>
                                {t('(se abre en otra pesta\u00F1a)')}
                              </span>
                            </a>
                          </Fragment>
                        ))(source!)}
                      </Fragment>
                    ) : null}
                  </div>
                  <p
                    role={'status'}
                    aria-atomic={'true'}
                    aria-label={t('Estado de alertas meteorol\u00F3gicas')}
                    className={cx('mt-2 text-sm leading-6 text-secondary')}
                  >
                    {result.status === 'loading' ? (
                      <Fragment>{t('Consultando avisos oficiales\u2026')}</Fragment>
                    ) : result.data?.fuente?.consultas_limitadas ? (
                      <Fragment>
                        {t(
                          'La fuente oficial est\u00E1 limitando temporalmente las consultas. Reintentaremos autom\u00E1ticamente; consultala mientras tanto.',
                        )}
                      </Fragment>
                    ) : result.status === 'unavailable' ||
                      result.data?.estado === 'no_disponible' ? (
                      <Fragment>
                        {t(
                          'No pudimos verificar las alertas en este momento. Consult\u00E1 la fuente oficial.',
                        )}
                      </Fragment>
                    ) : result.data?.estado === 'fuera_cobertura' ? (
                      <Fragment>
                        {t(
                          'No tenemos alertas verificadas para este pa\u00EDs. La cobertura actual incluye Argentina, Brasil, Chile y Uruguay.',
                        )}
                      </Fragment>
                    ) : result.data?.estado === 'parcial' ? (
                      <Fragment>
                        {t(
                          'Consulta incompleta: no se pudieron verificar todos los avisos. Consult\u00E1 la fuente oficial para ampliar la informaci\u00F3n.',
                        )}
                      </Fragment>
                    ) : result.data?.estado === 'disponible' && !result.data?.alertas?.length ? (
                      <Fragment>
                        {t(
                          'Sin alertas reportadas para esta ubicaci\u00F3n. Esto no equivale a ausencia de riesgo.',
                        )}
                      </Fragment>
                    ) : result.data?.alertas?.length ? (
                      <Fragment>
                        {t('Avisos vigentes o programados para esta ubicaci\u00F3n:')}{' '}
                        {result.data?.alertas?.length}
                        {'. '}
                      </Fragment>
                    ) : null}
                  </p>
                  {result.data ? (
                    <Fragment>
                      {((data) => (
                        <Fragment>
                          {data.alertas.length ? (
                            <Fragment>
                              <p className={cx('mt-2 text-xs text-secondary')}>
                                {t('Los avisos oficiales se muestran en su idioma original.')}
                              </p>
                            </Fragment>
                          ) : null}
                          <ul className={cx('mt-3 grid gap-3')}>
                            {data.alertas.map((alert, index) => (
                              <Fragment key={index}>
                                <Fragment>
                                  <li
                                    data-severity={alert.severidad}
                                    className={cx(
                                      'alert-notice rounded-app border border-control-line p-4',
                                    )}
                                  >
                                    <div
                                      className={cx(
                                        'flex flex-wrap items-center justify-between gap-2',
                                      )}
                                    >
                                      <h3
                                        lang={source?.language}
                                        className={cx('font-display text-base font-bold text-ink')}
                                      >
                                        {alert.fenomeno}
                                      </h3>
                                      <span
                                        className={cx(
                                          'severity rounded-app px-3 py-1 text-xs font-semibold',
                                        )}
                                      >
                                        {t('Severidad:')} {t(severity(alert.severidad))}
                                      </span>
                                    </div>
                                    <p className={cx('mt-2 text-xs leading-6 text-secondary')}>
                                      {t('Desde')}{' '}
                                      <time dateTime={alert.inicio_utc}>
                                        {localTime(alert.inicio_utc)}
                                      </time>{' '}
                                      {t('hasta')}{' '}
                                      <time dateTime={alert.fin_utc}>
                                        {localTime(alert.fin_utc)}
                                      </time>
                                      {'. '}
                                    </p>
                                    <p
                                      lang={source?.language}
                                      className={cx(
                                        'mt-2 whitespace-pre-wrap text-sm leading-6 text-ink [overflow-wrap:anywhere]',
                                      )}
                                    >
                                      {alert.descripcion}
                                    </p>
                                    <details
                                      className={cx('mt-2 rounded-app text-sm text-secondary')}
                                    >
                                      <summary
                                        className={cx(
                                          'min-h-11 cursor-pointer rounded-control py-3 font-semibold text-blue',
                                        )}
                                      >
                                        {t('Recomendaciones y \u00E1rea del aviso')}
                                      </summary>
                                      {alert.recomendaciones ? (
                                        <Fragment>
                                          <p
                                            lang={source?.language}
                                            className={cx(
                                              'whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]',
                                            )}
                                          >
                                            {alert.recomendaciones}
                                          </p>
                                        </Fragment>
                                      ) : null}
                                      <p
                                        lang={source?.language}
                                        className={cx(
                                          'mt-2 text-xs leading-6 [overflow-wrap:anywhere]',
                                        )}
                                      >
                                        {alert.zona}
                                      </p>
                                      <p className={cx('mt-1 text-xs leading-6')}>
                                        {t('Emitido:')} {localTime(alert.emitido_en_utc)}
                                        {'. '}
                                      </p>
                                      <a
                                        target={'_blank'}
                                        rel={'noopener noreferrer'}
                                        href={alert.url}
                                        className={cx(
                                          'mt-2 inline-flex min-h-11 items-center rounded-app text-xs font-semibold text-blue underline',
                                        )}
                                      >
                                        {t('Ver documento oficial')}
                                        <span className={cx('sr-only')}>
                                          {t('(se abre en otra pesta\u00F1a)')}
                                        </span>
                                      </a>
                                    </details>
                                  </li>
                                </Fragment>
                              </Fragment>
                            ))}
                          </ul>
                          {data.estado !== 'fuera_cobertura' ? (
                            <Fragment>
                              <p className={cx('mt-3 text-xs leading-6 text-muted')}>
                                {t('Fuente:')} {data.fuente.nombre}
                                {t('. Consultado:')} {localTime(data.fuente.consultado_en_utc)}
                                {t('. Actualizaci\u00F3n autom\u00E1tica cada tres minutos.')}
                              </p>
                            </Fragment>
                          ) : null}
                        </Fragment>
                      ))(result.data!)}
                    </Fragment>
                  ) : null}
                  {result.status !== 'loading' && result.data?.estado !== 'fuera_cobertura' ? (
                    <Fragment>
                      <button
                        type={'button'}
                        className={cx(
                          'mt-2 min-h-11 rounded-control border border-control-line px-3 text-xs font-semibold text-blue hover:bg-sky',
                        )}
                        onClick={(event) => {
                          retry();
                        }}
                      >
                        {t('Actualizar avisos')}
                      </button>
                    </Fragment>
                  ) : null}
                  <p className={cx('mt-3 border-t border-line pt-3 text-xs leading-6 text-muted')}>
                    {t(
                      'Son avisos meteorol\u00F3gicos oficiales; no incluyen un monitoreo de sismos ni de crecidas de r\u00EDos. El Ni\u00F1o y La Ni\u00F1a aportan contexto estacional, pero no confirman un desastre en una ciudad.',
                    )}{' '}
                    <a
                      href={
                        'https://www.argentina.gob.ar/ina/el-nino-situacion-hidrometeorologica-en-argentina'
                      }
                      target={'_blank'}
                      rel={'noopener noreferrer'}
                      className={cx('rounded-app text-blue underline')}
                    >
                      {t('Ver informes oficiales sobre El Ni\u00F1o')}
                      <span className={cx('sr-only')}>{t('(se abre en otra pesta\u00F1a)')}</span>
                    </a>
                    {'. '}
                  </p>
                </section>
              </Fragment>
            ))(location!)}
          </Fragment>
        ) : null}
      </div>
    </>
  );
}
