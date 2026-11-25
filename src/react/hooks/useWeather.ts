import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from './useLanguage';
import type { ClimateResponse } from '../models/weather/climate-response';
import type { CitySearchFeedback, WeatherQuery } from '../models/places/city-query';
import { searchClimate } from '../api/climate';
import { normalizeCityQuery, serializeWeatherQuery } from '../shared/places/city-search/city-query';
import { climateFeedback, climatePresentation } from '../service/weather/climate-presentation';

export function useWeather() {
  const language = useLanguage();
  const [response, setResponse] = useState<ClimateResponse | null>(null);
  const [state, setState] = useState<'initial' | 'loading' | 'ready'>('initial');
  const [feedback, setFeedback] = useState<CitySearchFeedback | null>(null);
  const [requestedCity, setRequestedCity] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const activeKey = useRef('');
  const lastQuery = useRef<WeatherQuery | null>(null);
  const loading = useRef(false);
  const previousLanguage = useRef(language.code);
  const weather = useMemo(() => response ? climatePresentation(response, language.locale) : null, [response, language.locale]);
  const editQuery = useCallback(() => {
    generation.current++; controller.current?.abort(); controller.current = null;
    activeKey.current = ''; lastQuery.current = null; loading.current = false;
    setResponse(null); setFeedback(null); setState('initial'); setCancelled(false);
  }, []);
  const reset = () => { const pending = loading.current; editQuery(); setCancelled(pending); };
  const search = useCallback(async (query: WeatherQuery) => {
    const normalized = 'city' in query ? normalizeCityQuery(query) : query;
    if ('city' in normalized && !normalized.city) return;
    const key = `${serializeWeatherQuery(normalized)}:${language.code}`;
    if (loading.current && activeKey.current === key) return;
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    const current = ++generation.current;
    activeKey.current = key; lastQuery.current = { ...normalized }; loading.current = true;
    setResponse(null); setFeedback(null); setCancelled(false); setState('loading');
    setRequestedCity('city' in normalized ? normalized.city : 'tu ubicación actual');
    try {
      const result = await searchClimate(normalized, language.code, request.signal);
      if (current !== generation.current || request.signal.aborted) return;
      setResponse(result); setState('ready');
    } catch (error) {
      if (current !== generation.current || request.signal.aborted) return;
      setFeedback(climateFeedback(error)); setState('initial');
    } finally { if (current === generation.current) { loading.current = false; activeKey.current = ''; } }
  }, [language.code]);
  const retry = () => { if (feedback?.retryable && lastQuery.current) void search(lastQuery.current); };
  useEffect(() => {
    if (previousLanguage.current === language.code) return;
    previousLanguage.current = language.code;
    if (lastQuery.current) void search(lastQuery.current);
  }, [language.code, search]);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  return {response,state,feedback,weather,requestedCity,cancelled,temperatureUnit,setTemperatureUnit,search,editQuery,reset,retry};
}
