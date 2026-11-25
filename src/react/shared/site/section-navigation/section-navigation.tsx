import './section-navigation.css';
import { Fragment, useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../hooks/classNames';
import { useLanguage } from "../../../hooks/useLanguage";
export interface ScrollSection {
  id: string;
  label: string;
}
type Props = { sections: readonly ScrollSection[] } & { children?: ReactNode; className?: string; id?: string; tabIndex?: number;  };
export default function SectionNavigation(props: Props) {

const {sections}=props,language=useLanguage();const [activeIndex,setActiveIndex]=useState(0);
function goTo(event:MouseEvent,id:string){if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const target=document.getElementById(id);if(!target)return;event.preventDefault();target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.focus({preventScroll:true})}
useEffect(()=>{let frame:number|undefined;const update=()=>{frame=undefined;const line=Math.min(180,window.innerHeight*0.25);let current=0;sections.forEach((section,index)=>{const target=document.getElementById(section.id);if(target&&target.getBoundingClientRect().top<=line)current=index});if(window.scrollY>0&&window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2)current=sections.length-1;setActiveIndex(current)};const schedule=()=>{frame??=requestAnimationFrame(update)};window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);const observer=new ResizeObserver(schedule);observer.observe(document.body);schedule();return ()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);observer.disconnect();if(frame!==undefined)cancelAnimationFrame(frame)}},[sections]);

return <><div id={props.id} tabIndex={props.tabIndex} data-component={"app-section-navigation"} className={cx(props.className)}><nav aria-label={(language.text('NavegaciÃ³n por secciones'))}><ol>{((sections)).map((section, index) => <Fragment key={(section.id)}><Fragment><li><a href={('#' + section.id)} aria-current={(activeIndex === index ? 'location' : undefined)} aria-label={(language.text(section.label))} className={cx(({ 'is-active': activeIndex === index }))} onClick={(event) => { goTo(event.nativeEvent, section.id);; }}><span aria-hidden={"true"} className={cx("section-label")}>{(language.text(section.label))}</span><span aria-hidden={"true"} className={cx("section-dot")}></span></a></li></Fragment></Fragment>)}</ol></nav></div></>;
}
