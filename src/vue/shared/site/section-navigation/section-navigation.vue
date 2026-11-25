<script setup lang="ts">
import { ref, computed, watch, watchEffect, watchPostEffect, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCleanup, resettableRef, untracked, vReveal } from '../../../composables/runtime';
import { useLanguage } from '../../../service/preferences/language';
export interface ScrollSection {
  id: string;
  label: string;
}
const cleanup = useCleanup();
const t = useLanguage().text;
const props = withDefaults(defineProps<{ sections: readonly ScrollSection[] }>(), {  });
const language = useLanguage();
const sections = computed(() => props.sections);
const activeIndex = ref(0);
const document = globalThis.document;
const destroyRef = { onDestroy: cleanup };
function goTo(event: MouseEvent, id: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
    const target = document.getElementById(id);
    if (!target)
        return;
    event.preventDefault();
    const window = document.defaultView;
    target.scrollIntoView({
        behavior: window?.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        block: 'start',
    });
    target.focus({ preventScroll: true });
}
onMounted(() => {
    const window = document.defaultView;
    if (!window)
        return;
    let frame: number | undefined;
    const update = () => {
        frame = undefined;
        const readingLine = Math.min(180, window.innerHeight * 0.25);
        let current = 0;
        sections.value.forEach((section, index) => {
            const target = document.getElementById(section.id);
            if (target && target.getBoundingClientRect().top <= readingLine)
                current = index;
        });
        if (window.scrollY > 0 &&
            window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
            current = sections.value.length - 1;
        }
        activeIndex.value = current;
    };
    const schedule = () => {
        frame ??= window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    observer?.observe(document.body);
    schedule();
    destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        observer?.disconnect();
        if (frame !== undefined)
            window.cancelAnimationFrame(frame);
    });
});

defineExpose({ goTo });
</script>

<template>
<div data-component="app-section-navigation"><nav :aria-label="(language.text('Navegación por secciones'))">
  <ol >
    <template v-for="(section, index) in sections" :key="section.id">
      <li >
        <a :href="('#' + section.id)" :aria-current="(((activeIndex === index) ? 'location' : undefined))" :aria-label="(language.text(section.label))" :class="{ 'is-active': (activeIndex === index) }" @click="goTo($event, section.id)">
          <span class="section-label" aria-hidden="true">{{ language.text(section.label) }}</span>
          <span class="section-dot" aria-hidden="true"></span>
        </a>
      </li>
    </template></ol>
</nav>
</div>
</template>

<style scoped>
[data-component="app-section-navigation"] {
  display: none;
}
@media (min-width: 1280px) and (min-height: 520px) {
  [data-component="app-section-navigation"] {
    display: block;
    position: fixed;
    z-index: 25;
    inset-inline-end: 2rem;
    top: 50%;
    height: 16.5rem;
    transform: translateY(-50%);
  }
}
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  position: relative;
}
a {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-control);
  color: var(--color-blue);
  text-decoration: none;
}
.section-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: var(--color-muted);
  opacity: 0.5;
  translate: -1rem 0;
  transition:
    background-color 250ms,
    box-shadow 250ms,
    scale 250ms;
}
li:nth-child(even) .section-dot {
  translate: 1rem 0;
}
li:nth-child(even) .section-label {
  right: 0.75rem;
}
.section-label {
  position: absolute;
  right: 2.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius-app);
  background: var(--color-canvas);
  font: 600 0.65rem var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  translate: 0.3rem 0;
  transition:
    opacity 220ms,
    translate 220ms;
  pointer-events: none;
}
.is-active .section-dot {
  opacity: 1;
  background: var(--color-blue);
  scale: 1.7;
  box-shadow:
    0 0 6px var(--color-blue),
    0 0 16px color-mix(in srgb, var(--color-blue) 45%, transparent);
}
.is-active .section-label,
a:hover .section-label,
a:focus-visible .section-label {
  opacity: 1;
  translate: 0;
}
a:focus-visible {
  outline: 2px solid var(--color-blue);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .section-dot,
  .section-label {
    transition: none;
  }
}

</style>
