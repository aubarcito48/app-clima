import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../hooks/classNames';

type Props = {} & { children?: ReactNode; className?: string; id?: string; tabIndex?: number;  };
export default function WeatherLoading(props: Props) {


return <><div id={props.id} tabIndex={props.tabIndex} data-component={"app-weather-loading"} className={cx(props.className, "block min-w-0")}><div aria-hidden={"true"} className={cx("grid gap-5")}><div className={cx("relative min-h-100 rounded-app border border-line bg-sky p-6 sm:p-8")}><img src={"stitch-coast.svg"} alt={""} width={"96"} height={"81"} className={cx("loading-stitch absolute top-5 right-5 w-24")} /><div className={cx("skeleton h-4 w-28")}></div><div className={cx("skeleton mt-12 h-8 w-40")}></div><div className={cx("skeleton mt-5 h-20 w-28")}></div><div className={cx("skeleton mt-5 h-4 w-36")}></div><div className={cx("mt-10 grid grid-cols-2 gap-5")}><div className={cx("skeleton h-12")}></div><div className={cx("skeleton h-12")}></div></div></div><div className={cx("rounded-app border border-line bg-surface p-6")}><div className={cx("skeleton h-4 w-40")}></div><div className={cx("mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4")}><div className={cx("skeleton h-30")}></div><div className={cx("skeleton h-30")}></div><div className={cx("skeleton h-30")}></div><div className={cx("skeleton h-30")}></div></div></div></div></div></>;
}
