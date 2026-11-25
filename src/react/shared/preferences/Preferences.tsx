import { useLanguage } from '../../hooks/useLanguage';
import { useColorTheme } from '../../hooks/useColorTheme';
import WeatherIcon from '../weather/weather-icon/weather-icon';
export default function Preferences() {
  const language = useLanguage();
  const theme = useColorTheme();
  const t = language.text;
  return (
    <div className="sidebar-preferences">
      <div data-component="app-language-toggle" className="inline-flex shrink-0">
        <div
          role="group"
          aria-label={t('Idioma')}
          className="flex min-h-11 items-center rounded-control border border-control-line bg-surface px-1 text-xs text-secondary"
        >
          {(['es', 'en'] as const).map((code, index) => (
            <span key={code}>
              {index > 0 && <span aria-hidden="true">/</span>}
              <button
                type="button"
                lang={code}
                aria-label={code === 'es' ? 'Español' : 'English'}
                aria-pressed={language.code === code}
                onClick={() => language.set(code)}
                className="min-h-11 min-w-8 rounded-control px-1 hover:bg-sky"
              >
                {code.toUpperCase()}
              </button>
            </span>
          ))}
        </div>
      </div>
      <div data-component="app-theme-toggle">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control border border-control-line bg-surface px-2.5 text-xs font-semibold text-blue hover:bg-sky"
          aria-label={t(theme.mode === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro')}
          onClick={(event) => theme.toggle(event as unknown as Event)}
        >
          <WeatherIcon name={theme.mode === 'dark' ? 'moon' : 'sun'} size={18} />
          <span className="whitespace-nowrap">
            {t(theme.mode === 'dark' ? 'Modo oscuro' : 'Modo claro')}
          </span>
        </button>
      </div>
    </div>
  );
}
