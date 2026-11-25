import './climate-awareness.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';

import { cx } from '../../../hooks/classNames';
import { useLanguage } from '../../../hooks/useLanguage';
type Props = {} & { children?: ReactNode; className?: string; id?: string; tabIndex?: number };
export default function ClimateAwareness(props: Props) {
  const t = useLanguage().text;
  const stage = useRef<HTMLDivElement>(null),
    pointerStart = useRef<{ x: number; y: number } | null>(null),
    suppressToggle = useRef(false);
  const [active, setActive] = useState(0),
    [paused, setPaused] = useState(false),
    [visible, setVisible] = useState(true),
    [pageVisible, setPageVisible] = useState(!document.hidden);
  const slides = [
    {
      id: 'forest',
      src: 'climate-awareness/forest.webp',
      width: 1100,
      height: 550,
      alt: 'Río turquesa entre un bosque frondoso y montañas con niebla.',
      title: 'Cuidemos nuestros bosques',
      message: 'Respetá la naturaleza y las áreas protegidas.',
    },
    {
      id: 'water',
      src: 'climate-awareness/water.webp',
      width: 1100,
      height: 503,
      alt: 'Agua cristalina que fluye entre rocas y árboles.',
      title: 'Cada gota cuenta',
      message: 'Evitá desperdiciar agua en tus tareas de todos los días.',
    },
    {
      id: 'clean-energy',
      src: 'climate-awareness/clean-energy.webp',
      width: 1100,
      height: 436,
      alt: 'Aerogeneradores sobre colinas verdes junto al mar.',
      title: 'Un futuro con energía limpia',
      message: 'Ahorrá energía y aprovechá la luz natural.',
    },
  ] as const;

  function toggleRotation() {
    if (suppressToggle.current) {
      suppressToggle.current = false;
      return;
    }
    setPaused((value) => !value);
  }
  function select(index: number) {
    setPaused(true);
    setActive((index + slides.length) % slides.length);
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    select(active + (event.key === 'ArrowRight' ? 1 : -1));
  }
  function pointerDown(event: PointerEvent) {
    if (event.isPrimary && event.button === 0)
      pointerStart.current = { x: event.clientX, y: event.clientY };
  }
  function pointerUp(event: PointerEvent) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) > 40 && Math.abs(delta) > Math.abs(event.clientY - start.y)) {
      select(active + (delta < 0 ? 1 : -1));
      suppressToggle.current = true;
    }
  }
  function cancelPointer() {
    pointerStart.current = null;
  }
  useEffect(() => {
    const change = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useEffect(() => {
    if (paused || !visible || !pageVisible) return;
    const timer = window.setInterval(() => setActive((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [paused, visible, pageVisible]);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new IntersectionObserver((entries) =>
      setVisible(entries[0]?.isIntersecting ?? false),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        id={props.id}
        tabIndex={props.tabIndex}
        data-component={'app-climate-awareness'}
        className={cx(props.className)}
      >
        <section
          aria-label={t('Concientizaci\u00F3n clim\u00E1tica')}
          aria-roledescription={t('carrusel')}
          className={cx('awareness-slider')}
          onKeyDown={(event) => {
            onKeydown(event.nativeEvent);
          }}
        >
          <div
            ref={stage}
            className={cx('image-stage')}
            onPointerDown={(event) => {
              pointerDown(event.nativeEvent);
            }}
            onPointerUp={(event) => {
              pointerUp(event.nativeEvent);
            }}
            onPointerCancel={(event) => {
              cancelPointer();
            }}
          >
            {slides.map((slide, index) => (
              <Fragment key={slide.id}>
                <Fragment>
                  <figure
                    role={'group'}
                    hidden={active !== index}
                    aria-roledescription={t('diapositiva')}
                    aria-label={t('{index} de {total}', { index: index + 1, total: slides.length })}
                    className={cx('awareness-slide')}
                  >
                    <img
                      draggable={'false'}
                      src={slide.src}
                      alt={t(slide.alt)}
                      width={slide.width}
                      height={slide.height}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                    <figcaption>
                      <h2 className={cx('font-display text-sm font-bold leading-5')}>
                        {t(slide.title)}
                      </h2>
                      <p className={cx('mt-1 text-xs leading-5')}>{t(slide.message)}</p>
                    </figcaption>
                  </figure>
                </Fragment>
              </Fragment>
            ))}
            <button
              type={'button'}
              aria-label={
                paused
                  ? t('Reanudar presentaci\u00F3n ambiental')
                  : t('Pausar presentaci\u00F3n ambiental')
              }
              title={paused ? t('Toc\u00E1 para reanudar') : t('Toc\u00E1 para pausar')}
              className={cx('image-toggle')}
              onClick={(event) => {
                toggleRotation();
              }}
            ></button>
          </div>
          <img
            src={'stitch-coast.svg'}
            alt={''}
            aria-hidden={'true'}
            width={'160'}
            height={'135'}
            draggable={'false'}
            className={cx('slider-mascot')}
          />
          <div className={cx('slider-controls')}>
            <div
              role={'group'}
              aria-label={t('Elegir imagen ambiental')}
              className={cx('flex items-center')}
            >
              {slides.map((slide, index) => (
                <Fragment key={slide.id}>
                  <Fragment>
                    <button
                      type={'button'}
                      aria-label={t('Ver imagen {index}: {title}', {
                        index: index + 1,
                        title: t(slide.title),
                      })}
                      aria-current={active === index ? 'true' : undefined}
                      className={cx('slide-dot')}
                      onFocus={(event) => {
                        setPaused(true);
                      }}
                      onClick={(event) => {
                        select(index);
                      }}
                    >
                      <span aria-hidden={'true'}></span>
                    </button>
                  </Fragment>
                </Fragment>
              ))}
            </div>
          </div>
          <p aria-atomic={'true'} aria-live={paused ? 'polite' : 'off'} className={cx('sr-only')}>
            {t('Imagen')} {active + 1} {t('de')} {slides.length}
            {': '}
            {t(slides[active].title)}
            {'. '}
          </p>
        </section>
      </div>
    </>
  );
}
