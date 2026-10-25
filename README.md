# StitchWeather

Frontend Angular para consultar el clima de una ciudad y mostrar recomendaciones de IA basadas en esos datos. Angular consulta únicamente a Django; Django se encarga de OpenWeather y Groq.

## Estado

Ajustes posteriores a TK09: buscador único con sugerencias dinámicas y botón «Usar mi ubicación». Se retiraron «Probá con» y las ciudades fijas. Desde tres letras y tras una pausa de 300 ms se buscan lugares; al elegir uno se consulta el clima sin un botón adicional. Enter permite buscar el texto escrito. Pasan 80 pruebas unitarias y 48 E2E; la publicación sigue pendiente en TK10.

## Diseño visual

El diseño de `../diseno-app-clima-stitch` se trasladó desde su maqueta React/Next a componentes Angular 21, conservando Tailwind CSS v4. Se mantienen la barra lateral celeste, el logo **StitchWeather / Tu clima, más azul**, las superficies blancas, la tarjeta azul de clima actual y las métricas separadas. La navegación enlaza a las secciones funcionales de pronóstico, días y horas, consejo de IA y música. No se incorporan los valores ficticios de la maqueta ni sus controles sin funcionalidad.

La paleta usa azul océano `#246b91`, tinta `#123952`, fondo `#eefaff`, celeste `#d9f5fb` y acentos coral y tropicales. Los tokens están en `src/tailwind.css`; los títulos usan Trebuchet MS y el texto Segoe UI/system-ui. Las ilustraciones y el favicon son SVG locales. No se agregaron React, Next, shadcn ni bibliotecas de gráficos.

Componentes nuevos: `WeatherSidebar` (marca y navegación), `WeatherMusic` (selección y reproductor Spotify) y `TemperatureChart` (gráfico SVG de líneas). Se conservan el buscador con sugerencias reales, la ubicación actual, la cancelación de consultas y los estados de error y disponibilidad parcial. Se verificaron 360, 768 y 1440 px, teclado y accesibilidad WCAG A/AA con axe.

## Días, horas y evolución

El pronóstico agrupa los intervalos por fecha **local de la ciudad**, incluyendo cambios de mes y año. Elegir un día actualiza sus tarjetas por hora y el gráfico de líneas. «Ver todos los intervalos» permite recorrer la respuesta completa (hasta 40 valores), sin hacer otra consulta. Una nueva búsqueda reinicia la selección.

El servicio actual entrega intervalos de **tres horas**, no mediciones de cada hora. No se inventan puntos intermedios. El gráfico respeta la distancia temporal de las observaciones, admite temperaturas negativas, cero, constantes y un único punto, y ofrece los mismos valores como texto en las tarjetas. En pantallas angostas su región se puede desplazar horizontalmente por teclado o tacto.

El rango de cada fecha es el menor y mayor valor de sus intervalos disponibles; no se presenta como un extremo diario completo ni como un promedio. Una fecha inicial o final puede estar incompleta. Los iconos proceden del código opcional de OpenWeather, sin deducirlos de la temperatura. La probabilidad de lluvia aparece cuando el backend la incluye. Amanecer y atardecer usan la hora local; los datos ausentes dicen «No disponible».

## Música con Spotify

La selección usa reglas locales sobre el clima actual: lluvia, tormenta, nieve o temperatura inferior a 15 °C proponen **Peaceful Piano**; desde 24 °C se propone **Mood Booster**; el resto, **Chill Hits**. Es una selección de playlists fijas, independiente del mensaje generado con IA. Los IDs están en `weather-music.ts`.

«Cargar reproductor de Spotify» incorpora el [embed oficial de Spotify](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed). Hasta pulsarlo no hay conexiones a Spotify. No requiere guardar credenciales ni agregar una API key de Spotify. Se puede cerrar el reproductor o abrir la playlist en Spotify; una nueva consulta elimina el reproductor anterior. El audio no se inicia automáticamente y su disponibilidad, reproducción completa o previa y sesión dependen de Spotify. Las pruebas interceptan el embed: verifican la integración, no la reproducción real ni la disponibilidad del catálogo.

## Consultar el clima

