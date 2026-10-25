# Clima Inteligente

Frontend Angular para consultar el clima de una ciudad y mostrar recomendaciones de IA basadas en esos datos. Angular consulta únicamente a Django; Django se encarga de OpenWeather y Groq.

## Estado

TK06: clima actual y pronóstico presentados con ubicación resuelta, unidades y fechas de la ciudad. Se distinguen la medición y la consulta, se muestra OpenWeather como fuente y se conservan todos los intervalos agrupados por fecha local. La conexión HTTP, validación del contrato y cancelación de búsquedas anteriores de TK05 siguen vigentes.

## Consultar el clima

Al abrir la aplicación se muestra el estado inicial sin solicitudes automáticas. Escribir una ciudad o elegir Córdoba, Buenos Aires o Mendoza realiza una búsqueda en Django. Las sugerencias completan país AR, pero no contienen mediciones ni consejos locales. La demora simulada y los fixtures de la demo fueron retirados del flujo de aplicación; el fixture del contrato existe únicamente para las pruebas.

Para obtener información real, Django debe estar iniciado y tener configurada su clave privada de OpenWeather. Groq necesita clave y modelo habilitado en el backend; si falta o falla, la respuesta puede conservar el clima con IA no disponible. No se configuraron ni consumieron cuentas externas durante TK05. «Volver al inicio» cancela una solicitud pendiente y limpia el resultado.

El modelo `ClimateResponse` reproduce los cinco bloques del contrato v1: `ubicacion`, `actual`, `pronostico`, `recomendacion` y `meta`. El servicio lee JSON como `unknown` y comprueba tipos, fechas UTC, unidades y estados parciales antes de adaptarlo al modelo visual. Campos meteorológicos opcionales omitidos o null se conservan como ausencia; una respuesta sin datos obligatorios se rechaza con un aviso, sin fabricar mediciones. TK06 completa la presentación meteorológica; la revisión específica de consejos continúa en TK07.

## Clima y fechas de la ciudad

La tarjeta de clima muestra el nombre resuelto por Django, región cuando exista y código de país. Temperatura y sensación térmica se expresan en °C, humedad en % y viento en km/h. Angular conserva los números recibidos: no vuelve a convertir el viento ni reemplaza ceros por ausencia. Sensación térmica, humedad, viento y descripción ausentes muestran «No disponible» o «Descripción no disponible», sin agregar unidades a un dato inexistente. No se asigna un icono de condición arbitrario cuando el contrato no lo proporciona.

«Medición del…» corresponde a `actual.fecha_utc`; «Consultado el…» corresponde a `meta.consultado_en_utc`. Una consulta reciente no cambia la fecha de la medición. Los elementos `time` conservan el timestamp UTC original en `datetime`, mientras su texto usa el desplazamiento horario de `ubicacion.desplazamiento_horario_segundos`. La fuente procede de `meta.fuente_meteorologica`.

La conversión es independiente de la zona horaria del navegador: se aplica el desplazamiento a cada instante y se formatea con `Intl.DateTimeFormat` en UTC para evitar aplicar otra zona por segunda vez. Se muestra el desplazamiento explícito, por ejemplo UTC−03:00 o UTC+05:45. El contrato entrega un offset, no una zona IANA; se usa ese mismo offset para todos los intervalos, sin inventar cambios futuros de horario de verano.

El pronóstico conserva cada intervalo suministrado por Django, con su temperatura, descripción y hora. Se agrupa visualmente por fecha local, incluyendo el año cuando el rango cruza de diciembre a enero. Agrupar no calcula promedios, mínimos ni máximos diarios y no recorta los 40 intervalos admitidos por el contrato. Cada elemento se identifica por su timestamp UTC. Si el pronóstico no está disponible, se muestra un aviso sin lista vacía ni horarios de reemplazo y el clima actual permanece visible.

## Búsqueda y validación

El formulario usa Reactive Forms en Angular 21. La ciudad es obligatoria; ciudad y región admiten hasta 100 caracteres después de normalizar. Los campos conservan la entrada original. El país es opcional y debe ser un código ASCII de dos letras, como AR o ES; nombres como Argentina ya no se envían al backend. Una entrada inválida muestra un mensaje y no emite la consulta.

Al enviar se normaliza Unicode NFC, se recortan espacios exteriores, se reducen espacios interiores y se convierte el código de país a mayúsculas. Los nombres de ciudad y región conservan acentos y caracteres Unicode. En un 409 se pueden elegir candidatos con nombre, país y región, incluso cuando comparten país. Se envían esos filtros, sin elegir coordenadas arbitrariamente en el frontend.

