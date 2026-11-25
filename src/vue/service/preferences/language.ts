import { ref, computed } from 'vue';
const disposers: (() => void)[] = [];
const cleanup = (dispose: () => void) => disposers.push(dispose);
if (import.meta.hot) import.meta.hot.dispose(() => disposers.splice(0).forEach((stop) => stop()));
import { ENGLISH } from './translations';
export type LanguageCode = 'es' | 'en';
export const LANGUAGE_KEY = 'stitchweather.language';
const document = globalThis.document;
const selected = ref<LanguageCode>(read());
const code = selected;
const locale = computed(() => (code.value === 'en' ? 'en-US' : 'es-AR'));
function set(code: LanguageCode): void {
  selected.value = code;
  apply();
  try {
    document.defaultView?.localStorage.setItem(LANGUAGE_KEY, code);
  } catch {
    /* The choice still works for this session. */
  }
}
function text(
  value: string | null | undefined,
  params: Readonly<Record<string, string | number>> = {},
): string {
  const result = translate(value);
  return result.replace(/\{(\w+)\}/gu, (token, name: string) =>
    params[name] == null ? token : String(params[name]),
  );
}
function translate(value: string | null | undefined): string {
  if (!value || code.value === 'es') return value ?? '';
  const key = value.trim().replace(/\s+/gu, ' ');
  const translated = ENGLISH[key];
  if (translated) return value.replace(value.trim(), translated);
  const saved = key.match(/^(.*) se (guardó en|quitó de) Mis lugares\.$/u);
  if (saved)
    return `${saved[1]} was ${saved[2] === 'guardó en' ? 'saved to' : 'removed from'} My places.`;
  const count = key.match(
    /^(\d+) lugares encontrados\. Usá las flechas y Enter o elegí uno de la lista\.$/u,
  );
  if (count)
    return `${count[1]} places found. Use the arrow keys and Enter or choose one from the list.`;
  return value;
}
function read(): LanguageCode {
  try {
    const saved = document.defaultView?.localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* Storage can be unavailable. */
  }
  return 'es';
}
function apply(): void {
  document.documentElement.lang = code.value;
  document.title = `StitchWeather · ${text('Tu clima, más azul')}`;
}
apply();

export function useLanguage() {
  return { code, locale, set, text };
}
