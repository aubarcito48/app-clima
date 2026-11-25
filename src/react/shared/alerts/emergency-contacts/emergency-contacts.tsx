import './emergency-contacts.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';

import { cx } from '../../../hooks/classNames';
import WeatherIcon from '../../weather/weather-icon/weather-icon';
import { emergencyDirectory } from './emergency-directory';
import { useLanguage } from '../../../hooks/useLanguage';
type Props = { selectedCountry?: string | null } & {
  children?: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
};
export default function EmergencyContacts(props: Props) {
  const { selectedCountry = null } = props;
  const t = useLanguage().text;
  const directory = emergencyDirectory(selectedCountry);
  const contactsViewportRef = useRef<HTMLDivElement>(null);
  const [canPrevious, setCanPrevious] = useState(false),
    [canNext, setCanNext] = useState(false);
  function updateControls() {
    const viewport = contactsViewportRef.current;
    if (!viewport) return;
    setCanPrevious(viewport.scrollLeft > 2);
    setCanNext(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2);
  }
  function move(direction: number) {
    const viewport = contactsViewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({
      left: direction * Math.max(240, viewport.clientWidth - 24),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.target !== contactsViewportRef.current) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  }
  useEffect(() => {
    const viewport = contactsViewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = 0;
    updateControls();
    const observer = new ResizeObserver(updateControls);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [directory]);

  return (
    <>
      <div
        id={props.id}
        tabIndex={props.tabIndex}
        data-component={'app-emergency-contacts'}
        className={cx(props.className)}
      >
        <section
          aria-labelledby={'emergency-heading'}
          aria-roledescription={directory ? t('carrusel') : undefined}
        >
          <div className={cx('contacts-header flex items-start justify-between gap-2 px-1')}>
            <div className={cx('min-w-0 flex-1')}>
              <h2
                id={'emergency-heading'}
                className={cx('font-display text-sm font-bold text-ink')}
              >
                {t('Tel\u00E9fonos \u00FAtiles')}{' '}
                {directory ? (
                  <Fragment>
                    {((book) => (
                      <Fragment>
                        {' · '}
                        {t(book.name)}
                      </Fragment>
                    ))(directory!)}
                  </Fragment>
                ) : null}
              </h2>
              <p id={'contacts-help'} className={cx('mt-1 text-xs text-muted')}>
                {directory ? (
                  <Fragment>
                    {t('Desliz\u00E1 o us\u00E1 las flechas para ver los contactos.')}
                  </Fragment>
                ) : selectedCountry ? (
                  <Fragment>
                    {t(
                      'Todav\u00EDa no tenemos tel\u00E9fonos nacionales verificados para este pa\u00EDs.',
                    )}
                  </Fragment>
                ) : (
                  <Fragment>
                    {t('Busc\u00E1 una ciudad para ver los tel\u00E9fonos de su pa\u00EDs.')}
                  </Fragment>
                )}
              </p>
            </div>
            {directory ? (
              <Fragment>
                <div
                  role={'group'}
                  aria-label={t('Controles de tel\u00E9fonos \u00FAtiles')}
                  className={cx('flex gap-2')}
                >
                  <button
                    type={'button'}
                    aria-controls={'emergency-viewport'}
                    aria-label={t('Ver tel\u00E9fonos anteriores')}
                    disabled={!canPrevious}
                    className={cx('carousel-control')}
                    onClick={(event) => {
                      move(-1);
                    }}
                  >
                    <WeatherIcon
                      name={'arrow'}
                      size={18}
                      className={cx('rotate-180')}
                    ></WeatherIcon>
                  </button>
                  <button
                    type={'button'}
                    aria-controls={'emergency-viewport'}
                    aria-label={t('Ver m\u00E1s tel\u00E9fonos')}
                    disabled={!canNext}
                    className={cx('carousel-control')}
                    onClick={(event) => {
                      move(1);
                    }}
                  >
                    <WeatherIcon name={'arrow'} size={18}></WeatherIcon>
                  </button>
                </div>
              </Fragment>
            ) : null}
          </div>
          {directory ? (
            <Fragment>
              {((book) => (
                <Fragment>
                  <div
                    id={'emergency-viewport'}
                    tabIndex={0}
                    role={'region'}
                    aria-describedby={'contacts-help'}
                    aria-label={t(
                      'Tel\u00E9fonos \u00FAtiles de {country}, desplazables horizontalmente',
                      {
                        country: t(book.name),
                      },
                    )}
                    ref={contactsViewportRef}
                    className={cx('contacts-viewport mt-2')}
                    onScroll={(event) => {
                      updateControls();
                    }}
                    onKeyDown={(event) => {
                      onKeydown(event.nativeEvent);
                    }}
                  >
                    <ul className={cx('contacts-track')}>
                      {book.contacts.map((contact, index) => (
                        <Fragment key={contact.number}>
                          <Fragment>
                            <li
                              className={cx('contact-card textured-card', {
                                'priority-contact': contact.number === book.contacts[0].number,
                              })}
                            >
                              <a
                                href={'tel:' + contact.number}
                                aria-label={t('Llamar al {number}, {name}. Cobertura: {coverage}', {
                                  number: contact.number,
                                  name: t(contact.name),
                                  coverage: t(book.name),
                                })}
                                className={cx('contact-link')}
                                onFocus={(event) => {
                                  (event.currentTarget as HTMLAnchorElement).scrollIntoView({
                                    block: 'nearest',
                                    inline: 'nearest',
                                  });
                                }}
                              >
                                <span className={cx('flex items-center justify-between gap-3')}>
                                  <span
                                    className={cx(
                                      'font-display text-2xl font-bold tracking-tight text-ink',
                                    )}
                                  >
                                    {contact.number}
                                  </span>
                                  <span
                                    className={cx(
                                      'flex items-center gap-1 text-xs font-semibold text-blue',
                                    )}
                                  >
                                    <WeatherIcon name={'phone'} size={16}></WeatherIcon>
                                    {t('Llamar')}
                                  </span>
                                </span>
                                <span
                                  className={cx(
                                    'mt-1 block text-sm font-semibold leading-5 text-ink',
                                  )}
                                >
                                  {t(contact.name)}
                                </span>
                                <span className={cx('mt-1 block text-xs leading-5 text-secondary')}>
                                  {t(contact.detail)}
                                </span>
                                <span
                                  className={cx(
                                    'mt-auto block pt-2 text-[11px] leading-4 text-muted',
                                  )}
                                >
                                  {t(book.name)}
                                </span>
                              </a>
                            </li>
                          </Fragment>
                        </Fragment>
                      ))}
                    </ul>
                  </div>
                  <p className={cx('mt-1 px-1 text-[11px] leading-5 text-muted')}>
                    {t(
                      'N\u00FAmeros para usar dentro del pa\u00EDs consultado. La disponibilidad de cada servicio depende de la zona.',
                    )}{' '}
                    <a
                      target={'_blank'}
                      rel={'noopener noreferrer'}
                      href={book.source}
                      className={cx(
                        'inline-flex min-h-6 items-center rounded-app text-blue underline',
                      )}
                    >
                      {t('Fuente oficial')}
                      <span className={cx('sr-only')}>{t('(se abre en otra pesta\u00F1a)')}</span>
                    </a>
                    {'. '}
                  </p>
                </Fragment>
              ))(directory!)}
            </Fragment>
          ) : null}
        </section>
      </div>
    </>
  );
}
