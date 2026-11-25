import './back-to-top.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../hooks/classNames';
import WeatherIcon from '../../weather/weather-icon/weather-icon';
import { useLanguage } from "../../../hooks/useLanguage";
type Props = {} & { children?: ReactNode; className?: string; id?: string; tabIndex?: number;  };
export default function BackToTop(props: Props) {

const t=useLanguage().text;const [visible,setVisible]=useState(false);
useEffect(()=>{const update=()=>setVisible(window.scrollY>320);update();window.addEventListener('scroll',update,{passive:true});return ()=>window.removeEventListener('scroll',update)},[]);
function scrollToTop(){document.getElementById('main-content')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}

return <><div id={props.id} tabIndex={props.tabIndex} data-component={"app-back-to-top"} className={cx(props.className)}>{(visible) ? (<Fragment><button type={"button"} aria-label={(t('Volver arriba'))} title={(t('Volver arriba'))} className={cx("back-to-top")} onClick={(event) => { scrollToTop();; }}><WeatherIcon name={"arrow"} size={(22)} className={cx("-rotate-90")}></WeatherIcon></button></Fragment>) : null}</div></>;
}
