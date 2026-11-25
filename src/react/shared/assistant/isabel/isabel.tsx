import { observeSpeech } from '../../../service/assistant/voice/isabel-voice';
import './isabel.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';

import { cx } from '../../../hooks/classNames';
import type { createIsaPortrait } from './isa-portrait';
import type { IsaSegment } from '../../../models/assistant/isa-performance';
import { useIsabelVoice } from '../../../service/assistant/voice/isabel-voice';
import { useLanguage } from '../../../hooks/useLanguage';
import { IsaLifecycle, type IsaPhase } from './isa-lifecycle';
type Props = {
  sidebar?: boolean;
  presenceOnly?: boolean;
  busy?: boolean;
  text?: string | null;
  segments?: IsaSegment[];
} & { children?: ReactNode; className?: string; id?: string; tabIndex?: number };
export default function Isabel(props: Props) {
  const { sidebar = false, presenceOnly = false, busy = false, text = null, segments } = props;
  const voice = useIsabelVoice(),
    language = useLanguage(),
    t = language.text;
  const playbackBlocked = voice.enabled && voice.state === 'blocked';
  const voiceAction = playbackBlocked
    ? 'Reproducir audio'
    : voice.enabled
      ? 'Silenciar'
      : 'Activar voz';
  const [avatarFailed, setAvatarFailed] = useState(false),
    [reducedMotion, setReducedMotion] = useState(false),
    [horizontalNavbar, setHorizontalNavbar] = useState(false),
    [portraitReady, setPortraitReady] = useState(false),
    [phase, setPhase] = useState<IsaPhase>('sleeping');
  const host = useRef<HTMLSpanElement>(null),
    controller = useRef<Awaited<ReturnType<typeof createIsaPortrait>> | null>(null),
    lastPose = useRef('');
  const [lifecycle] = useState(() => new IsaLifecycle(setPhase));
  const narration = useRef<{
    text: string | null;
    segments: IsaSegment[] | undefined;
    attempted: boolean;
  }>({ text: null, segments: undefined, attempted: false });
  useEffect(() => {
    if (presenceOnly) return;
    let destroyed = false;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)'),
      layout = window.matchMedia('(max-width: 1023px)');
    const motionChanged = () => setReducedMotion(motion.matches),
      layoutChanged = () => setHorizontalNavbar(layout.matches);
    motionChanged();
    layoutChanged();
    motion.addEventListener('change', motionChanged);
    layout.addEventListener('change', layoutChanged);
    void (async () => {
      try {
        const { createIsaPortrait } = await import('./isa-portrait');
        if (destroyed || !host.current) return;
        const portrait = await createIsaPortrait(host.current);
        if (destroyed) {
          portrait.destroy();
          return;
        }
        controller.current = portrait;
        setPortraitReady(true);
      } catch {
        if (!destroyed) setAvatarFailed(true);
      }
    })();
    return () => {
      destroyed = true;
      controller.current?.destroy();
      controller.current = null;
      lifecycle.destroy();
      motion.removeEventListener('change', motionChanged);
      layout.removeEventListener('change', layoutChanged);
      voice.stop();
    };
  }, [presenceOnly, lifecycle]);
  useEffect(() => {
    if (presenceOnly) return;
    const prev = narration.current;
    if (prev.text !== text || prev.segments !== segments) {
      prev.text = text;
      prev.segments = segments;
      prev.attempted = false;
    }
    voice.stop();
    if (text && voice.enabled && !prev.attempted) {
      prev.attempted = true;
      voice.speak(text, language.code, segments);
    }
    return () => voice.stop();
  }, [text, segments, voice.enabled, language.code, presenceOnly]);
  useEffect(() => {
    lifecycle.update(busy, voice.state);
  }, [busy, voice.state, lifecycle]);
  useEffect(() => {
    if (!portraitReady || !controller.current) return;
    const expression =
      voice.state === 'speaking' || phase === 'awake'
        ? 'isa-awake'
        : phase === 'sleeping'
          ? 'isa-sleep'
          : phase === 'right'
            ? sidebar && horizontalNavbar
              ? 'isa-down'
              : 'isa-right'
            : 'isa-awake';
    const key = (reducedMotion ? 'static:' : 'animated:') + expression;
    if (lastPose.current === key) return;
    lastPose.current = key;
    if (reducedMotion) controller.current.setExpression(expression);
    else controller.current.play(expression);
  }, [portraitReady, voice.state, reducedMotion, phase, sidebar, horizontalNavbar]);
  useEffect(() => {
    if (!portraitReady) return;
    controller.current?.setSpeechLanguage(language.code);
    controller.current?.setWorking(busy || voice.state === 'loading');
    controller.current?.setSpeaking(voice.state === 'speaking');
  }, [portraitReady, busy, voice.state, language.code]);
  useEffect(
    () =>
      observeSpeech((time, state) => {
        if (state === 'speaking') controller.current?.setSpeechTime(time);
      }),
    [portraitReady],
  );
  function toggleVoice() {
    if (playbackBlocked) voice.resume();
    else voice.setEnabled(!voice.enabled);
  }
  function retryVoice() {
    if (text && voice.enabled && ['busy', 'error'].includes(voice.state))
      voice.speak(text, language.code, segments);
  }

  return (
    <>
      <div
        id={props.id}
        tabIndex={props.tabIndex}
        data-component={'app-isabel'}
        className={cx(props.className, { 'is-sidebar': sidebar })}
      >
        {presenceOnly ? (
          <Fragment>
            <section
              aria-label={'Isa'}
              className={cx('isa-card rounded-app border border-line bg-surface p-4 text-ink')}
            >
              <div className={cx('isa-stage is-presence')}>
                <img
                  src={'isa-bot/runtime/isa-sleep-v3.webp'}
                  width={'320'}
                  height={'320'}
                  alt={'Isa'}
                  className={cx('isa-fallback')}
                />
              </div>
              <div className={cx('isa-copy min-w-0 flex-1')}>
                <p className={cx('mt-1 text-sm leading-6 text-secondary')}>
                  {t('Tu compa\u00F1era del clima. Te leo el consejo para tu d\u00EDa.')}
                </p>
                <p aria-hidden={'true'} className={cx('isa-status mt-2')}></p>
              </div>
            </section>
          </Fragment>
        ) : (
          <Fragment>
            <section
              aria-label={'Isa'}
              className={cx('isa-card rounded-app border border-line bg-surface p-4 text-ink')}
            >
              <svg
                width={'0'}
                height={'0'}
                aria-hidden={'true'}
                focusable={'false'}
                className={cx('isa-edge-filter')}
              >
                <defs>
                  <filter id={'isa-dark-edge'} colorInterpolationFilters={'sRGB'}>
                    <feMorphology
                      in={'SourceAlpha'}
                      operator={'erode'}
                      radius={'1'}
                      result={'cleanEdge'}
                    ></feMorphology>
                    <feComposite
                      in={'SourceGraphic'}
                      in2={'cleanEdge'}
                      operator={'in'}
                    ></feComposite>
                  </filter>
                </defs>
              </svg>
              <button
                type={'button'}
                aria-label={'Isa: ' + t(voiceAction)}
                aria-pressed={playbackBlocked ? undefined : voice.enabled}
                title={t(voiceAction)}
                className={cx('isa-stage', {
                  'is-speaking': voice.state === 'speaking' && !reducedMotion,
                })}
                onClick={(event) => {
                  toggleVoice();
                }}
              >
                <span aria-hidden={'true'} ref={host} className={cx('isa-avatar')}></span>
                {!portraitReady || avatarFailed ? (
                  <Fragment>
                    <img
                      src={'isa-bot/runtime/isa-sleep-v3.webp'}
                      width={'320'}
                      height={'320'}
                      alt={''}
                      aria-hidden={'true'}
                      className={cx('isa-fallback')}
                    />
                  </Fragment>
                ) : null}
              </button>
              <div className={cx('isa-copy min-w-0 flex-1')}>
                <p className={cx('mt-1 text-sm leading-6 text-secondary')}>
                  {t('Tu compa\u00F1era del clima. Te leo el consejo para tu d\u00EDa.')}
                </p>
                <p
                  role={'status'}
                  aria-live={'polite'}
                  className={cx('isa-status mt-2 text-xs leading-5 text-secondary')}
                >
                  {voice.state === 'loading' ? (
                    <Fragment>
                      {t(
                        voice.waitingForVoice
                          ? 'La voz est\u00E1 ocupada. Reintentando\u2026'
                          : 'Isa est\u00E1 preparando tu audio\u2026',
                      )}
                    </Fragment>
                  ) : voice.state === 'speaking' ? (
                    <Fragment>{t('Isa est\u00E1 hablando\u2026')}</Fragment>
                  ) : voice.state === 'blocked' ? (
                    <Fragment>
                      {t(
                        'Toc\u00E1 a Isa para escuchar el consejo. Tambi\u00E9n pod\u00E9s leerlo como texto.',
                      )}
                    </Fragment>
                  ) : voice.state === 'error' ? (
                    <Fragment>
                      {t('No pudimos reproducir la voz. El consejo sigue disponible como texto.')}
                    </Fragment>
                  ) : voice.state === 'busy' ? (
                    <Fragment>
                      {t('La voz sigue ocupada. Pod\u00E9s volver a intentarlo.')}
                    </Fragment>
                  ) : null}
                </p>
                {voice.enabled && text && (voice.state === 'busy' || voice.state === 'error') ? (
                  <Fragment>
                    <button
                      type={'button'}
                      className={cx('mt-2 rounded-app border border-line px-3 py-2 text-sm')}
                      onClick={(event) => {
                        retryVoice();
                      }}
                    >
                      {t('Reintentar voz')}
                    </button>
                  </Fragment>
                ) : null}
              </div>
            </section>
          </Fragment>
        )}
      </div>
    </>
  );
}
