import { ref, computed } from 'vue';
const disposers: (() => void)[] = [];
const cleanup = (dispose: () => void) => disposers.push(dispose);
if (import.meta.hot) import.meta.hot.dispose(() => disposers.splice(0).forEach(stop => stop()));


const document = globalThis.document;
const window = document.defaultView;
const system = window?.matchMedia?.('(prefers-color-scheme: dark)');
let preference: 'light' | 'dark' | null = read();
const current = ref(preference ?? (system?.matches ? 'dark' : 'light'));
const mode = current;
let transition: ViewTransition | null = null;
let reveal: Animation | null = null;
function toggle(event?: Event): void {
    const next = (preference ?? current.value) === 'dark' ? 'light' : 'dark';
    stopTransition();
    preference = next;
    try {
        window?.localStorage.setItem('stitchweather.theme', preference);
    }
    catch {
        // The toggle remains usable when browser storage is unavailable.
    }
    const update = () => {
        // A newer click or storage event supersedes a pending snapshot callback.
        if (preference !== next)
            return;
        current.value = next;
        apply();
    };
    const root = document.documentElement;
    const reducedMotion = window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!window || reducedMotion || typeof document.startViewTransition !== 'function' ||
        typeof root.animate !== 'function') {
        update();
        return;
    }
    const target = event?.currentTarget;
    const rect = target instanceof Element ? target.getBoundingClientRect() : null;
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.classList.add('theme-reveal');
    try {
        const snapshot = document.startViewTransition(update);
        transition = snapshot;
        void snapshot.ready.then(async () => {
            if (transition !== snapshot)
                return;
            reveal = root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' });
            await reveal.finished;
        }).catch(() => {
            // Skipped snapshots or unsupported pseudo-element animation still apply the theme.
            if (transition === snapshot) {
                snapshot.skipTransition();
                update();
            }
        });
        void snapshot.finished.catch(() => undefined).finally(() => {
            if (transition !== snapshot)
                return;
            transition = null;
            reveal?.cancel();
            reveal = null;
            root.classList.remove('theme-reveal');
        });
    }
    catch {
        stopTransition();
        update();
    }
}
function stopTransition(): void {
    transition?.skipTransition();
    transition = null;
    reveal?.cancel();
    reveal = null;
    document.documentElement.classList.remove('theme-reveal');
}
function read(): 'light' | 'dark' | null {
    try {
        const value = window?.localStorage.getItem('stitchweather.theme');
        return value === 'light' || value === 'dark' ? value : null;
    }
    catch {
        return null;
    }
}
function apply(): void {
    document.documentElement.dataset['theme'] = current.value;
    document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', current.value === 'dark' ? '#0c1b2b' : '#eefaff');
}
apply();
const systemChanged = () => {
    if (preference === null) {
        stopTransition();
        current.value = system?.matches ? 'dark' : 'light';
        apply();
    }
};
const storageChanged = (event: StorageEvent) => {
    if (event.key !== 'stitchweather.theme' && event.key !== null)
        return;
    stopTransition();
    preference = read();
    current.value = preference ?? (system?.matches ? 'dark' : 'light');
    apply();
};
system?.addEventListener('change', systemChanged);
window?.addEventListener('storage', storageChanged);
({ onDestroy: cleanup }).onDestroy(() => {
    stopTransition();
    system?.removeEventListener('change', systemChanged);
    window?.removeEventListener('storage', storageChanged);
});

export function useColorTheme() { return { mode, toggle }; }
