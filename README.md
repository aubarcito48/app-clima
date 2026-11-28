# StitchWeather · Vue

Consultá el clima y el pronóstico de una ciudad, y recibí recomendaciones con IA
en español o inglés. Isa acompaña las recomendaciones con voz y un avatar animado.

Esta rama `vuejs` contiene la versión Vue de la aplicación. La versión Angular
se conserva en [`main`](https://github.com/aubarcito48/app-clima/tree/main).

**[Probar la versión Angular](https://app-clima-ecru.vercel.app/)** ·
[Backend del proyecto](https://github.com/aubarcito48/app-clima-backend)

[![Captura de StitchWeather con la información meteorológica y el avatar de Isa](public/app-clima.png)](https://app-clima-ecru.vercel.app/)

## Funcionalidades

- Búsqueda de ciudades y consulta de la ubicación actual con permiso del navegador.
- Clima actual, pronóstico y unidades Celsius o Fahrenheit.
- Recomendaciones generadas con Groq y lectura con la voz de Isa.
- Interfaz en español e inglés, con tema claro y oscuro.
- Mapa meteorológico, alertas y contactos de emergencia según el país consultado.

El frontend utiliza Vue 3 con Composition API, TypeScript, Vite, Vue Router,
Tailwind CSS y Leaflet. El backend Django
consulta los proveedores meteorológicos y Groq, y genera la voz con Piper.
Las claves de los proveedores permanecen exclusivamente en el backend.

| Tecnología                    | Para qué se usa                                       |
| ----------------------------- | ----------------------------------------------------- |
| Vue 3 y TypeScript            | Interfaz, componentes y estado de la aplicación.      |
| Tailwind CSS y CSS            | Diseño adaptable y temas visuales.                    |
| Leaflet                       | Visualización del mapa.                               |
| Django y OpenWeather          | API y datos meteorológicos.                           |
| Groq                          | Recomendaciones con IA.                               |
| Piper y sincronización propia | Voz de Isa en español e inglés y movimientos de boca. |

## Antes de instalar

Para usar la aplicación publicada alcanza con abrir la demo; no necesitás
instalar herramientas ni tener claves propias.

Para ejecutarla en tu PC necesitás **Git, Node.js 24, npm y el backend Django**.
El backend necesita Python 3.14, claves propias de OpenWeather y Groq y los
modelos de voz si querés escuchar a Isa. La primera instalación necesita internet
y espacio adicional para dependencias y modelos.

Prepará primero el backend siguiendo su
[guía completa de instalación](https://github.com/aubarcito48/app-clima-backend#instalación-desde-cero).
No requiere migraciones ni PostgreSQL. Dejalo ejecutándose y abrí una segunda
terminal para el frontend.

## Ejecutar con Docker

Desde la rama `vuejs`, con Docker en modo Linux:

```powershell
docker build -t stitchweather-vue:local .
docker run -d --name stitchweather-vue -p 127.0.0.1:8082:80 stitchweather-vue:local
```

Abrí `http://localhost:8082`. La imagen consulta por defecto el backend en
`http://localhost:8000`. Agregá `http://localhost:8082` a `CORS_ALLOWED_ORIGINS`
del backend y recreá su contenedor si usás Docker. Para usar también `127.0.0.1`,
permití ese origen exacto. Las tres versiones comparten el mismo backend.

El Dockerfile compila Vue y TypeScript con Node 24 y sirve el resultado con
Nginx. Incluye rutas SPA al recargar y un healthcheck en `/healthz`; no requiere
Node.js instalado en el equipo. `.dockerignore` excluye archivos privados y cachés.

Para apuntar a otra API al construir:

```powershell
docker build --build-arg PUBLIC_API_BASE_URL_PRODUCTION=https://api.tu-dominio.com -t stitchweather-vue:server .
```

La URL la usa el navegador del visitante: usá el origen sin `/api/v1`, HTTPS
en un servidor remoto y HTTP únicamente en loopback para la práctica local.
No uses nombres internos de contenedores ni claves de proveedores. La URL queda
incorporada al construir; `docker run -e` no cambia el JavaScript compilado.
Un futuro servidor requiere además dominio y HTTPS en su proxy.

```powershell
docker ps --filter name=stitchweather-vue
docker logs stitchweather-vue
docker stop stitchweather-vue
docker rm stitchweather-vue
```

`npm run test:env` comprueba la validación de la URL pública de la API.

## Ejecutar el frontend

Descargá el frontend en una carpeta distinta del backend:

```powershell
git clone --branch vuejs https://github.com/aubarcito48/app-clima.git
cd app-clima
node --version
npm --version
```

Instalá las dependencias desde esa carpeta:

```powershell
npm ci
```

Si todavía no tenés un archivo `.env`, crealo a partir del ejemplo:

```powershell
Copy-Item .env.example .env
```

Conservá tu `.env` si ya existe. Configurá `PUBLIC_API_BASE_URL_DEVELOPMENT` con
la dirección de tu backend; el valor de ejemplo es `http://localhost:8000`.
Usá el origen sin añadir `/api/v1`. Estas variables son públicas: nunca pongas
claves de OpenWeather o Groq en el frontend.

```powershell
npm start
```

Abrí `http://127.0.0.1:4200`. El backend debe estar ejecutándose para consultar
el clima, generar recomendaciones y reproducir la voz. Vite lee la URL pública
del backend desde `.env` al iniciar.

### Comprobar que funciona

1. Abrí `http://localhost:8000/api/v1/health/`: debe responder `{"estado":"ok"}`.
   Eso solo confirma que la API está activa.
2. Abrí `http://127.0.0.1:4200` y buscá una ciudad.
3. Comprobá los datos meteorológicos y la recomendación; hacé clic sobre Isa si
   el navegador bloquea el audio automático.
4. Cambiá a inglés y probá otra consulta para verificar ambos idiomas.

Para volver a iniciar el proyecto otro día, abrí dos terminales: ejecutá
`manage.py runserver` con el Python del entorno del backend en una, y `npm start`
desde la carpeta del frontend en la otra. No reinstales dependencias y modelos
en cada inicio; repetí la instalación cuando cambien los requisitos.

## Compilación y pruebas

```powershell
npm run typecheck
npm run build
```

La salida queda en `dist/app-clima/browser/`. Para revisar esa compilación:

```powershell
npm run preview
```

Antes de publicar esa compilación, configurá `PUBLIC_API_BASE_URL_PRODUCTION`
con el origen HTTPS de tu backend y permití el origen del frontend en CORS.
El dominio `api-clima.example.invalid` del ejemplo es un marcador, no un servidor.

Las pruebas se ejecutan aparte y levantan una instancia local aislada que se cierra al terminar. Usan un solo
trabajador para moderar el consumo de la PC. Los proveedores y el audio se
simulan con fixtures; estas pruebas no llaman al backend real:

```powershell
npm run e2e:install
npm run e2e:typecheck
npm run e2e
```

Las pruebas de navegador con Playwright se conservan en `e2e/`. Para ver el
informe generado, ejecutá `npm run e2e:report`.
Son pruebas del comportamiento de la aplicación, no una certificación de todos
los navegadores ni una comprobación permanente de proveedores externos.

## Organización

Los archivos se agrupan por funcionalidad dentro de cada capa: páginas en
`src/vue/pages/`, servicios en `src/vue/service/`, modelos en `src/vue/models/`
y componentes SFC compartidos en `src/vue/shared/`. `src/vue/composables/` gestiona
el estado de las consultas y `src/vue/api/` concentra las peticiones HTTP.
Los estados de preferencias son compartidos por toda la aplicación.

`vercel.json` configura Vite y el fallback de Vue Router. Para publicar, usá la
rama `vuejs`, configurá la URL HTTPS del backend y autorizá el origen publicado
en Django. Esta migración conserva las diez etapas en su
[plan](docs/superpowers/plans/2026-11-25-vuejs-migration.md).

## Voz y disponibilidad

Si el navegador bloquea la reproducción automática, hacé clic sobre Isa para
escuchar la recomendación. El texto también queda disponible para leerlo.
El tiempo de respuesta depende de los proveedores y del servidor que genera
la voz; puede aumentar cuando el servicio está iniciándose.

## Navegadores y permisos

La aplicación está pensada para navegadores modernos con JavaScript habilitado.
El alcance de las comprobaciones actuales es el siguiente:

| Navegador o motor              | Estado de comprobación                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Chromium de Playwright         | La suite configurada incluye tamaños de celular, tablet y escritorio.                               |
| Google Chrome y Microsoft Edge | Comparten el motor Chromium; la suite no equivale a verificar cada versión comercial o dispositivo. |
| Safari y Firefox               | Pendiente una validación completa propia; no se garantiza paridad de todas las funciones.           |

En Safari y en otros navegadores, el audio automático puede bloquearse: hacé clic
o tocá a Isa para iniciar la reproducción cuando esté disponible. Una interacción
del usuario puede ser necesaria incluso si el audio se inicia mediante JavaScript.
Referencia: [políticas de reproducción de audio en MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play).

La ubicación actual requiere permiso del navegador y un contexto seguro
(HTTPS en un sitio publicado o localhost durante el desarrollo). Si rechazás el
permiso, podés seguir buscando ciudades manualmente. La voz de Isa no requiere
acceso al micrófono del visitante.

## Problemas frecuentes

| Problema                                | Qué revisar                                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| No encuentra `npm` o `node`             | Instalá Node.js 24 y abrí una terminal nueva.                                                                                       |
| Abre la interfaz pero no carga el clima | Comprobá que Django esté activo, la URL del backend y sus claves.                                                                   |
| Error de CORS                           | El origen exacto del frontend debe figurar en `CORS_ALLOWED_ORIGINS` del backend.                                                   |
| El audio no empieza                     | Esperá la generación, tocá a Isa y revisá volumen y permisos de reproducción. Si falla la generación, revisá las voces del backend. |
| La ubicación no funciona                | Revisá permisos y HTTPS; podés escribir la ciudad igualmente.                                                                       |
| Cambiaste el `.env` y no se refleja     | Reiniciá `npm start`; si editaste el `.env` del backend, reiniciá Django.                                                           |
| El puerto 4200 está ocupado             | Iniciá con `npm start -- --port 4201` y agregá ese origen al CORS del backend.                                                      |

## Compartir comentarios

Podés [abrir un issue](https://github.com/aubarcito48/app-clima/issues) con una
sugerencia o un error. Para ayudar a reproducirlo, indicá el navegador, el
dispositivo, los pasos y una captura sin datos privados.
