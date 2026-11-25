import { ref, watchEffect, onUnmounted, type Directive } from 'vue';
import { pauseTracking, resetTracking } from '@vue/reactivity';

/** Allows listeners created after mount to join the component's cleanup. */
export function useCleanup() {
  const callbacks: (() => void)[] = [];
  onUnmounted(() => callbacks.splice(0).reverse().forEach(stop => stop()));
  return (stop: () => void) => callbacks.push(stop);
}

export function untracked<T>(read: () => T): T {
  pauseTracking();
  try { return read(); } finally { resetTracking(); }
}

/** A writable selection that resets when its source data changes. */
export function resettableRef<T>(source: () => T) {
  const value = ref<T>(source());
  watchEffect(() => { value.value = source(); });
  return value;
}

const revealCleanups = new WeakMap<HTMLElement, () => void>();
export const vReveal: Directive<HTMLElement> = {
  mounted(element) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || typeof IntersectionObserver === 'undefined') return;
    const reveal = () => { element.classList.remove('reveal-pending'); observer.disconnect(); };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) reveal();
    }, { rootMargin: '0px 0px -48px 0px' });
    const changed = () => { if (motion.matches) reveal(); };
    element.classList.add('scroll-reveal', 'reveal-ready', 'reveal-pending');
    observer.observe(element);
    element.addEventListener('focusin', reveal);
    motion.addEventListener('change', changed);
    revealCleanups.set(element, () => {
      observer.disconnect(); element.removeEventListener('focusin', reveal);
      motion.removeEventListener('change', changed);
    });
  },
  unmounted(element) { revealCleanups.get(element)?.(); revealCleanups.delete(element); },
};