Al abrir la aplicación no se consulta clima ni se pide ubicación. Al escribir al menos tres caracteres se solicita una lista de hasta cinco lugares coincidentes tras 300 ms sin cambios. Cada opción muestra nombre, región cuando exista y país. Seleccionar una opción consulta el clima inmediatamente usando sus coordenadas; Enter sin una opción activa consulta el nombre escrito. No se consulta clima ni IA por cada prefijo. Los datos ficticios existen únicamente en las pruebas.

Para obtener información real, Django debe estar iniciado y tener configurada su clave privada de OpenWeather. Groq necesita clave y modelo habilitado en el backend; si falta o falla, la respuesta puede conservar el clima con IA no disponible. No se configuraron ni consumieron cuentas externas durante TK05. «Volver al inicio» cancela una solicitud pendiente y limpia el resultado.

El modelo `ClimateResponse` reproduce los cinco bloques del contrato v1: `ubicacion`, `actual`, `pronostico`, `recomendacion` y `meta`. El servicio lee JSON como `unknown` y comprueba tipos, fechas UTC, unidades y estados parciales antes de adaptarlo al modelo visual. Campos meteorológicos opcionales omitidos o null se conservan como ausencia; una respuesta sin datos obligatorios se rechaza con un aviso, sin fabricar mediciones. TK06 completa la presentación meteorológica y TK07 la de recomendaciones.

## Recomendaciones de IA

La tarjeta usa `recomendacion.estado` y `recomendacion.texto` de la misma respuesta que el clima. Tanto el consejo disponible como su aviso de ausencia identifican ciudad, región cuando exista y país resueltos por Django. No se realizan peticiones separadas a Groq desde Angular ni se guardan consejos de búsquedas anteriores.

Si el estado es `disponible`, se muestra «Generado con IA» y el texto completo recibido. Se conservan saltos de línea, acentos y hasta los 600 caracteres aceptados por el contrato, con ajuste de palabras largas en móvil. El texto se asigna a `textContent`: HTML, scripts, Markdown y expresiones de plantilla se muestran literalmente, sin interpretarlos. Se retiraron el encabezado genérico y la lista de sugerencias de la antigua demo del modelo de consejo.

Si el estado es `no_disponible`, se muestra «No disponible» y un aviso; no se sustituye el consejo por uno inventado. El clima y el pronóstico que sí existan siguen visibles. Antes de una consulta no aparece una recomendación ficticia. Al iniciar otra búsqueda se retira el resultado anterior; la cancelación de TK05 impide que una respuesta tardía mezcle un consejo anterior con la nueva ubicación. Reenviar el formulario realiza una nueva consulta completa, sin reintentos automáticos exclusivos de IA.

## Clima y fechas de la ciudad

La tarjeta de clima muestra el nombre resuelto por Django, región cuando exista y código de país. Temperatura y sensación térmica se expresan en °C, humedad en % y viento en km/h. Angular conserva los números recibidos: no vuelve a convertir el viento ni reemplaza ceros por ausencia. Sensación térmica, humedad, viento y descripción ausentes muestran «No disponible» o «Descripción no disponible», sin agregar unidades a un dato inexistente. No se asigna un icono de condición arbitrario cuando el contrato no lo proporciona.

«Medición del…» corresponde a `actual.fecha_utc`; «Consultado el…» corresponde a `meta.consultado_en_utc`. Una consulta reciente no cambia la fecha de la medición. Los elementos `time` conservan el timestamp UTC original en `datetime`, mientras su texto usa el desplazamiento horario de `ubicacion.desplazamiento_horario_segundos`. La fuente procede de `meta.fuente_meteorologica`.

La conversión es independiente de la zona horaria del navegador: se aplica el desplazamiento a cada instante y se formatea con `Intl.DateTimeFormat` en UTC para evitar aplicar otra zona por segunda vez. Se muestra el desplazamiento explícito, por ejemplo UTC−03:00 o UTC+05:45. El contrato entrega un offset, no una zona IANA; se usa ese mismo offset para todos los intervalos, sin inventar cambios futuros de horario de verano.

El pronóstico conserva cada intervalo suministrado por Django, con su temperatura, descripción y hora. Se agrupa visualmente por fecha local, incluyendo el año cuando el rango cruza de diciembre a enero. Agrupar no calcula promedios, mínimos ni máximos diarios y no recorta los 40 intervalos admitidos por el contrato. Cada elemento se identifica por su timestamp UTC. Si el pronóstico no está disponible, se muestra un aviso sin lista vacía ni horarios de reemplazo y el clima actual permanece visible.

