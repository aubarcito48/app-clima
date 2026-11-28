# Docker de StitchWeather · Vue

## Alcance
Extender a esta rama el Docker independiente ya implementado en Angular. Node 24 compila con Vite y comprueba TypeScript; Nginx sirve el resultado y conserva las rutas SPA al recargar. El backend Django sigue separado.

## Decisión
Se reutilizan el Dockerfile multietapa, .dockerignore y Nginx de Angular, adaptando la validación de Vite. La API es un argumento público de build: HTTP solo en loopback y HTTPS para remoto. Puerto local 8082, API por defecto en localhost:8000. CORS debe incluir el origen del frontend. Los archivos privados quedan fuera de la imagen.

## Verificación
Ocho pruebas sobre la configuración real de Vite, compilación local y, con Docker disponible, build y arranque de la imagen, healthcheck y recarga de rutas desde navegador. Los proveedores se pueden simular para que esta verificación no necesite claves.
