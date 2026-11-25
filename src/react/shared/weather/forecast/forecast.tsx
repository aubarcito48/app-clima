import './forecast.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../hooks/classNames';
import { displayTemperature, TemperatureUnit } from '../../../models/weather/temperature';
import { ForecastInterval, WeatherPreview } from '../../../models/weather/weather-preview';
import WeatherIcon from '../weather-icon/weather-icon';
import TemperatureChart from '../temperature-chart/temperature-chart';
import { useLanguage } from "../../../hooks/useLanguage";
type Props = { weather?: WeatherPreview | null } & { children?: ReactNode; className?: string; id?: string; tabIndex?: number; unit?: TemperatureUnit; onUnitChange?: (value: TemperatureUnit) => void };
export default function Forecast(props: Props) {
const { weather = null } = props;
const t = useLanguage().text;
const language = useLanguage();
const unit = props.unit ?? 'C';
const setUnit = (value: TemperatureUnit) => props.onUnitChange?.(value);
function temperature(value: number) {
    return displayTemperature(value, unit);
}
function dateLabel(key: string, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(language.locale, { ...options, timeZone: 'UTC' }).format(new Date(key + 'T12:00:00Z'));
}
const days = (() => {
    const groups = new Map<string, {
        key: string;
        label: string;
        intervals: ForecastInterval[];
    }>();
    for (const interval of weather?.forecast ?? []) {
        let day = groups.get(interval.dayKey);
        if (!day) {
            day = { key: interval.dayKey, label: interval.dayLabel, intervals: [] };
            groups.set(interval.dayKey, day);
        }
        day.intervals.push(interval);
    }
    return [...groups.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((day) => ({
        ...day,
        shortDay: dateLabel(day.key, { weekday: 'short' }),
        shortDate: dateLabel(day.key, { day: 'numeric', month: 'short' }),
        representative: [...day.intervals].sort((a, b) => {
            const distance = (time: string) => {
                const [hours, minutes] = time.split(':').map(Number);
                return Math.abs(hours * 60 + minutes - 720);
            };
            return distance(a.time) - distance(b.time);
        })[0],
        low: Math.min(...day.intervals.map((row) => row.temperature)),
        high: Math.max(...day.intervals.map((row) => row.temperature)),
        intervals: day.intervals.sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime)),
    }));
})();
const [selectedDay, setSelectedDay] = useState(() => {
    weather;
    return days[0]?.key ?? '';
});
useEffect(() => {
    setSelectedDay((() => {
        weather;
        return days[0]?.key ?? '';
    })());
}, [weather]);
const activeDay = (() => days.find((day) => day.key === selectedDay) ?? null)();
const [showAll, setShowAll] = useState(() => {
    weather;
    return false;
});
useEffect(() => {
    setShowAll((() => {
        weather;
        return false;
    })());
}, [weather]);
const visibleDays = (() => showAll ? days : activeDay ? [activeDay!] : [])();

