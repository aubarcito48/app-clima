# Clima Inteligente

Frontend Angular para consultar el clima de una ciudad y mostrar recomendaciones de IA basadas en esos datos. Angular consultará a Django; Django se encargará de OpenWeather y Groq.

## Estado

TK04: búsqueda con formulario reactivo, ciudad obligatoria, país opcional, normalización y codificación de parámetros. Los errores permiten corregir la entrada o precisar una ciudad ambigua. Se mantiene la interfaz responsive de TK03. Todavía no hay consultas HTTP ni integración con proveedores.

## Explorar la demo

Al abrir la aplicación se muestra el estado inicial. Elegir Córdoba, Buenos Aires o Mendoza, o usar «Ver ejemplo de Córdoba», para recorrer una carga simulada de un segundo y el resultado. También se puede escribir una de esas ciudades y enviar el formulario; para los ejemplos argentinos se admite AR o Argentina. El país es opcional salvo que sea necesario precisar una ubicación ambigua.

Los valores, fechas y consejos son ejemplos fijos identificados como datos ficticios. No representan el clima actual ni son generados con IA. Si se escribe otra ciudad, la vista explica las opciones disponibles sin inventar un resultado. «Volver al inicio» permite revisar nuevamente el estado inicial.

La conexión HTTP corresponde a TK05. El modelo de presentación y los errores de la demo no fijan el contrato de Django.

## Búsqueda y validación

El formulario usa Reactive Forms, disponible en la versión Angular 21 del proyecto. La ciudad no puede estar vacía ni contener únicamente espacios, tabulaciones o saltos de línea. Una entrada inválida muestra un mensaje junto al formulario y lleva el foco a la ciudad; no emite la consulta ni inicia la carga simulada.

Al enviar se recortan los espacios exteriores y se reducen los espacios interiores repetidos. Los códigos de país de dos letras se pasan a mayúsculas. Los campos conservan la entrada original, incluso cuando la respuesta informa un error. No se restringen los nombres de ciudad a letras ASCII.

Los parámetros se serializan mediante `URLSearchParams`, sin concatenar texto sin codificar. Por ejemplo, ciudad ` Córdoba ` y país ` ar ` producen `ciudad=C%C3%B3rdoba&pais=AR`; si no hay país se omite `pais`. La demo consume esos mismos parámetros codificados. El envío HTTP y la adaptación del contrato real de Django se implementarán en TK05.

| Cómo probar | Resultado esperado |
| --- | --- |
| Ciudad vacía o solo espacios | Mensaje de validación y ninguna búsqueda. |
| `  Buenos   Aires  `, país ` ar ` | Se consulta el ejemplo de Buenos Aires con AR; los campos conservan lo escrito. |
| `Mendoza`, sin país | Resultado de ejemplo sin exigir país. |
| `Córdoba`, sin país | Respuesta ambigua simulada: foco en país y opciones AR/ES para precisar. |
| Elegir «Córdoba, Argentina (AR)» o escribir AR y reenviar | Resultado de Córdoba sin borrar la ciudad. |
| Elegir España o escribir una ciudad fuera de los ejemplos | Aviso de datos no disponibles en la demo; no se inventa clima. |
| `Ciudad inexistente` | Error de ciudad no encontrada simulado; foco en ciudad y entrada conservada para corregir. |

Los errores anteriores se retiran al editar la consulta. Durante la carga, los campos quedan de solo lectura y se deshabilita un nuevo envío. Las respuestas de ciudad ambigua e inexistente son fixtures locales para verificar la interacción, no respuestas HTTP de un backend real.

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

La página principal está en `pages/weather`. `shared` contiene los componentes de búsqueda, clima actual, pronóstico, recomendación, iconos y carga. `models/weather-preview.ts` contiene los tipos de presentación; los ejemplos fijos están en `pages/weather/weather-demo.ts`. `service` permanece reservado para la futura integración HTTP.

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

## Verificación de TK03

Verificado el 24 de octubre de 2026 con Node 24.13.1, npm 11.10.0 y Chromium 156.0.8078.4:

- Vista inicial, carga y resultados revisados a 360, 768 y 1440 px sin desbordamiento horizontal ni controles fuera del viewport (CP10, alcance de TK03).
- Regiones con títulos y formulario etiquetado, enlace de salto al contenido, foco visible, estado anunciable y animaciones desactivadas al preferir movimiento reducido.
- Revisión automática con axe de estados inicial y de resultado sin infracciones detectadas en las reglas WCAG 2 A/AA y 2.1 AA ejecutadas. Esto no sustituye una auditoría manual completa de accesibilidad (CP11 continúa en las tareas posteriores).
- Ejemplos coherentes entre clima y consejo, cuatro intervalos, cambio de ciudad, retorno al inicio y aviso para ciudades fuera de la demo comprobados en navegador, sin solicitudes a proveedores ni errores de ejecución.
- Siete pruebas de Angular aprobadas y build de producción completado. Las pruebas cubren entrada a la página, estado inicial, carga, resultado, separación de ejemplos, cancelación y limitaciones de la demo.

Las herramientas de revisión visual se ejecutaron de forma temporal y no agregan dependencias a la aplicación. No se implementaron Django, Groq ni OpenWeather en esta tarea.

## Verificación de TK04

Verificado el 24 de octubre de 2026 con Node 24.13.1, npm 11.10.0 y Chromium 156.0.8078.4:

- CP01: ciudad vacía, espacios y espacios Unicode no emiten consulta ni inician la carga; se muestran validación y foco en ciudad.
- CP02: normalización de ciudad/país, país opcional y codificación de acentos y caracteres reservados verificados con pruebas unitarias y el transporte local de la demo. El envío HTTP real se verificará en TK05.
- CP03: respuestas locales de ambigüedad y ciudad inexistente; precisión por país mediante teclado u opción sugerida, corrección sin perder la entrada y retiro de errores al editar. Los códigos HTTP reales de Django quedan pendientes de TK05.
- 24 pruebas de Angular aprobadas y build de producción completado.
- Estados de validación, país opcional, ambigüedad, ciudad no encontrada y búsqueda corregida revisados a 360, 768 y 1440 px, sin desbordamiento ni controles fuera del viewport.
- Revisión automática con axe de esos estados sin infracciones detectadas en las reglas WCAG 2 A/AA y 2.1 AA ejecutadas. Se verificaron el foco y el envío por teclado; no equivale a una auditoría completa de accesibilidad.
- Sin solicitudes a servicios externos ni errores de ejecución en los flujos revisados.

La evidencia corresponde al frontend con fixtures; no acredita que Django ya acepte estos parámetros o devuelva estos errores. No se crearon commits ni se publicaron cambios durante la implementación.
