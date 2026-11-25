import './weather-icon.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../hooks/classNames';
import { WeatherCondition } from '../../../models/weather/weather-preview';
export type IconName =
  | WeatherCondition
  | 'search'
  | 'pin'
  | 'wind'
  | 'drop'
  | 'sparkles'
  | 'arrow'
  | 'check'
  | 'close'
  | 'sunrise'
  | 'sunset'
  | 'heart'
  | 'menu'
  | 'alert'
  | 'phone'
  | 'play'
  | 'pause';
type Props = {
    animated?: boolean;
    paused?: boolean;
    filled?: boolean;
    name?: IconName;
    size?: number;
  } & { children?: ReactNode; className?: string; id?: string; tabIndex?: number;  };
export default function WeatherIcon(props: Props) {
const { animated = false, paused = false, filled = false, name = 'sun', size = 24 } = props;

return <><div id={props.id} tabIndex={props.tabIndex} data-component={"app-weather-icon"} aria-hidden={"true"} className={cx(props.className, "inline-flex shrink-0 items-center justify-center")}><svg viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.65"} strokeLinecap={"round"} strokeLinejoin={"round"} focusable={"false"} width={(size)} height={(size)} className={cx(({ 'weather-motion': animated, 'motion-paused': paused }))}>{(name === 'play') ? (<Fragment><path d={"m8 4 12 8-12 8Z"} fill={"currentColor"} stroke={"none"}></path></Fragment>) : (name === 'pause') ? (<Fragment><path d={"M8 5v14M16 5v14"} strokeWidth={"3"}></path></Fragment>) : (name === 'phone') ? (<Fragment><path d={"M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a14 14 0 0 1-7-7l2-2-2-5Z"}></path></Fragment>) : (name === 'alert') ? (<Fragment><path d={"M10.3 4.5 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z"}></path><path d={"M12 9v4m0 4h.01"}></path></Fragment>) : (name === 'sun') ? (<Fragment><circle cx={"12"} cy={"12"} r={"4"} fill={"var(--color-sun-soft)"}></circle><path d={"M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"} className={cx("sun-rays")}></path></Fragment>) : (name === 'cloud-sun') ? (<Fragment><circle cx={"9"} cy={"8"} r={"4"} fill={"var(--color-sun-soft)"} stroke={"var(--color-sun-stroke)"}></circle><path d={"M9 1v1M2 8H1m3-5L3 2m11 1 1-1"} stroke={"var(--color-sun-stroke)"} className={cx("partial-sun-rays")}></path><path d={"M17.5 21H6a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 16 12a4.5 4.5 0 1 1 1.5 9Z"} fill={"var(--color-cloud)"} className={cx("cloud-drift")}></path></Fragment>) : (name === 'cloud') ? (<Fragment><path d={"M17.5 19H6a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 16 10a4.5 4.5 0 1 1 1.5 9Z"} fill={"var(--color-cloud)"} className={cx("cloud-drift")}></path></Fragment>) : (name === 'rain') ? (<Fragment><path d={"M6 15a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 16 6a4.5 4.5 0 1 1 1.5 9"} fill={"var(--color-cloud)"}></path><path d={"m8 17-1 3m6-3-1 3m6-3-1 3"} stroke={"var(--color-blue)"} className={cx("rain-drops")}></path></Fragment>) : (name === 'moon') ? (<Fragment><path d={"M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"} fill={"var(--color-sun-soft)"} className={cx("moon-glow")}></path></Fragment>) : (name === 'cloud-moon') ? (<Fragment><path d={"M15 3a5 5 0 0 0 6 6 6 6 0 0 1-10-2 6 6 0 0 1 4-4Z"} fill={"var(--color-sun-soft)"}></path><path d={"M17 21H6a4 4 0 0 1-1-8 5 5 0 0 1 10-1 4.5 4.5 0 1 1 2 9Z"} fill={"var(--color-cloud)"} className={cx("cloud-drift")}></path></Fragment>) : (name === 'snow') ? (<Fragment><path d={"M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M7 19l1-4-4-1M17 5l-1 4 4 1"}></path></Fragment>) : (name === 'mist') ? (<Fragment><path d={"M3 7h18M5 12h14M3 17h18"}></path></Fragment>) : (name === 'storm') ? (<Fragment><path d={"M6 15a4 4 0 0 1-1-8 5.5 5.5 0 0 1 11-1 4.5 4.5 0 1 1 1 9"} fill={"var(--color-cloud)"}></path><path d={"m13 12-4 6h5l-2 5 7-8h-5l2-3"} fill={"var(--color-sun-soft)"}></path></Fragment>) : (name === 'search') ? (<Fragment><circle cx={"10.5"} cy={"10.5"} r={"6.5"}></circle><path d={"m16 16 4 4"}></path></Fragment>) : (name === 'pin') ? (<Fragment><path d={"M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"}></path><circle cx={"12"} cy={"10"} r={"2.5"}></circle></Fragment>) : (name === 'wind') ? (<Fragment><path d={"M3 8h11a3 3 0 1 0-3-3M2 12h16a3 3 0 1 1-3 3M4 16h5a2.5 2.5 0 1 1-2.5 2.5"}></path></Fragment>) : (name === 'sunrise') ? (<Fragment><path d={"M3 18h18M5 14h1m12 0h1M8 10l-1-1m10 0-1 1M12 3v7m-3-4 3-3 3 3M7 18a5 5 0 0 1 10 0M3 22h18"}></path></Fragment>) : (name === 'sunset') ? (<Fragment><path d={"M3 18h18M5 14h1m12 0h1M8 10l-1-1m10 0-1 1M12 3v7m-3-3 3 3 3-3M7 18a5 5 0 0 1 10 0M3 22h18"}></path></Fragment>) : (name === 'drop') ? (<Fragment><path d={"M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"}></path><path d={"M8 15a4 4 0 0 0 4 4"}></path></Fragment>) : (name === 'sparkles') ? (<Fragment><path d={"m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Zm7-1v4m-2-2h4"}></path></Fragment>) : (name === 'arrow') ? (<Fragment><path d={"M4 12h16m-6-6 6 6-6 6"}></path></Fragment>) : (name === 'check') ? (<Fragment><path d={"m5 12 4 4L19 6"}></path></Fragment>) : (name === 'close') ? (<Fragment><path d={"m6 6 12 12M6 18 18 6"}></path></Fragment>) : (name === 'menu') ? (<Fragment><path d={"M3 6h18M3 12h18M3 18h18"}></path></Fragment>) : (name === 'heart') ? (<Fragment><path d={"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"} fill={(filled ? 'currentColor' : 'none')}></path></Fragment>) : null}</svg></div></>;
}