`URLSearchParams` identifica consultas normalizadas y `HttpParams` codifica los valores para el GET. El servicio construye `HttpParams` desde los valores decodificados, conservando espacios y el carácter `+` sin doble codificación. Se omiten país y región vacíos. Ejemplo: `GET /api/v1/clima/?ciudad=C%C3%B3rdoba&pais=AR&region=C%C3%B3rdoba`.

| Cómo probar | Resultado esperado |
| --- | --- |
| Ciudad vacía o solo espacios | Mensaje de validación y ninguna búsqueda. |
| `  Buenos   Aires  `, país ` ar ` | Un GET con Buenos Aires y AR; los campos conservan lo escrito. |
| País `Argentina` | Validación local: indicar un código de dos letras. |
| Ciudad sin país ni región | Se omiten ambos filtros; Django determina si existe una ubicación inequívoca. |
| Respuesta 409 | Candidatos para precisar ubicación; se puede seleccionar país y región juntos. |
| Respuesta 404, 429 o 503 | Aviso recuperable sin conservar un resultado de otra ciudad como si fuera el nuevo. |
| Clima válido con IA o pronóstico no disponibles | El clima sigue visible; se indica la ausencia del bloque correspondiente. |
| Nueva búsqueda mientras otra está pendiente | Se cancela la anterior y solo se aplica el resultado de la última consulta. |

Los errores se retiran al editar o reenviar. El formulario permanece editable durante la carga para permitir una nueva búsqueda. Una consulta idéntica pendiente no inicia otro GET; al finalizar se permite reenviar explícitamente. `switchMap` cancela la suscripción anterior y `takeUntilDestroyed` cancela al salir de la página. Se limpian los datos de la consulta anterior al comenzar otra; un error no termina el flujo de búsquedas. No hay caché ni reintentos automáticos. Cada GET tiene un timeout de cliente de 45 segundos; cancelar en el navegador no garantiza cancelar trabajo ya recibido por Django/proveedores.

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
cp .env.example .env
npm start
```

Abrir http://localhost:4200. No es necesario ejecutar Django para ver la pantalla inicial.

En PowerShell también podés copiar la plantilla con `Copy-Item .env.example .env`. El `.env` local queda ignorado por Git; `.env.example` sí se versiona y no contiene claves.

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
src/app/testing     Fixtures ficticios usados únicamente por las pruebas
src/environments    Configuración pública por entorno
```

La página principal está en `pages/weather`. `shared` contiene los componentes de búsqueda, clima actual, pronóstico, recomendación, iconos y carga. `models/weather-preview.ts` contiene los tipos de presentación; los ejemplos fijos están en `pages/weather/weather-demo.ts`. `service` permanece reservado para la futura integración HTTP.

## Entornos

| Configuración | Archivo | apiBaseUrl |
| --- | --- | --- |
| Desarrollo | `src/environments/environment.development.ts` | `http://localhost:8000` |
| Producción | `src/environments/environment.ts` | `https://api-clima.example.invalid` (marcador sin servicio real) |

Configurar `PUBLIC_API_BASE_URL_DEVELOPMENT` y `PUBLIC_API_BASE_URL_PRODUCTION` en `.env`. Antes de integrar o publicar, reemplazar el marcador de producción por la URL HTTPS real de Django en Render y recompilar. La base no incluye `/api/v1/clima/`; ese endpoint se incorporará al implementar el servicio en TK05.

Los scripts `start`, `build`, `build:dev`, `watch` y `test` ejecutan primero `scripts/configure-env.mjs`. Ese script genera los dos archivos de entorno usando exclusivamente esas dos variables públicas. Las variables del sistema o del hosting tienen prioridad sobre `.env`; sin `.env` se usan los valores públicos de ejemplo. No se agregan dependencias para leer el archivo.

Los archivos TypeScript de entorno se conservan versionados porque solo contienen configuración pública. No editarlos para guardar claves: se regeneran al ejecutar los scripts. Cambiar `.env` requiere reiniciar el servidor o recompilar. Si usás el CLI directamente, ejecutar antes `npm run env:configure`.

