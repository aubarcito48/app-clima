# Docker · React · Verificación del 28 de noviembre de 2026

- Imagen construida con Docker Desktop, motor Linux 29.9.3 (linux/amd64).
- Node 24 ejecutó `npm ci`, la comprobación TypeScript y el build Vite dentro de Docker.
- Nginx sirve la aplicación en `http://localhost:8083`; contenedor `healthy`.
- Ocho pruebas de configuración de Vite aprobadas: HTTPS y HTTP de loopback aceptados; HTTP remoto, credenciales y parámetros rechazados.
- Dos pruebas E2E existentes ejecutadas contra el contenedor: cambio ES/EN con persistencia al recargar y actualización de clima, recomendaciones y pronóstico al cambiar idioma.
- Ruta directa `/sobre-nosotros` y recarga correctas; sin errores JavaScript.
- `/healthz` devolvió 200 con `ok`; `/theme-init.js` devolvió JavaScript, no el HTML de fallback.
- Build local y formato aprobados. Archivos privados y cachés excluidos del contexto.

Las consultas meteorológicas y el audio de las pruebas E2E usaron fixtures. No se ejecutó toda la suite histórica ni se consultaron proveedores reales. Para usar el backend compartido hay que incluir el origen 8083 en su CORS, según README. Se conserva el aviso previo de Vite sobre `theme-init.js` y tamaño del chunk principal; el recurso se comprobó servido por Nginx.
