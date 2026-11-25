import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../hooks/classNames';
import { useLanguage } from "../../../hooks/useLanguage";
type Props = {} & { children?: ReactNode; className?: string; id?: string; tabIndex?: number;  };
export default function SiteFooter(props: Props) {

const t = useLanguage().text;

return <><div id={props.id} tabIndex={props.tabIndex} data-component={"app-site-footer"} className={cx(props.className)}><footer className={cx("flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line py-6 text-xs leading-6 text-muted")}><p>{(t('Hecho para entender el cielo y disfrutar el día.'))}</p><p>{"StitchWeather "}<span aria-hidden={"true"}>{"·"}</span>{(t('Tu clima, más azul'))}</p></footer></div></>;
}