## Búsqueda y validación

El formulario usa Reactive Forms en Angular 21 y tiene un único campo «Ciudad, región o provincia». Se puede escribir solo el lugar (`Mendoza`, `Tucumán`) o precisar con comas: `Córdoba, Córdoba, AR`. La primera parte se envía como `ciudad`, una segunda parte como `region`, y un último código ASCII de dos letras como `pais`. `Mendoza, AR` omite región. No se infieren códigos a partir de nombres de países ni se elige silenciosamente un candidato ambiguo.

Se normalizan Unicode NFC, espacios y código de país sin reescribir lo que se está tecleando. Cada nombre admite hasta 100 caracteres y una coma final incompleta no inicia peticiones. No se consulta durante composición IME. En un 409, seleccionar un candidato completa el mismo campo con nombre, región y país y consulta inmediatamente.

`URLSearchParams` identifica consultas normalizadas y `HttpParams` codifica los valores para el GET. El servicio construye `HttpParams` desde los valores decodificados, conservando espacios y el carácter `+` sin doble codificación. Se omiten país y región vacíos. Ejemplo: `GET /api/v1/clima/?ciudad=C%C3%B3rdoba&pais=AR&region=C%C3%B3rdoba`.

| Cómo probar                                     | Resultado esperado                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Ciudad vacía o solo espacios                    | Mensaje de validación y ninguna búsqueda.                                           |
| Escribir `Cor`                                  | Lista dinámica de lugares que coinciden; elegir uno consulta su clima.              |
| ` Buenos   Aires , ar` y Enter                  | Un GET de clima con Buenos Aires y AR, desde un solo campo.                         |
| `Córdoba, Córdoba, AR` y Enter                  | Ciudad Córdoba, región Córdoba y país AR.                                           |
| Ciudad sin país ni región                       | Se omiten ambos filtros; Django determina si existe una ubicación inequívoca.       |
| Respuesta 409                                   | Candidatos para precisar ubicación; se puede seleccionar país y región juntos.      |
| Respuesta 404, 429 o 503                        | Aviso recuperable sin conservar un resultado de otra ciudad como si fuera el nuevo. |
| Clima válido con IA o pronóstico no disponibles | El clima sigue visible; se indica la ausencia del bloque correspondiente.           |
| Nueva búsqueda mientras otra está pendiente     | Se cancela la anterior y solo se aplica el resultado de la última consulta.         |

Los errores se retiran al editar o reenviar. El formulario permanece editable durante la carga para permitir una nueva búsqueda. Una consulta idéntica pendiente no inicia otro GET; al finalizar se permite reenviar explícitamente. `switchMap` cancela la suscripción anterior y `takeUntilDestroyed` cancela al salir de la página. Se limpian los datos de la consulta anterior al comenzar otra; un error no termina el flujo de búsquedas. No hay caché ni reintentos automáticos. Cada GET tiene un timeout de cliente de 45 segundos; cancelar en el navegador no garantiza cancelar trabajo ya recibido por Django/proveedores.

Al editar, se cancelan la consulta de clima, la localización y la búsqueda de sugerencias anteriores, y se retiran sus datos. Enter, seleccionar un lugar, «Usar mi ubicación» o cancelar interrumpen el temporizador y las sugerencias pendientes para no duplicar solicitudes ni mostrar una lista vieja.

### Sugerencias mientras se escribe