return <><div id={props.id} tabIndex={props.tabIndex} data-component={"app-forecast"} className={cx(props.className, "block min-w-0")}><section id={"evolucion"} aria-labelledby={"forecast-heading"} className={cx("min-w-0 scroll-mt-6")}>{(activeDay) ? (<Fragment>{((day) => (<Fragment><TemperatureChart intervals={(day.intervals)} unit={(unit)} label={(t('Evoluci\u00F3n del {day}', { day: day.label }))} className={cx("mb-6 block min-w-0")}></TemperatureChart></Fragment>))((activeDay)! )}</Fragment>) : null}{(weather) ? (<Fragment>{((data) => (<Fragment><section aria-labelledby={"daily-heading"}><div className={cx("flex flex-wrap items-center gap-x-3 gap-y-1")}><h2 id={"daily-heading"} className={cx("font-display text-lg font-bold text-ink")}>{(t('Pron\u00F3stico de los pr\u00F3ximos d\u00EDas'))}</h2><label htmlFor={"forecast-unit"} className={cx("sr-only")}>{(t('Unidad de temperatura'))}</label><select id={"forecast-unit"} value={(unit)} className={cx("min-h-11 rounded-control border border-control-line bg-surface px-3 text-xs font-semibold text-blue")} onChange={(event) => { setUnit((event.target as HTMLSelectElement).value === 'F' ? 'F' : 'C');; }}><option value={"C"}>{"°C"}</option><option value={"F"}>{"°F"}</option></select></div><p className={cx("mt-1 text-xs leading-6 text-muted")}>{(t('Planific\u00E1 tus aventuras. Eleg\u00ED una fecha para ver sus horas.'))}</p>{(days.length) ? (<Fragment><div role={"group"} tabIndex={0} aria-label={(t('Elegir un d\u00EDa del pron\u00F3stico, desplazables horizontalmente'))} className={cx("day-strip mt-4")}>{((days)).map((day, index) => <Fragment key={(day.key)}><Fragment><button type={"button"} aria-pressed={(selectedDay === day.key)} aria-label={(t('{day}, rango de {low} a {high} grados {unit}', {
    day: day.label,
    low: temperature(day.low),
    high: temperature(day.high),
    unit: unit,
}))} className={cx("day-choice forecast-day")} onFocus={(event) => { (event.currentTarget as HTMLButtonElement).scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
});; }} onClick={(event) => { setSelectedDay(day.key);
setShowAll(false);; }}><span className={cx("min-w-0 text-center")}><span className={cx("block text-sm font-bold text-ink")}>{(day.shortDay)}</span><span className={cx("mt-1 block text-[10px] text-muted")}>{(day.shortDate)}</span></span>{(day.representative.condition) ? (<Fragment>{((condition) => (<Fragment><WeatherIcon name={(condition)} size={(30)} className={cx("text-blue")}></WeatherIcon></Fragment>))((day.representative.condition)! )}</Fragment>) : <Fragment><span aria-hidden={"true"}></span></Fragment>}<span title={(t('Intervalo de las {time} h', { time: day.representative.time }))} className={cx("min-w-0 text-center text-[11px] leading-5 text-secondary")}>{(day.representative.description ?? t('Descripci\u00F3n no disponible'))}</span><span className={cx("day-temperatures text-sm")}><span className={cx("font-bold text-ink")}><span aria-hidden={"true"} className={cx("block text-[10px] font-normal text-secondary")}>{(t('M\u00E1x.'))}</span><span className={cx("sr-only")}>{(t('Mayor temperatura de intervalos:'))}</span>{(temperature(day.high))}{"° "}</span><span className={cx("text-muted")}><span aria-hidden={"true"} className={cx("block text-[10px]")}>{(t('M\u00EDn.'))}</span><span className={cx("sr-only")}>{(t('Menor temperatura de intervalos:'))}</span>{(temperature(day.low))}{"° "}</span></span></button></Fragment></Fragment>)}</div><p className={cx("mt-3 text-xs leading-6 text-muted")}>{(t('Rangos de los intervalos recibidos, con fechas que pueden estar incompletas. No son extremos diarios completos. No son promedios diarios. La condici\u00F3n mostrada corresponde al intervalo m\u00E1s cercano al mediod\u00EDa.'))}</p></Fragment>) : <Fragment><p className={cx("mt-4 text-sm text-secondary")}>{(t('Pron\u00F3stico no disponible por el momento.'))}</p></Fragment>}</section><section aria-labelledby={"forecast-heading"} className={cx("mt-7")}><div className={cx("flex flex-wrap items-center gap-x-2 gap-y-1")}><h2 id={"forecast-heading"} className={cx("font-display text-lg font-bold text-ink")}>{(t('Pron\u00F3stico por hora'))}</h2>{(days.length) ? (<Fragment><button type={"button"} aria-controls={"hourly-intervals"} aria-expanded={(showAll)} aria-label={(showAll ? t('Ver solo el d\u00EDa elegido') : t('Ver todos los intervalos'))} className={cx("min-h-11 rounded-control px-2 text-xs font-semibold text-blue hover:bg-surface")} onClick={(event) => { setShowAll(!showAll);; }}>{(showAll ? t('Ver d\u00EDa elegido') : t('Ver completo'))}{" "}<span aria-hidden={"true"}>{"→"}</span></button></Fragment>) : null}</div><p className={cx("mt-1 text-xs leading-6 text-muted")}>{(t('Pr\u00F3ximos intervalos del d\u00EDa elegido. Hora local de la ciudad.'))}</p><p className={cx("mt-1 text-xs leading-6 text-secondary")}>{(data.city)}{" ("}{(data.timezoneLabel)}{(t('). Fuente:'))}{" "}{(data.source)}{(t('. Intervalos de tres horas seg\u00FAn disponibilidad.'))}</p><div id={"hourly-intervals"}>{((visibleDays)).map((day, index) => <Fragment key={(day.key)}><Fragment><section aria-labelledby={('forecast-day-' + day.key)} className={cx("mt-3")}><h3 id={('forecast-day-' + day.key)} className={cx((showAll ? 'mb-2 text-xs font-semibold text-secondary' : 'sr-only'))}>{(day.label)}</h3><div tabIndex={0} role={"region"} aria-label={(t('Horas del {day}, desplazables horizontalmente', { day: day.label }))} className={cx("hour-strip")}>{(day.key === data.observedDayKey) ? (<Fragment><div aria-label={(t('Clima actual'))} className={cx("hour-card")}><span className={cx("text-xs font-semibold text-secondary")}>{(t('Ahora'))}</span>{(data.condition) ? (<Fragment>{((condition) => (<Fragment><WeatherIcon name={(condition)} size={(30)} className={cx("my-1 text-blue")}></WeatherIcon></Fragment>))((data.condition)! )}</Fragment>) : null}<p className={cx("text-lg font-semibold text-ink")}>{(temperature(data.temperature))}<span className={cx("ml-0.5 text-xs font-normal")}>{"°"}{(unit)}</span></p><p className={cx("text-center text-[11px] leading-5 text-muted")}>{(data.description ?? t('Descripci\u00F3n no disponible'))}</p></div></Fragment>) : null}<ol aria-label={(t('Intervalos de pron\u00F3stico del {day}', { day: day.label }))} className={cx("flex shrink-0 gap-3")}>{((day.intervals)).map((interval, index) => <Fragment key={(interval.dateTime)}><Fragment><li className={cx("hour-card")}><time dateTime={(interval.dateTime)} className={cx("text-xs font-semibold text-secondary")}>{(interval.time)}{" h"}</time>{(interval.condition) ? (<Fragment>{((condition) => (<Fragment><WeatherIcon name={(condition)} size={(30)} className={cx("my-1 text-blue")}></WeatherIcon></Fragment>))((interval.condition)! )}</Fragment>) : null}<p className={cx("text-lg font-semibold text-ink")}>{(temperature(interval.temperature))}<span className={cx("ml-0.5 text-xs font-normal")}>{"°"}{(unit)}</span></p><p className={cx("text-center text-[11px] leading-5 text-muted")}>{(interval.description ?? t('Descripci\u00F3n no disponible'))}</p>{(interval.precipitation != null) ? (<Fragment><p className={cx("text-center text-[11px] text-secondary")}>{(t('Lluvia:'))}{" "}{(interval.precipitation)}{" % "}</p></Fragment>) : null}</li></Fragment></Fragment>)}</ol></div></section></Fragment></Fragment>)}</div></section></Fragment>))((weather)! )}</Fragment>) : <Fragment><div className={cx("flex flex-wrap items-center gap-x-2 gap-y-1")}><h2 id={"forecast-heading"} className={cx("font-display text-lg font-bold text-ink")}>{(t('Pron\u00F3stico por hora'))}</h2>{(days.length) ? (<Fragment><button type={"button"} aria-controls={"hourly-intervals"} aria-expanded={(showAll)} aria-label={(showAll ? t('Ver solo el d\u00EDa elegido') : t('Ver todos los intervalos'))} className={cx("min-h-11 rounded-control px-2 text-xs font-semibold text-blue hover:bg-surface")} onClick={(event) => { setShowAll(!showAll);; }}>{(showAll ? t('Ver d\u00EDa elegido') : t('Ver completo'))}{" "}<span aria-hidden={"true"}>{"→"}</span></button></Fragment>) : null}</div><p className={cx("mt-1 text-xs leading-6 text-muted")}>{(t('Pr\u00F3ximos intervalos del d\u00EDa elegido. Hora local de la ciudad.'))}</p><div className={cx("mt-4 rounded-app border border-line bg-surface px-6 py-10 text-center")}><WeatherIcon name={"cloud-sun"} size={(32)} className={cx("text-blue")}></WeatherIcon><p className={cx("mt-3 text-sm font-semibold text-secondary")}>{(t('Un vistazo a lo que viene.'))}</p><p className={cx("mt-2 text-sm leading-6 text-muted")}>{(t('Eleg\u00ED una ciudad para ver sus pr\u00F3ximas horas, los d\u00EDas y la evoluci\u00F3n de la temperatura.'))}</p></div></Fragment>}</section></div></>;
}
