# Clima Inteligente

Frontend Angular para consultar el clima de una ciudad y mostrar recomendaciones de IA basadas en esos datos. Angular consultará a Django; Django se encargará de OpenWeather y Groq.

## Estado

TK02: base Angular con TypeScript estricto, componentes standalone, routing, SCSS y Tailwind CSS 4. La pantalla inicial es provisional; el diseño y los componentes de clima corresponden a TK03. Todavía no hay consultas HTTP ni integración con proveedores.

## Convenciones acordadas

- En proyectos nuevos se usará CSS, no SCSS. Este proyecto conserva SCSS por decisión del usuario.
- Trabajar con Tailwind CSS. La entrada global `src/tailwind.css` se procesa con `@tailwindcss/postcss` y convive con `src/styles.scss`.
- Al crear proyectos, revisar `rootDir` explícito en las configuraciones de aplicación y pruebas. Aquí ambos usan `./src`.
- Al finalizar cada TK, entregar un mensaje de commit listo para copiar.

Sin base de datos, cuentas, historial persistente, dashboard ni administración. El backend se desarrolla por separado.

## Requisitos

- Node.js 24.13.1 y npm 11.10.0 usados en la configuración inicial.
- Angular 21.2.25, Angular CLI 21.2.28, TypeScript 5.9.3 y RxJS 7.8.2 instalados.
- El lockfile registra las versiones exactas instaladas. No hace falta un CLI global: los scripts usan el del proyecto.

Compatibilidad: [tabla oficial de Angular](https://angular.dev/reference/versions).

Se fija `undici` 7.30.1 para `@angular/build` mediante `overrides`, corrigiendo los avisos de la versión transitiva original sin cambiar la versión mayor de Angular. La instalación final reportó cero vulnerabilidades.

## Ejecución local

Desde la carpeta `app-clima`:

```sh
npm ci
npm start
```

Abrir http://localhost:4200. No es necesario ejecutar Django para ver la pantalla inicial.

```sh
npm run build
npm run build:dev
npm test -- --watch=false
```

`npm run build` usa producción y genera `dist/app-clima/browser`. `npm run build:dev` compila con configuración de desarrollo. `npm run watch` mantiene el build de desarrollo activo.

## Organización

```text
src/app/pages       Páginas de la aplicación
src/app/shared      Componentes reutilizables
src/app/models      Modelos TypeScript
src/app/service     Servicios de acceso a Django
src/environments    Configuración pública por entorno
```

Las cuatro carpetas se conservan con `.gitkeep` hasta implementar sus contenidos en las tareas siguientes.

## Entornos

| Configuración | Archivo | apiBaseUrl |
| --- | --- | --- |
| Desarrollo | `src/environments/environment.development.ts` | `http://localhost:8000` |
| Producción | `src/environments/environment.ts` | `https://api-clima.example.invalid` (marcador sin servicio real) |

Antes de integrar o publicar, reemplazar el marcador por la URL HTTPS real de Django en Render y recompilar. La base no incluye `/api/v1/clima/`; ese endpoint se incorporará al implementar el servicio en TK05.

Angular CLI sustituye el archivo de entorno en desarrollo mediante `fileReplacements`. Para consumirlo se importa siempre `environment` desde `src/environments/environment.ts`, con la ruta relativa que corresponda. Consultar [entornos de Angular](https://angular.dev/tools/cli/environments).

Estos valores son públicos y se incluyen en el navegador. No colocar claves de Groq, OpenWeather ni secretos aquí ni en archivos `.env` del frontend.

## Verificación de TK02

Verificado el 24 de octubre de 2026 con Node 24.13.1 y npm 11.10.0:

- Build de producción y de desarrollo completados.
- Dos pruebas base de Angular aprobadas.
- Servidor local iniciado; respuesta HTTP 200 y componente inicial servido correctamente.
- Entornos con URL pública únicamente, sin claves de proveedores.

Esto no acredita integración con Django ni pruebas de clima; esas actividades pertenecen a tareas posteriores.
