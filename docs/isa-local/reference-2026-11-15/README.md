# Archivo de las pruebas de Isa — 15/11/2026

Este directorio conserva audios reales, marcas Rhubarb, planes de dirección y
reportes de las pruebas. `manifest.json` registra tamaño y SHA-256. No contiene
credenciales, modelos de voz ni ejecutables. Las imágenes, atlas y videos fuente
están en `public/isa-bot`; los generadores y selectores están en `scripts`.

Se conservan también las alternativas descartadas: boca fija, secuencias, mezclas
de tomas, comparación de directores, voces, ritmos y silencio artificial. La última
opción aprobada fue **3C con pausas y micropausas**, Sharvard en español y Cori
pausada en inglés. El silencio artificial de 0,8 segundos es solo un diagnóstico.

## Reconstrucción

Con los repositorios `app-clima` y `app-clima-backend` como carpetas hermanas,
desde la raíz del frontend:

```powershell
npm ci
python -m pip install numpy Pillow
python scripts/restore-isa-reference.py
python scripts/restore-isa-reference.py --rebuild --ffmpeg RUTA/ffmpeg.exe
```

Usar Python 3.12+, Node 24 y FFmpeg. El primer comando de restauración comprueba
los hashes y recupera los audios en el `tmp` del backend. Si ya existe un archivo
diferente, se detiene sin sobrescribirlo. La reconstrucción no consulta Groq ni
requiere sintetizar nuevas voces. Genera los HTML en `tmp/isa-mouth-preview`.

Abrir esa carpeta con Live Server. El punto de entrada de la versión aprobada es
`index-3c-micropausas.html`; las pruebas anteriores conservan sus páginas separadas.
Los HTML y cuadros derivados permanecen ignorados para evitar duplicar grandes
cantidades de archivos. Los insumos, los generadores y este archivo sí se guardan
en Git, por lo que no dependen de conservar el `tmp` de esta computadora.

La reconstrucción completa de los 19 pasos fue verificada antes de publicar.
Los scripts `scripts/check-isa-*.mjs` verifican las reglas de cada alternativa.
Los detalles y decisiones están en [MOTION-PREVIEW.md](../MOTION-PREVIEW.md).
