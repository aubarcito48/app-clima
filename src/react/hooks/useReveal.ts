import { useEffect } from 'react';
/** Reveal new route content once; release detached elements and observers. */
export function useReveal() {
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const tracked = new Set<HTMLElement>();
    const reveal = (element: HTMLElement) => {
      element.classList.remove('reveal-pending');
      observer.unobserve(element);
    };
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        }),
      { rootMargin: '0px 0px -48px 0px' },
    );
    const refresh = () => {
      tracked.forEach((element) => {
        if (!element.isConnected) {
          observer.unobserve(element);
          tracked.delete(element);
        }
      });
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
        if (tracked.has(element)) return;
        tracked.add(element);
        element.classList.add('scroll-reveal', 'reveal-ready');
        if (!motion.matches) {
          element.classList.add('reveal-pending');
          observer.observe(element);
        }
      });
    };
    const focus = (event: FocusEvent) => {
      const element = (event.target as Element)?.closest<HTMLElement>('.reveal-pending');
      if (element) reveal(element);
    };
    const changed = () => {
      if (motion.matches) tracked.forEach(reveal);
    };
    const mutations = new MutationObserver(refresh);
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('focusin', focus);
    motion.addEventListener('change', changed);
    refresh();
    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.removeEventListener('focusin', focus);
      motion.removeEventListener('change', changed);
      tracked.forEach((element) => element.classList.remove('reveal-pending'));
    };
  }, []);
}
