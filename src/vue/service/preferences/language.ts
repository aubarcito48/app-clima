import { computed, ref } from 'vue';

export type LanguageCode = 'es' | 'en';
export const LANGUAGE_KEY = 'stitchweather.language';
const code = ref<LanguageCode>('es');
const locale = computed(() => code.value === 'en' ? 'en-US' : 'es-AR');
function text(value: string | null | undefined, params: Readonly<Record<string, string | number>> = {}) {
  return (value ?? '').replace(/\{(\w+)\}/gu, (token, name: string) => params[name] == null ? token : String(params[name]));
}
export function useLanguage() { return { code, locale, text }; }
