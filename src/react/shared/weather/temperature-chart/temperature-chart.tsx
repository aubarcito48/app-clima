import './temperature-chart.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../hooks/classNames';
import { ForecastInterval } from '../../../models/weather/weather-preview';
import { displayTemperature } from '../../../models/weather/temperature';
import { useLanguage } from "../../../hooks/useLanguage";
type Props = { intervals?: readonly ForecastInterval[]; label?: string; unit?: 'C' | 'F' } & { children?: ReactNode; className?: string; id?: string; tabIndex?: number;  };
export default function TemperatureChart(props: Props) {
const { intervals = [], label = 'Evolución de la temperatura', unit = 'C' } = props;
const t = useLanguage().text;
const viewportElements = useRef<HTMLDivElement | null>(null);
const viewport = (() => Array.isArray(viewportElements.current) ? viewportElements.current[0] : viewportElements.current)();
const [width, setWidth] = useState(720);
const [metric, setMetric] = useState<'temperature' | 'precipitation' | 'wind'>('temperature');
const motionKey = (() => ({
    intervals: intervals,
    label: label,
    metric: metric,
    unit: unit,
}))();
const metrics = [
    { key: 'temperature', label: 'Temperatura' },
    { key: 'precipitation', label: 'Precipitaciones' },
    { key: 'wind', label: 'Viento' },
] as const;
const metricLabel = (() => metric === 'temperature'
    ? 'Temperatura'
    : metric === 'precipitation'
        ? 'Probabilidad de lluvia'
        : 'Viento')();
const metricUnit = (() => metric === 'temperature'
    ? '°' + unit
    : metric === 'precipitation'
        ? '%'
        : 'km/h')();
const chart = (() => {
    const rows = intervals.map((row) => ({
        ...row,
        temperature: displayTemperature(row.temperature, unit),
    }))
        .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
    if (!rows.length)
        return null;
    const samples = rows.map((row) => ({
        ...row,
        value: metric === 'temperature'
            ? row.temperature
            : metric === 'precipitation'
                ? (row.precipitation ?? null)
                : (row.wind ?? null),
    }));
    const values = samples.flatMap((row) => (row.value == null ? [] : [row.value]));
    const low = metric === 'temperature' && values.length ? Math.floor(Math.min(...values) - 1) : 0;
    const high = metric === 'precipitation'
        ? 100
        : metric === 'wind'
            ? Math.max(1, Math.ceil(Math.max(0, ...values) + 1))
            : values.length
                ? Math.ceil(Math.max(...values) + 1)
                : 1;
    const start = Date.parse(rows[0].dateTime);
    const duration = Date.parse(rows[rows.length - 1].dateTime) - start;
    const timeline = samples.map((row) => ({
        ...row,
        x: duration
            ? 56 + ((Date.parse(row.dateTime) - start) / duration) * (width - 88)
            : width / 2,
    }));
    const points = timeline.flatMap((row) => row.value == null
        ? []
        : [{ ...row, value: row.value, y: 134 - ((row.value - low) / (high - low)) * 104 }]);
    // Missing samples break the series rather than joining across unavailable intervals.
    const segments: string[] = [];
    let segment: string[] = [];
    for (const row of timeline) {
        if (row.value == null) {
            if (segment.length > 1)
                segments.push(segment.join(' '));
            segment = [];
        }
        else
            segment.push(`${row.x},${134 - ((row.value - low) / (high - low)) * 104}`);
    }
    if (segment.length > 1)
        segments.push(segment.join(' '));
    return {
        points,
        timeline,
        segments,
        available: values.length > 0,
        ticks: Array.from({ length: 5 }, (_, index) => ({
            y: 134 - index * 26,
            value: Number((low + ((high - low) * index) / 4).toFixed(1)),
        })),
    };
})();

useEffect(() => {
const item=viewportElements.current;const element=Array.isArray(item)?item[0]:item;if(!element)return;
const measure=()=>setWidth(Math.max(480,element.clientWidth||720));measure();const observer=new ResizeObserver(measure);observer.observe(element);return ()=>observer.disconnect();
},[chart?.available]);
return <><div id={props.id} tabIndex={props.tabIndex} data-component={"app-temperature-chart"} className={cx(props.className)}>{(chart) ? (<Fragment>{((graph) => (<Fragment><figure className={cx("rounded-app border border-line bg-surface p-3 sm:p-4")}><figcaption className={cx("mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink")}><span>{(t(label))}<span className={cx("ml-2 text-xs font-normal text-muted")}>{(t(metricLabel))}{" ("}{(metricUnit)}{")"}</span></span><span role={"group"} aria-label={(t('Variable del gr\u00E1fico'))} className={cx("flex flex-wrap gap-1")}>{((metrics)).map((option, index) => <Fragment key={(option.key)}><Fragment><button type={"button"} aria-pressed={(metric === option.key)} className={cx("min-h-11 border-b-2 px-3 text-xs font-semibold text-blue hover:bg-sky", (metric === option.key ? 'border-blue' : 'border-transparent'))} onClick={(event) => { setMetric(option.key);; }}>{(t(option.label))}</button></Fragment></Fragment>)}</span></figcaption>{(graph.available) ? (<Fragment><div tabIndex={0} role={"region"} aria-label={(t('Gr\u00E1fico de {metric}; desplazable horizontalmente', {
    metric: t(metricLabel),
}))} ref={viewportElements} className={cx("overflow-x-auto")}>{(([motionKey])).map((key, index) => <Fragment key={(JSON.stringify(key))}><Fragment><svg role={"img"} viewBox={('0 0 ' + width + ' 180')} aria-label={(t('{label}. {metric} en {unit}. Valores exactos disponibles en la tabla del gr\u00E1fico.', { label: t(label), metric: t(metricLabel), unit: metricUnit }))} className={cx("chart-motion block h-40 w-full min-w-120 sm:h-44")}>{((graph.ticks)).map((tick, index) => <Fragment key={(tick.y)}><Fragment><line x1={"56"} stroke={"var(--color-line)"} x2={(width - 32)} y1={(tick.y)} y2={(tick.y)}></line><text x={"44"} textAnchor={"end"} fill={"var(--color-secondary)"} fontSize={"12"} y={(tick.y + 4)}>{(tick.value)}</text></Fragment></Fragment>)}{((graph.segments)).map((segment, index) => <Fragment key={(index)}><Fragment><polyline pathLength={"100"} fill={"none"} stroke={"var(--color-blue)"} strokeWidth={"3"} strokeLinejoin={"round"} points={(segment)}></polyline></Fragment></Fragment>)}{((graph.points)).map((point, index) => <Fragment key={(point.dateTime)}><Fragment><circle r={"5"} fill={"var(--color-blue)"} stroke={"var(--color-surface)"} strokeWidth={"2"} cx={(point.x)} cy={(point.y)}><title>{(point.time)}{" h: "}{(point.value)}{(metricUnit)}{(metric === 'wind'
    ? ', ' + t(point.windDirection?.label ?? 'direcci\u00F3n no disponible')
    : '')}</title></circle><text fill={"var(--color-ink)"} fontSize={"13"} fontWeight={"600"} x={(point.x)} y={(point.y - 14)} textAnchor={(index === 0 ? 'start' : index === graph.points.length - 1 ? 'end' : 'middle')}>{(point.value)}{(metric === 'temperature' ? '\u00B0' : metric === 'precipitation' ? '%' : '')}{(t(metric === 'wind' ? (point.windDirection?.abbreviation ?? '') : ''))}</text></Fragment></Fragment>)}{((graph.timeline)).map((point, index) => <Fragment key={(point.dateTime)}><Fragment><text y={"164"} textAnchor={"middle"} fill={"var(--color-secondary)"} fontSize={"12"} x={(point.x)}>{(point.time)}</text></Fragment></Fragment>)}</svg></Fragment></Fragment>)}</div></Fragment>) : <Fragment><p aria-live={"polite"} className={cx("flex h-40 items-center justify-center text-sm text-secondary sm:h-44")}>{(t(metricLabel))}{(t('no disponible para este d\u00EDa.'))}</p></Fragment>}<table className={cx("sr-only")}><caption>{(t(metricLabel))}{(t('del d\u00EDa elegido'))}</caption><thead><tr><th scope={"col"}>{(t('Hora local'))}</th><th scope={"col"}>{(t(metricLabel))}{" ("}{(metricUnit)}{")"}</th></tr></thead><tbody>{((graph.timeline)).map((point, index) => <Fragment key={(point.dateTime)}><Fragment><tr><th scope={"row"}>{(point.time)}{" h"}</th><td>{(point.value == null ? t('No disponible') : point.value + ' ' + metricUnit)}{(metric === 'wind'
    ? ', ' + t(point.windDirection?.label ?? 'direcci\u00F3n no disponible')
    : '')}</td></tr></Fragment></Fragment>)}</tbody></table><p className={cx("mt-1 text-xs leading-5 text-muted")}>{(t('Hora local de la ciudad.'))}{(metric === 'precipitation'
    ? t('Probabilidad de lluvia, no cantidad acumulada.')
    : t('Cada punto es un intervalo recibido.'))}{(t('Los datos ausentes interrumpen la l\u00EDnea.'))}</p></figure></Fragment>))((chart)! )}</Fragment>) : null}</div></>;
}
