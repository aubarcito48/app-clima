# Clima Inteligente

Frontend Angular para consultar el clima de una ciudad y mostrar recomendaciones de IA basadas en esos datos. Angular consulta únicamente a Django; Django se encarga de OpenWeather y Groq.

## Estado

TK08: recuperación de errores y accesibilidad de las interacciones. Ciudad inexistente, conexión fallida, espera agotada y límite de solicitudes tienen mensajes y acciones explícitas. Se puede reintentar o cancelar; el foco y los anuncios de estado acompañan los cambios. Se conservan la conexión de TK05, el clima de TK06 y las recomendaciones de TK07.

## Consultar el clima

Al abrir la aplicación se muestra el estado inicial sin solicitudes automáticas. Escribir una ciudad o elegir Córdoba, Buenos Aires o Mendoza realiza una búsqueda en Django. Las sugerencias completan país AR, pero no contienen mediciones ni consejos locales. La demora simulada y los fixtures de la demo fueron retirados del flujo de aplicación; el fixture del contrato existe únicamente para las pruebas.

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

## Recuperación y accesibilidad

| Situación | Acción disponible |
| --- | --- |
| Ciudad inexistente (`404` con `CIUDAD_NO_ENCONTRADA`) | «Corregir búsqueda» lleva el foco a ciudad y conserva lo escrito. Un 404 sin ese código se trata como falla del servicio. |
| Consulta inválida (`400`) | Corregir el campo indicado por Django: ciudad, país o región. La validación local enfoca primero el primer campo inválido. |
| Ciudad ambigua (`409`) | Elegir un candidato o «Precisar ubicación»; foco en país si falta o en región si el país ya está indicado. |
| Conexión fallida (`0`) | Revisar conexión y «Reintentar consulta». Un bloqueo CORS también puede aparecer como falla de conexión; no se exponen detalles técnicos. |
| Espera agotada (`TimeoutError`) | Aviso específico y «Reintentar consulta», sin mantener el indicador de carga activo. |
| Límite (`429`) | Aviso para intentar más tarde; el reintento siempre depende de la persona. |
| Servicio no disponible o respuesta inválida | «Reintentar consulta», sin mostrar cuerpos privados de error. |
| Búsqueda pendiente | «Cancelar búsqueda» cancela la suscripción, limpia los datos, anuncia la cancelación y vuelve a ciudad. |

El reintento usa una copia de la última consulta normalizada que falló; no inventa filtros ni mezcla datos. Al editar se retiran el aviso y el reintento anterior, para no volver a enviar una búsqueda que ya no corresponda al formulario. Si se selecciona una ubicación o se reintenta, el foco queda en el botón de envío antes de retirar el control anterior. No se agregaron reintentos automáticos ni persistencia.

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
