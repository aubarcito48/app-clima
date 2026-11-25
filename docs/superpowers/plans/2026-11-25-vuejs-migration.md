# StitchWeather Vue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicar StitchWeather en Vue para el portfolio, mediante 10 commits sustanciales distribuidos en sesiones.

**Architecture:** Frontend Vue independiente en la rama `vuejs`, con el mismo backend Django. Reutilizar modelos y recursos independientes de Angular; trasladar estado a composables y presentación a componentes Vue.

**Tech Stack:** Vue, TypeScript, Vite, Vue Router, Tailwind/CSS, Leaflet y Playwright; versiones compatibles por verificar durante el setup.

**Spec:** `docs/superpowers/specs/2026-11-25-vuejs-design.md`

## Global Constraints

- Mantener Angular en `main` y realizar la migración en `vuejs`.
- Total previsto: 10 commits, incluido el plan inicial; sin commits vacíos ni fechas artificiales.
- Esta sesión entrega únicamente el primer commit de documentación.
- Usar el backend Django existente; no exponer claves privadas.
- Verificar los cambios pendientes de Angular antes de portar el mapa.
- Hacer staging por rutas explícitas, revisar el diff y registrar la validación antes de cada commit.

## Review Focus

- Consultas concurrentes: una respuesta antigua no debe reemplazar la ciudad más reciente (commit 4).
- Ubicación denegada o almacenamiento bloqueado: permitir continuar usando búsqueda manual (commit 6).
- Respuestas incompletas: mostrar estados parciales sin inventar datos (commits 4, 5 y 8).
- Audio bloqueado o consulta cancelada: permitir reproducción manual y detener la anterior (commit 9).
- Navegación directa, móvil y teclado: rutas accesibles y controles utilizables sin desbordamiento (commits 3 y 10).

## Mapa de archivos

Conservar `public/` y `e2e/`. Durante la transición, conservar `src/app/` como
referencia Angular hasta el commit 10. Crear la aplicación Vue en `src/vue/`:
`main.ts`, `App.vue`, `router.ts`, `components/`, `pages/`, `composables/`,
`api/` y `models/`. Los modelos portados deben conservar el contrato de Django.
`src/vue/styles/` contiene estilos adaptados. Eliminar archivos Angular obsoletos
en el cierre, después de comprobar la equivalencia funcional.

## Diez commits

### 1. Documentar alcance y etapas

**Mensaje:** `docs: planificar migracion a Vue en diez etapas`

- [x] Documentar alcance, arquitectura, base y cambios locales excluidos en la especificación.
- [x] Dividir la migración en diez entregas y detallar su validación en este plan.
- [ ] Revisar `git diff --cached --check` y confirmar solo estos dos documentos.

### 2. Preparar una aplicación Vue ejecutable

**Mensaje:** `build: preparar Vue TypeScript y Vite`

**Archivos:** `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`,
`tsconfig*.json`, `src/vue/main.ts`, `src/vue/App.vue`, `src/vue/env.d.ts` y `.gitignore`.

- [ ] Configurar entrada Vue mínima y scripts de desarrollo, typecheck y build; conservar la referencia Angular sin importarla desde Vue.
- [ ] Adaptar la configuración pública de API de `scripts/configure-env.mjs` a Vite, conservando los nombres de variables documentados y sin incluir secretos.
- [ ] Instalar dependencias compatibles y verificar `npm run typecheck` y `npm run build`; comprobar que `npm start` carga la entrada Vue.
- [ ] Revisar y confirmar únicamente los archivos de esta etapa.

### 3. Replicar estructura visual y navegación

**Mensaje:** `feat: portar estructura y navegacion a Vue`

**Archivos:** `src/vue/router.ts`, `src/vue/pages/{WeatherPage,AboutPage}.vue`,
`src/vue/components/site/`, `src/vue/styles/`, `src/vue/App.vue`.

- [ ] Portar estructura, navegación, pie, página informativa y recursos existentes; configurar `/`, `/sobre-nosotros` y fallback al inicio.
- [ ] Comprobar ambas rutas, carga directa y navegación con teclado en móvil y escritorio. Ejecutar typecheck y build.
- [ ] Confirmar la estructura sin incluir funciones todavía sin implementar.

### 4. Conectar búsqueda y clima actual

**Mensaje:** `feat: consultar y mostrar clima en Vue`

**Archivos:** `src/vue/models/`, `src/vue/api/climate.ts`, `src/vue/composables/useWeather.ts`,
`src/vue/components/{CitySearch,CurrentWeather,WeatherLoading}.vue`, `src/vue/pages/WeatherPage.vue`.

- [ ] Portar `WeatherQuery`, serialización y `readClimateResponse`; exponer búsqueda asíncrona contra `/api/v1/clima/` con el mismo contrato e idioma.
- [ ] Implementar estado de consulta, carga, error y resultado; cancelar o descartar consultas anteriores.
- [ ] Adaptar `e2e/weather.spec.ts` y el servidor Playwright a Vite; verificar éxito, error, respuesta inválida y respuestas fuera de orden con fixtures.
- [ ] Ejecutar typecheck, build y las pruebas de clima antes del commit.

### 5. Incorporar pronóstico, detalles y unidades

**Mensaje:** `feat: portar pronostico y unidades de temperatura`

**Archivos:** `src/vue/components/{Forecast,TemperatureChart,WeatherDetails,WeatherIcon}.vue`,
`src/vue/composables/useTemperatureUnit.ts` y `src/vue/pages/WeatherPage.vue`.

