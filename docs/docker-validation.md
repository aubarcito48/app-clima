# Verificaci?n Docker ? 28 de noviembre de 2026

Im?genes independientes construidas en Docker Desktop, motor Linux 29.9.3,
plataforma linux/amd64. La primera construcci?n tambi?n pas? con el motor
anterior; Docker Desktop se actualiz? autom?ticamente durante la sesi?n.

## Resultado

- `docker build -t stitchweather-frontend:local .`: correcto desde el frontend.
- `docker build -t stitchweather-backend:local .`: correcto desde el backend.
- Ambos contenedores arrancaron con los comandos de sus README y alcanzaron `healthy`.
- `python manage.py check` dentro de la imagen backend: sin incidencias.
- Estado y b?squeda geogr?fica: HTTP 200 y CORS para `http://localhost:8080`.
- Chromium contra ambos contenedores reales: b?squeda de C?rdoba, consulta de
  clima HTTP 200, temperatura visible y recomendaci?n con IA; sin errores JavaScript.
- Navegaci?n directa y recarga de `/sobre-nosotros`: correctas con Nginx.
- Voz `es` y `en`: HTTP 200, `audio/wav`, archivos WAV v?lidos y con frames de audio.
  Esta prueba valida generaci?n y formato, no calidad perceptual.
- Usuario del backend: UID 10001. Dos modelos alineados presentes. `.env` y
  `.env.docker` ausentes de la imagen; archivo privado de ejecuci?n ignorado por Git.
- Con `DJANGO_SECURE_SSL_REDIRECT=true`, estado interno HTTP 200 y resto de la
  API con redirecci?n HTTPS 301, comprobados con Django Client dentro del contenedor.
- `npm run test:env`: ocho pruebas aprobadas (loopback HTTP/HTTPS aceptados,
  HTTP remoto, credenciales y esquema no HTTP rechazados).
- Formato de scripts y `git diff --check`: correctos.

## Alcance

No se ejecut? toda la suite hist?rica de E2E ni se prob? un servidor remoto o TLS
real. Las voces y dependencias se instalaron dentro de Linux desde sus fuentes;
no se reutilizaron `.venv` ni modelos locales. Los modelos quedan en la imagen y
se reutilizan al reiniciar. La compilaci?n conserva el aviso existente de Leaflet
CommonJS. Las claves privadas no se incluyen en esta evidencia.
