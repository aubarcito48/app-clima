<script setup lang="ts">
import { useLanguage } from '../../../service/preferences/language';
const language = useLanguage();
</script>
<template><div data-component="app-language-toggle"><div class="language-control" role="group" :aria-label="language.text('Idioma')">
<button type="button" lang="es" aria-label="Español" :aria-pressed="language.code.value === 'es'" @click="language.set('es')">ES</button><span aria-hidden="true">/</span><button type="button" lang="en" aria-label="English" :aria-pressed="language.code.value === 'en'" @click="language.set('en')">EN</button>
</div></div></template>
<style scoped>
    [data-component="app-language-toggle"] {
      display: inline-block;
      flex-shrink: 0;
    }
    .language-control {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0 6px;
      border: 1px solid var(--color-control-line);
      border-radius: var(--radius-control);
      background: var(--color-surface);
      color: var(--color-secondary);
      font-size: 12px;
    }
    button {
      min-height: 42px;
      min-width: 30px;
      padding: 0 4px;
      cursor: pointer;
      border-radius: var(--radius-control);
    }
    button[aria-pressed='true'] {
      color: var(--color-blue);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    button:hover {
      background: var(--color-sky);
    }
    button:focus-visible {
      outline: 2px solid var(--color-blue);
      outline-offset: 1px;
    }
  </style>
