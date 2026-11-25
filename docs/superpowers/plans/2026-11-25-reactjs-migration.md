# StitchWeather React Implementation Plan

> Ejecutar cada etapa de forma secuencial, validar su entrega, hacer commit y push antes de continuar. Autorización explícita del usuario: completar todo en trece commits.

**Goal:** Replicar StitchWeather con React y TypeScript para el portfolio.

**Architecture:** Componentes funcionales y hooks en `src/react/`, con el contrato Django existente. Reutilizar los recursos de `public/` y la lógica TypeScript independiente del framework. Conservar la identidad visual y la batería Playwright de la versión Vue como referencia de comportamiento.

**Tech Stack:** React, React DOM, React Router, TypeScript, Vite, Tailwind/CSS, Leaflet, RxJS para el motor de voz y Playwright. Verificar versiones compatibles al instalar.

**Spec:** `docs/superpowers/specs/2026-11-25-reactjs-design.md`

## Global Constraints

Base `136d773`, rama `reactjs`, worktree `../app-clima-reactjs`. Trece commits con push individual. Un trabajador para las pruebas; servidores limitados a cada ejecución. Mismo backend Django; ninguna clave privada en el frontend.

## Review Focus

Respuestas fuera de orden y cancelación (5, 7, 10, 11); permisos y almacenamiento bloqueados (4, 7, 8); datos parciales y ceros (5, 6, 9, 10); limpieza de mapas, listeners, audio y temporizadores (3, 10–12); teclado, rutas, móviles e idiomas (3, 4, 8, 13).

## Entregas

| # | Commit | Archivos y responsabilidades | Validación |
| --- | --- | --- | --- |
| 1 | `docs: planificar migracion React en trece etapas` | Especificación y plan. | Diff y base de rama. |
| 2 | `build: preparar React TypeScript y Vite` | `package.json`, lockfile, `vite.config.ts`, `tsconfig.react.json`, `index.html`, `src/react/main.tsx`, `App.tsx`. Entrada React y URL pública validada. | Typecheck y build. |
| 3 | `feat: portar estructura y navegacion a React` | `router.tsx`, páginas, componentes de sitio, sidebar, iconos y estilos. `/`, `/sobre-nosotros` y fallback. | Build y navegación con teclado/móvil. |
| 4 | `feat: incorporar idiomas y temas con hooks React` | `hooks/useLanguage.ts`, `useColorTheme.ts`, controles y catálogo. Estado compartido y persistencia. | Idiomas, storage bloqueado, tema del sistema y movimiento reducido. |
| 5 | `feat: consultar y presentar clima con React` | `api/http.ts`, `climate.ts`, `models/`, `hooks/useWeather.ts`, búsqueda y clima actual. Consultas cancelables, validación y errores. | Éxito, JSON inválido, reintento, datos nulos y respuesta antigua. |
| 6 | `feat: portar pronostico y graficos meteorologicos` | Forecast, TemperatureChart y WeatherDetails. Unidades compartidas, días e intervalos. | Unidades, cuarenta intervalos, fechas y métricas parciales. |
| 7 | `feat: incorporar sugerencias y geolocalizacion` | `api/placeSuggestions.ts`, `hooks/useCurrentLocation.ts`, CitySearch. Debounce, combobox e IME. | Teclado, sugerencias fuera de orden, permiso denegado y búsqueda manual. |
| 8 | `feat: guardar y consultar ciudades favoritas` | `hooks/useFavoritePlaces.ts`, sidebar y páginas. Persistencia y selección desde ambas rutas. | Alta/baja, recarga, almacenamiento bloqueado y coordenadas. |
| 9 | `feat: portar alertas oficiales y contactos utiles` | `api/weatherAlerts.ts`, WeatherAlerts, EmergencyContacts y directorio. | Fuentes por país, parciales, fallos, teclado y axe. |
| 10 | `feat: integrar mapa Leaflet y consultas por punto` | WeatherMap, WeatherMapLegend, capas y `api/mapPoint.ts`. | Teselas simuladas, zoom, capas, consulta/reintento y limpieza. |
| 11 | `feat: portar motor de voz y reproduccion de Isa` | `assistant/voice/`, motor independiente y hook suscrito a su estado. | Typecheck/build y estados de reproducción/cancelación. |
| 12 | `feat: integrar avatar de Isa y contenido animado` | Isabel, motor de retrato, manifiestos, ClimateAwareness y reveal. Una instancia persistente entre tamaños. | Suites de Isa y carrusel; audio bloqueado, idiomas y movimiento reducido. |
| 13 | `refactor: finalizar migracion React y documentar ejecucion` | Retirar Angular, actualizar README/VS Code/Vercel y cerrar paridad. | `npm ci`, tipos, build y suite completa con un trabajador; diff limpio y trece commits. |

## Interfaces

`searchClimate(query, language, signal)` devuelve `Promise<ClimateResponse>` validada.
`useWeather()` expone respuesta, presentación, carga, feedback y acciones de búsqueda,
cancelación y reintento. `useLanguage()` expone código, locale, traducción y setter;
`useColorTheme()` expone modo y toggle; `useFavoritePlaces()` expone lugares y acciones.
El estado mutable del motor de voz se suscribe mediante `useSyncExternalStore`.
Los componentes reciben datos por props y notifican acciones mediante callbacks;
los efectos deben liberar peticiones, listeners, mapas y temporizadores.

## Ejecución

- [x] 1: alcance y trece entregas documentados.
- [ ] 2–13: implementar y registrar evidencia en el commit correspondiente.

- 2: React 19, React DOM, React Router, TypeScript y Vite instalados; URL pública validada por allowlist. `npm run build` (incluye tipos): correcto.

- 3: Componentes funcionales, estilos existentes, sidebar adaptable y rutas de inicio/informacion con fallback. Build y tipos: correctos.

- 4: Preferencias compartidas mediante useSyncExternalStore; catalogo ES/EN y tema persistente. Doce pruebas de idiomas y temas aprobadas. Build y tipos: correctos.

- 5: API validada, hook de clima, cancelacion y busqueda. Doce pruebas de clima, datos invalidos y respuestas fuera de orden aprobadas. Build y tipos: correctos.

- 6: Pronostico por dias e intervalos, unidades y grafico SVG con temperatura, lluvia y viento. Veintiuna pruebas aprobadas en tres tamanos. Build y tipos: correctos.

- 7: Combobox accesible, debounce cancelable y geolocalizacion bajo permiso; dieciocho pruebas de sugerencias, teclado y permisos aprobadas. Build y tipos: correctos.

- 8: Favoritos persistentes, anuncios accesibles y consulta por coordenadas desde ambas rutas. Doce pruebas de favoritos y navegacion aprobadas. Build y tipos: correctos.