- [ ] Reutilizar cálculos de temperatura y portarlos con los componentes; compartir unidad reactiva entre clima, detalles y pronóstico.
- [ ] Verificar con fixtures conversión Celsius/Fahrenheit, fechas UTC con zona del lugar consultado, pronóstico ausente y campos nulos.
- [ ] Ejecutar typecheck, build y los casos de clima pertinentes; confirmar la etapa.

### 6. Incorporar ubicación y favoritos

**Mensaje:** `feat: portar ubicacion y ciudades favoritas`

**Archivos:** `src/vue/composables/{useCurrentLocation,useFavoritePlaces}.ts`,
`src/vue/api/placeSuggestions.ts`, `src/vue/components/{CitySearch,WeatherSidebar}.vue`.

- [ ] Portar sugerencias, geolocalización y favoritos; conservar formato y claves persistidas existentes.
- [ ] Verificar alta/baja de favoritos, recarga, sugerencias canceladas, permiso denegado y almacenamiento no disponible; mantener búsqueda manual operativa.
- [ ] Ejecutar typecheck, build y los casos de búsqueda/favoritos; confirmar la etapa.

### 7. Incorporar idiomas y temas

**Mensaje:** `feat: portar idiomas y temas a composables Vue`

**Archivos:** `src/vue/composables/{useLanguage,useColorTheme}.ts`,
`src/vue/models/translations.ts`, `src/vue/components/{LanguageToggle,ThemeToggle}.vue`,
componentes anteriores que consumen traducciones y `src/vue/api/climate.ts`.

- [ ] Portar catálogo y preferencias; actualizar textos, atributos de idioma y parámetro `idioma` sin estados duplicados.
- [ ] Adaptar `e2e/language.spec.ts` y `e2e/theme-reveal.spec.ts`; verificar persistencia, cambio de idioma y movimiento reducido.
- [ ] Ejecutar typecheck, build y ambas suites antes del commit.

### 8. Incorporar mapa, alertas e información climática

**Mensaje:** `feat: portar mapa meteorologico y alertas`

**Archivos:** `src/vue/components/{WeatherMap,WeatherMapLegend,WeatherAlerts,EmergencyContacts,ClimateAwareness}.vue`,
`src/vue/api/{weatherAlerts,mapPoint}.ts`, `src/vue/models/weatherAlerts.ts`.

- [ ] Comparar el mapa de Angular con sus cambios locales actuales antes de portar capas, leyenda y consulta por punto.
- [ ] Portar Leaflet con limpieza de listeners y mapa al desmontar; conservar atribución, alertas, contactos por país y contenido climático.
- [ ] Adaptar suites `weather-map`, `alerts`, `emergency-contacts` y `climate-awareness`; verificar capas, selección de ubicación, falta de datos y país sin contactos.
- [ ] Ejecutar typecheck, build y esas suites antes del commit.

### 9. Incorporar recomendaciones, voz y animación de Isa

**Mensaje:** `feat: portar recomendaciones y reproduccion de Isa`

**Archivos:** `src/vue/components/Isabel.vue`, `src/vue/composables/{useIsa,useIsaVoice}.ts`,
`src/vue/assistant/`; reutilizar manifiestos y recursos de `public/isa-bot/`.

- [ ] Portar recomendaciones y lógica independiente de reproducción, streaming, sincronización y animación; reemplazar lifecycle Angular por Vue.
- [ ] Liberar audio, peticiones y temporizadores al cambiar de consulta o desmontar; conservar saludo y consejo en una pista cuando corresponda.
- [ ] Adaptar suites `isabel`, `isa-stream` e `isa-playback`; verificar autoplay bloqueado, reproducción manual, cancelación e idiomas.
- [ ] Ejecutar typecheck, build y esas suites antes del commit.

### 10. Cerrar paridad y documentar la versión Vue

**Mensaje:** `refactor: finalizar migracion Vue y documentar ejecucion`

**Archivos:** `README.md`, `package.json`, `package-lock.json`, configuración de despliegue,
`playwright.config.ts`, `e2e/`, `src/app/`, entradas y configuración Angular obsoletas.

- [ ] Revisar cada función de la especificación contra Vue; resolver regresiones de móvil, teclado, rutas y preferencias.
- [ ] Retirar código y dependencias Angular cuando Vue ya no los use; actualizar README con instalación, ejecución, validación y relación entre ramas.
- [ ] Ejecutar instalación reproducible con `npm ci`, typecheck, build y toda la suite E2E en los tres tamaños configurados; registrar limitaciones de cualquier prueba manual pendiente.
- [ ] Revisar diff y confirmar; verificar diez commits desde `9f8e059` con `git rev-list --count 9f8e059..vuejs`.

## Ritmo de trabajo

No ejecutar las etapas 2–10 en esta sesión. Al retomar, revisar el estado real,
implementar la siguiente etapa y validar su entrega antes de confirmarla.
Actualizar este plan en el commit de la etapa correspondiente. No crear commits
adicionales solo para marcar casillas ni comprimir el historial con squash.

## Registro de ejecuci?n

- 1: documentaci?n publicada como `1ff5c03`.
- 2: entrada Vue, Vite, TypeScript y configuraci?n p?blica mediante allowlist. `npm run build` y `npm run typecheck`: correctos.
- 3: componentes SFC, estilos, rutas y shell adaptable. Build correcto; prueba Chromium de menu movil y navegacion a /sobre-nosotros sin errores de pagina.