Angular CLI sustituye el archivo de entorno en desarrollo mediante `fileReplacements`. Para consumirlo se importa siempre `environment` desde `src/environments/environment.ts`, con la ruta relativa que corresponda. Consultar [entornos de Angular](https://angular.dev/tools/cli/environments).

Estos valores son públicos y se incluyen en el navegador. No colocar claves de Groq, OpenWeather ni secretos aquí ni en archivos `.env` del frontend.

Las API keys se guardarán en el `.env` de Django o en las variables privadas de Render al trabajar en el backend. No se necesita ninguna clave de proveedor para ejecutar este frontend. Un `.env` ignorado protege contra subir ese archivo a Git, pero no vuelve secreto un valor incluido en el JavaScript del navegador.

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

## Verificación de TK05

Verificado el 24 de octubre de 2026 con Angular 21.2.25, Node 24.13.1, npm 11.10.0 y Chromium 156.0.8078.4:

- CP02: GET al host de `apiBaseUrl` con barra final y parámetros ciudad/país/región codificados; acentos, espacios, `&`, `+`, `#` y caracteres reservados conservados. Ninguna llamada de Angular a OpenWeather o Groq, sin API keys ni cabeceras de autorización del proveedor.
- CP08: validación del JSON recibido; valores cero y negativos conservados, ausencia de campos opcionales representada como no disponible, sin `undefined` ni `NaN` en la vista. Clima visible cuando faltan pronóstico o IA. Datos obligatorios o unidades inválidos provocan un aviso, no un resultado fabricado.
- CP12: consulta idéntica pendiente deduplicada; una nueva consulta cancela la anterior y la respuesta cancelada no puede sobrescribir la última ciudad. Reset y destrucción cancelan la solicitud; tras un error se puede volver a consultar.
- **37 pruebas aprobadas** con `npm test -- --watch=false`, usando `HttpTestingController` sin red externa. Incluyen 409 con regiones del mismo país, corrección de filtros, JSON inválido y texto de IA renderizado literalmente sin ejecutar HTML.
- Recorrido real en Chromium: Angular → HTTP → Django WSGI con servicios y SDK reales, transportes de proveedores simulados y claves ficticias. Se redirigió únicamente el destino del GET hacia un servidor temporal de QA, sin cambiar el `.env` de Angular ni el backend de desarrollo. Comprobados validación local, éxito con temperatura cero, ambos bloques opcionales ausentes, ambigüedad/refinamiento, 503 y recuperación. Esta evidencia no acredita cuentas ni datos meteorológicos reales.
- Revisión a 360, 768 y 1440 px: sin desbordamiento horizontal ni errores de ejecución. Axe no detectó infracciones en las reglas WCAG 2 A/AA y 2.1 AA ejecutadas sobre el resultado; no sustituye la revisión completa prevista en TK08.
- Builds de producción y desarrollo completados. Documentación y cambios revisados sin crear commit ni desplegar.

Para usarlo localmente, mantener Django en el host configurado mediante `PUBLIC_API_BASE_URL_DEVELOPMENT` (por defecto `http://localhost:8000`), permitir el origen Angular en CORS y completar las claves solo en el backend. La pantalla inicial no necesita Django, pero buscar una ciudad sí. La URL de producción sigue siendo un placeholder hasta publicar el backend en Render. TK06 y TK07 continúan pendientes como tareas de presentación; no se modificaron el backend, sus claves ni los documentos originales.

## Verificación de TK06

Verificado el 24 de octubre de 2026 (America/Buenos_Aires), con Angular 21.2.25, Node 24.13.1, npm 11.10.0 y Chromium 156.0.8078.4. Se conservaron Tailwind, la tipografía y la paleta existentes; se aplicaron las skills Angular/Google y frontend-design de Anthropic a la presentación.

- CP04: ubicación resuelta, fuente, unidades y valores recibidos sin conversiones adicionales. Temperatura cero, sensación negativa, humedad cero y viento decimal comprobados; nulls indicados como no disponibles y sin iconos meteorológicos inventados.
- CP05: se conservan los 40 intervalos y sus temperaturas, agrupados por fecha local. Cruce de medianoche y de año verificados sin promedios diarios ni modificación del payload original. Pronóstico ausente comunicado sin fabricar intervalos ni retirar el clima.
- CP06: fecha de medición y fecha de consulta separadas; `datetime` UTC original y texto local coherentes. Probados offsets cero, negativo, de media hora y de 45 minutos. Un navegador configurado en Asia/Tokyo mostró correctamente los datos de una ciudad con UTC−03:00.
- **49 pruebas aprobadas** mediante `npm test -- --watch=false`; 12 casos nuevos de adaptación y renderizado. Build de producción completado.
- Chromium a 360, 768 y 1440 px: revisados valores, ambas fechas, agrupación de 40 intervalos, cambio de año y estados sin datos. Sin desbordamiento horizontal ni errores de ejecución. Axe no detectó infracciones en las reglas WCAG 2 A/AA y 2.1 AA ejecutadas sobre el resultado; no equivale a una auditoría completa.
- La comprobación visual usó respuestas HTTP simuladas del contrato, sin consultas a Django ni a proveedores reales. No se modificaron claves, `.env`, backend, dependencias ni documentos originales; sin commit ni despliegue. TK07 continúa pendiente para la presentación específica de recomendaciones.