`PlaceSuggestions` consulta únicamente `GET /api/v1/lugares/?q=…` en Django. Este endpoint obtiene coincidencias por prefijo desde el servicio de geocodificación de Open-Meteo, basado en GeoNames, sin claves de OpenWeather/Groq y sin generar recomendaciones. Las opciones conservan el orden recibido, tienen identificador estable y coordenadas validadas. La lista no inventa nombres ni promete corregir errores ortográficos: sirve para completar un comienzo de nombre y distinguir lugares con nombres similares. [Documentación del proveedor](https://open-meteo.com/en/docs/geocoding-api).

El campo funciona como combobox: flechas arriba/abajo recorren opciones, Enter elige la activa y Escape cierra sin modificar el texto. Sin opción activa, Enter busca por nombre. Tab permite salir normalmente; el foco permanece en el campo mientras se recorre la lista y se mantiene visible la opción activa. También se puede elegir con mouse o toque. No se consulta durante composición IME.

Se anuncian la carga, la cantidad de coincidencias, la ausencia de resultados y la falla del servicio. Si las sugerencias fallan, siguen disponibles Enter y «Usar mi ubicación». La geolocalización continúa requiriendo una acción explícita; las sugerencias no piden permiso de ubicación. La atribución de lugares a Open-Meteo/GeoNames aparece junto al buscador.

### Ubicación actual

«Usar mi ubicación» llama a `navigator.geolocation.getCurrentPosition` solo al pulsarlo. Requiere contexto seguro (HTTPS o localhost) y permiso del navegador. No se consulta por IP ni se coloca una clave en Angular. Se usa precisión normal, una posición cacheada de hasta un minuto, timeout nativo de 10 segundos y límite de espera de 12 segundos incluyendo el permiso. Si se rechaza el permiso, no hay soporte o vence la espera, se muestra un aviso y se permite escribir un lugar.

Angular envía exclusivamente `latitud` y `longitud` a `/api/v1/clima/`. Django valida el par y resuelve una localidad cercana mediante geocodificación inversa de OpenWeather; clima y pronóstico usan las coordenadas solicitadas, no el centro de esa localidad. La clave permanece en Django. No se guardan coordenadas en almacenamiento del navegador ni se sigue la ubicación con `watchPosition`. Al cancelar o comenzar otra búsqueda se ignoran callbacks tardíos; la solicitud de permiso del propio navegador no puede cerrarse desde la aplicación. Los requisitos del navegador se describen en [Geolocation de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).

## Recuperación y accesibilidad

| Situación                                             | Acción disponible                                                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Ciudad inexistente (`404` con `CIUDAD_NO_ENCONTRADA`) | «Corregir búsqueda» lleva el foco a ciudad y conserva lo escrito. Un 404 sin ese código se trata como falla del servicio.                 |
| Consulta inválida (`400`)                             | Corregir el lugar y sus partes separadas por comas en el único campo.                                                                     |
| Ciudad ambigua (`409`)                                | Elegir un candidato o «Precisar ubicación»; foco en el mismo campo de lugar.                                                              |
| Conexión fallida (`0`)                                | Revisar conexión y «Reintentar consulta». Un bloqueo CORS también puede aparecer como falla de conexión; no se exponen detalles técnicos. |
| Espera agotada (`TimeoutError`)                       | Aviso específico y «Reintentar consulta», sin mantener el indicador de carga activo.                                                      |
| Límite (`429`)                                        | Aviso para intentar más tarde; el reintento siempre depende de la persona.                                                                |
| Servicio no disponible o respuesta inválida           | «Reintentar consulta», sin mostrar cuerpos privados de error.                                                                             |
| Búsqueda pendiente                                    | «Cancelar búsqueda» cancela la suscripción, limpia los datos, anuncia la cancelación y vuelve a ciudad.                                   |

El reintento usa una copia de la última consulta normalizada que falló, incluidos los pares de coordenadas, sin inventar filtros ni mezclar datos. Al editar se retiran el aviso y el reintento anterior. Si se selecciona una ubicación o se reintenta, el foco vuelve al campo de lugar antes de retirar el control anterior. No hay reintentos automáticos ni persistencia.

Los errores remotos se anuncian mediante `role="alert"`. La carga, el resultado, la cancelación y la disponibilidad parcial se comunican con `role="status"` y `aria-atomic`; `aria-busy` se desactiva al terminar o fallar. El panel de errores de conexión/servicio recibe foco y permite llegar al reintento con Tab; las correcciones enfocan su campo. Los mensajes locales se asocian mediante `aria-describedby` y los campos inválidos llevan `aria-invalid`. El enlace «Saltar al contenido», el foco visible y los botones nativos permiten usar teclado sin una trampa de foco.

Los botones de sugerencias y opciones tienen al menos 44 px de alto. Los bordes de campos se reforzaron para obtener 3,33:1 contra su fondo; se conserva el contraste de texto y foco revisado con axe y navegador. La preferencia de movimiento reducido desactiva las animaciones de carga. La revisión no incluyó un lector de pantalla real ni constituye una certificación completa de accesibilidad.

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
e2e                 Regresión Playwright con respuestas controladas
playwright.config.ts Proyectos de navegador, reportes y artefactos
```

La página principal está en `pages/weather`. `shared` contiene los componentes de búsqueda, clima actual, pronóstico, recomendación, iconos y carga. `models/weather-preview.ts` contiene los tipos de presentación y `models/climate-response.ts` el contrato recibido. `service/climate-api.ts` consulta a Django y `service/climate-presentation.ts` adapta datos y errores. `testing/climate-fixture.ts` contiene únicamente datos ficticios para pruebas; ya no hay transporte de demo en la aplicación.

## Regresión reproducible

Desde un clon con Node y dependencias instaladas:

```sh
npm ci
npm run e2e:install
npm test -- --watch=false
npm run e2e:typecheck
npm run e2e
```

`e2e:install` prepara Chromium para Playwright. `npm run e2e` prepara los entornos públicos, inicia una instancia Angular separada en `http://127.0.0.1:4300` con configuración de producción, ejecuta los tres proyectos y cierra esa instancia al terminar. El puerto debe estar libre; no se reutiliza ni se cierra el servidor habitual de desarrollo en 4200. No necesita Django, `.env` ni claves de proveedores.

Los proyectos `mobile-360`, `tablet-768` y `desktop-1440` usan Chromium, viewport de 360/768/1440 px, zona del navegador Asia/Tokyo y movimiento reducido. No representan pruebas de Safari, Firefox ni dispositivos físicos. Se ejecutan sin reintentos automáticos, con dos workers locales y uno en CI; una falla no se oculta mediante reintentos.

`e2e/fixtures.ts` intercepta antes de navegar la URL de clima configurada por el build. Solo los archivos del servidor local pueden continuar a la red: la API recibe respuestas simuladas y cualquier otro origen se bloquea y hace fallar la prueba. También fallan los errores de ejecución y diálogos inesperados. No se usan `route.fetch`, cuentas reales ni un backend público. Esta regresión acredita el frontend con el contrato controlado; la integración real publicada queda para TK10.

El reporte se guarda en `playwright-report/`; `test-results/` conserva los artefactos de ejecución. Se adjuntan capturas del flujo principal y de IA no disponible; ante fallas se conservan screenshot y traza. Ambas carpetas están ignoradas por Git. Para revisar el reporte local:

```sh
npm run e2e:report
```

La configuración está en `playwright.config.ts` y se comprueba mediante `e2e/tsconfig.json`, con `rootDir` explícito e independiente del código compilado de Angular. La integración CLI se agregó mediante `ng add playwright-ng-schematics`. Dependencias de prueba fijadas: Playwright Test 1.64.1, schematic 21.1.1, axe-playwright 4.14.0 y tipos de Node 24.19.2. La estrategia usa [intercepción de APIs de Playwright](https://playwright.dev/docs/mock) y [proyectos por configuración](https://playwright.dev/docs/test-projects).

## Entornos

| Configuración | Archivo                                       | apiBaseUrl                                                       |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Desarrollo    | `src/environments/environment.development.ts` | `http://localhost:8000`                                          |
| Producción    | `src/environments/environment.ts`             | `https://api-clima.example.invalid` (marcador sin servicio real) |

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

## Verificación de TK07

Verificado el 24 de octubre de 2026 (America/Buenos_Aires), con Angular 21.2.25, Node 24.13.1, npm 11.10.0 y Chromium 156.0.8078.4. Se aplicaron Angular/Google y frontend-design de Anthropic, manteniendo la estética y Tailwind existentes.

- CP07: texto exacto recibido, saltos de línea y ubicación resuelta en la tarjeta. Una secuencia de búsquedas con un consejo previo y una solicitud cancelada termina mostrando solo la última ciudad, sin conservar recomendaciones de otra consulta.
- CP09: IA no disponible muestra su estado y aviso, conservando clima actual y pronóstico válidos. Comprobados los estados inicial, disponible y no disponible, sin consejo de reemplazo ni lista vacía de sugerencias.
- Renderizado seguro comprobado con etiquetas de imagen, scripts, Markdown, enlaces `javascript:` y expresiones de plantilla como texto literal. En Chromium no se crearon elementos ejecutables, no se evaluó el script ni se abrieron diálogos.
- **57 pruebas aprobadas** con `npm test -- --watch=false`, ocho casos nuevos específicos de recomendaciones y coherencia entre consultas. Build de producción completado.
- Chromium a 360, 768 y 1440 px: estados disponible/no disponible, texto con saltos, HTML literal y una palabra de 600 caracteres sin recorte ni desbordamiento. Sin errores de ejecución. Axe no detectó infracciones en las reglas WCAG 2 A/AA y 2.1 AA ejecutadas sobre ambos estados; no equivale a una auditoría completa.
- Pruebas y revisión visual con respuestas HTTP simuladas, sin llamadas ni gasto en proveedores reales. README actualizado; backend, claves, `.env`, dependencias y documentos originales conservados. Sin commit ni despliegue. La revisión general de errores y accesibilidad corresponde a TK08.

## Verificación de TK08

Verificado el 24 de octubre de 2026 (America/Buenos_Aires), con Angular 21.2.25, Node 24.13.1, npm 11.10.0 y Chromium 156.0.8078.4. Se mantuvieron Angular/Google y frontend-design de Anthropic y la estética existente.

- Casos del alcance local de CP03, CP08, CP09, CP10, CP11 y CP14: validación y corrección, ciudad inexistente, conexión, timeout, límite y servicio no disponible; recuperación explícita, carga finalizada y resultados anteriores retirados. Se conservan las pruebas de estados parciales y respuestas tardías de TK05–TK07.
- **69 pruebas aprobadas** con `npm test -- --watch=false`; 12 casos nuevos. Incluyen reintentar la misma consulta normalizada una sola vez, corregir campo región, foco del primer campo inválido, cancelar, editar después de una falla y diferenciar un 404 de ruta de una ciudad inexistente.
- Timeout de 45 segundos comprobado con reloj virtual y transporte XHR en memoria: se verifica la configuración, la traducción del evento de timeout de Angular a un aviso recuperable y el cierre del transporte. No requiere esperar 45 segundos reales ni acceder a la red.
- Chromium a 360, 768 y 1440 px: búsqueda con Enter, enlace de salto, corrección de 404, reintento con Tab/Enter tras 429/503/conexión, timeout simulado, cancelación con retorno de foco, resultado parcial y región inválida. Sin carga bloqueada, desbordamiento horizontal ni errores de ejecución.
- Axe sin infracciones detectadas en las reglas WCAG 2 A/AA y 2.1 AA ejecutadas sobre errores, resultado parcial y validación de región. Medidos borde de campo 3,33:1, botones de ejemplo de 44 px y animación desactivada con movimiento reducido. Revisados visualmente los paneles de recuperación y el foco.
- Build de producción completado y formato/diff revisados. Revisión de navegador con respuestas HTTP y timeout simulados, sin llamar a proveedores reales. No se modificaron `.env`, claves, backend, dependencias ni documentos originales; sin commit ni despliegue. La regresión integral y su automatización versionada corresponden a TK09.

## Verificación de TK09

24 de octubre de 2026 (America/Buenos_Aires). Windows, Node 24.13.1, npm 11.10.0, Angular 21.2.25, Playwright 1.64.1 y Chromium 156.0.8078.4.

| Cobertura del plan CP01–CP12 y CP14                               | Resultado local                                                                                                                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validadores, normalización, códigos ASCII y parámetros reservados | Suite unitaria y E2E: entrada inválida sin GET; parámetros decodificados coherentes con lo enviado.                                                                                                 |
| Clima actual, unidades, datos ausentes y fechas                   | Suite unitaria y E2E: ceros/negativos/decimales, nulls, 40 intervalos, cruce de año y hora de ciudad independiente del navegador.                                                                   |
| Recomendaciones y disponibilidad parcial                          | E2E: consejo ligado a la consulta, clima con IA no disponible y ambos bloques opcionales ausentes sin mediciones inventadas.                                                                        |
| Ambigüedad, errores y recuperación                                | E2E: candidatos del mismo país refinados por región, 404 y reintento de 503 con teclado; la suite unitaria mantiene conexión, timeout, 429, cancelación y corrección de campos.                     |
| Concurrencia y respuesta tardía                                   | Se retiene la primera respuesta hasta después del resultado de la nueva ciudad; un duplicado pendiente no añade GET y el consejo final corresponde a la última búsqueda.                            |
| Teclado, responsive y accesibilidad                               | Enter, Tab, enlace de salto, foco de corrección y reintento comprobados a tres tamaños; axe sin infracciones en las reglas WCAG 2 A/AA y 2.1 AA ejecutadas sobre resultado y límite de solicitudes. |

- `npm test -- --watch=false`: **69 pruebas aprobadas**.
- `npm run e2e`: **27 ejecuciones aprobadas** (nueve escenarios por tres tamaños), sin reintentos. Se ejecuta el build optimizado de producción a través del servidor de pruebas.
- `npm run e2e:typecheck`: sin errores. Instalación de Chromium verificada; npm reporta cero vulnerabilidades al instalar las dependencias de prueba.
- Inspección visual de las capturas de 360, 768 y 1440 px: contenido legible, foco visible y ausencia de desbordamiento; revisados éxito y consejo no disponible. Navegación con teclado automatizada. No se probó un lector de pantalla real ni se certifica accesibilidad completa.
- Sin defectos bloqueantes observados en los casos ejecutados. La configuración inicial necesitó declarar los tipos de Node para comprobar los E2E; quedó resuelto y el chequeo pasa. No fueron necesarios cambios en el comportamiento de la aplicación.
- README y lockfile actualizados. Sin llamadas a proveedores reales ni modificaciones de claves, `.env`, backend o documentos originales. Reporte disponible localmente; sin commit, PR ni despliegue. El usuario vinculará el commit al versionar TK09. TK10 continúa pendiente.

## Ajuste de búsqueda automática y ubicación actual

24 de octubre de 2026 (America/Buenos_Aires). Cambio solicitado fuera de la numeración de tareas. Se reemplazaron los tres campos y el botón de envío por un campo único y una acción explícita de ubicación. La espera de 500 ms reduce llamadas durante la escritura, manteniendo consulta inmediata con Enter y cancelación de respuestas anteriores.

- **70 pruebas unitarias y 36 E2E aprobados**: campo único, pausa de escritura, Enter sin duplicados, entrada incompleta, composición IME, candidatos y ubicación concedida/rechazada. También se comprueban timeout de localización, coordenadas cero y callbacks tardíos que no reemplazan una nueva búsqueda escrita.
- E2E en Chromium a 360, 768 y 1440 px, con geolocalización emulada y respuestas HTTP controladas. Sin ubicación real del agente ni llamadas a proveedores. Inspección visual de capturas, teclado, axe en los estados revisados y build de producción correctos.
- Backend ampliado con consulta por coordenadas y geocodificación inversa; **145 pruebas de Django aprobadas**. El esquema de respuesta conserva los mismos cinco bloques; el esquema de errores admite los campos `latitud` y `longitud`.
- README actualizado en ambos repositorios. Sin cambios en claves, `.env`, dependencias o documentos originales. Sin commit ni despliegue; la numeración de tareas existentes se conserva.

## Ajuste de autocompletado de lugares

24 de octubre de 2026 (America/Buenos_Aires). Se retiraron las tres ciudades fijas y «Probá con». La acción inicial «Buscar un lugar» ahora enfoca el buscador en lugar de consultar un ejemplo fijo.

- **80 pruebas unitarias y 48 E2E aprobados**: selección con coordenadas, debounce sin consultas de clima/IA, teclado, Escape, respuestas tardías y búsqueda con Enter si falla el autocompletado. Tres tamaños en Chromium (360, 768 y 1440 px); lista de cinco opciones, revisión visual y axe sin infracciones en las reglas ejecutadas. Build de producción y tipos correctos.
- Backend: **150 pruebas aprobadas**, incluyendo contrato del nuevo endpoint, normalización, destino HTTPS fijo, entradas inválidas sin proveedor, límite/error, JSON incorrecto y ausencia de llamadas a clima o Groq.
- Comprobación adicional del proveedor público con `Cord`: cinco coincidencias reales por prefijo, sin usar claves ni consultar clima/IA. El resto de la regresión usa respuestas y ubicaciones simuladas.
- README actualizado en ambos repositorios; sin cambios de claves, `.env`, dependencias o documentos originales. Sin commit ni despliegue. Esta mejora modifica la pausa anterior: escribir prepara opciones; elegir una o pulsar Enter consulta el clima.
- Cierre al retomar el 25 de octubre: Django reiniciado con la nueva ruta; HTTP local de `/api/v1/lugares/?q=Cord` verificado con 200, cinco sugerencias y CORS para Angular. Repetido el caso móvil de combobox con teclado/Escape: aprobado, sin llamadas de clima mientras se recorre la lista.
