import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Preferences from '../../preferences/Preferences';
import { useLanguage } from '../../../hooks/useLanguage';
import WeatherIcon from '../weather-icon/weather-icon';
import './weather-sidebar.css';

export default function WeatherSidebar({ children }: { children?: ReactNode }) {
  const { text: t } = useLanguage();
  const [desktop, setDesktop] = useState(() => matchMedia('(min-width: 1024px)').matches);
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const overflow = useRef<string | null>(null);
  function close(restore = true) {
    dialog.current?.close(); setOpened(false);
    if (overflow.current !== null) { document.body.style.overflow = overflow.current; overflow.current = null; }
    if (restore) trigger.current?.focus();
  }
  function open() {
    overflow.current = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.current?.showModal(); setOpened(true);
  }
  useEffect(() => {
    const media = matchMedia('(min-width: 1024px)');
    const resize = () => { close(false); setDesktop(media.matches); };
    media.addEventListener('change', resize);
    return () => { media.removeEventListener('change', resize); if (overflow.current !== null) document.body.style.overflow = overflow.current; };
  }, []);
  const brand = <Link to="/" aria-label={t("StitchWeather, inicio")} className="relative flex items-center gap-3 rounded-app"><span className="stitch-logo" aria-hidden="true">S</span><span className="brand-copy"><span className="block font-display text-lg font-bold tracking-tight text-ink">Stitch<span className="text-brand-accent">Weather</span></span><span className="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-secondary">TU CLIMA, MÁS AZUL</span></span></Link>;
  const content = <aside className="stitch-sidebar"><div className="relative flex items-center justify-between gap-2">{brand}{!desktop && <button data-close-menu type="button" aria-label="Cerrar menú" className="menu-control" onClick={() => close()}><WeatherIcon name="close" size={22} /></button>}</div><Preferences /><nav aria-label="Navegación principal" className="relative mt-4 grid gap-2"><Link to="/sobre-nosotros" className="sidebar-link" onClick={() => close(false)}><WeatherIcon name="sparkles" size={20} />{t('Sobre nosotros')}</Link><Link to="/" className="sidebar-link" onClick={() => close(false)}><WeatherIcon name="cloud-sun" size={20} />Pronóstico</Link></nav>{desktop && <div className="sidebar-note">{children}</div>}</aside>;
  return <div data-component="app-weather-sidebar">{desktop ? <div className="desktop-shell">{content}</div> : <><header className="mobile-header">{brand}<div className="header-assistant">{children}</div><button ref={trigger} type="button" className="menu-control" aria-label="Abrir menú" aria-haspopup="dialog" aria-expanded={opened} aria-controls="mobile-navigation" onClick={open}><WeatherIcon name="menu" size={23} /></button></header><dialog ref={dialog} id="mobile-navigation" className="mobile-menu" aria-label="Navegación principal" onCancel={event => { event.preventDefault(); close(); }} onClose={() => close(false)}>{content}</dialog></>}</div>;
}
