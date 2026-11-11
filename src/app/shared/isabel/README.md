# Isa: retrato animado

El personaje usa las imágenes y el video aportados por el usuario, inspirados en
su madre. El video fuente dura 10 segundos, mide 1280 × 720 y tiene 24 fps.
La aplicación no reproduce el MP4 ni consulta servicios de imágenes.

## Recursos

- `public/isa-bot/original`: imágenes originales del usuario.
- `public/isa-bot/sin-fondo`: WebP transparentes aportados por el usuario.
- `public/isa-bot/isa-video.mp4`: fuente conservada sin modificaciones.
- `public/isa-bot/runtime/isa-atlas-v1.webp`: 23 cuadros de 256 × 288, en ocho
  columnas (2048 × 864, aproximadamente 295 KiB).
- `public/isa-bot/runtime/isa-sleep-v1.webp`: imagen inicial y alternativa si falla el atlas.
- `isa-portrait-manifest.json`: índices de poses y secuencias, generado junto al atlas.

`angular.json` excluye originales, imágenes grandes y MP4 de los assets publicados.
Se conservan para edición; solo `runtime` se sirve. No publicar fotos personales
adicionales sin necesidad.

## Representación y comportamiento

`isa-portrait.ts` carga el atlas de forma diferida y dibuja un único canvas.
Interpola cuadros adyacentes y transiciona desde la imagen visible al cambiar de
estado. Los giros proceden del mismo video; el sueño usa la imagen dormida alineada.
Se omiten los giros a la izquierda y arriba porque no pertenecen al ciclo actual.

El fondo se elimina fuera de línea por regiones casi blancas conectadas al borde,
con ajuste del contorno. No se elimina todo píxel blanco, para conservar las canas.
El recorte común de rostro y hombros prioriza la legibilidad en móvil. Queda por
revisar el contorno en ambos temas cuando se autorice la revisión en navegador.

Se conserva una instancia de Isa al cambiar entre navbar móvil y lateral:

1. Dormida en reposo.
2. Despierta al consultar el clima.
3. Mientras Piper prepara el audio, mira a la derecha en escritorio y hacia abajo
   con navbar móvil/tablet (ancho inferior a 1024 px).
4. Al hablar vuelve al frente. La energía RMS del WAV de Piper controla la apertura
   de boca: se superpone solo un recorte suavizado de la imagen hablando.
5. Al terminar o silenciar, cierra la boca y espera cinco segundos antes de dormir.

La boca es una aproximación por amplitud, no sincronización fonética. Las poses
pintadas no conservan la geometría editable del personaje azul: el nuevo parpadeo
procede del video. No es un modelo 3D ni un rig facial. Las transiciones desde
imágenes estáticas son fundidos, no nuevos cuadros generados por IA.

No hay seguimiento del cursor. Se conserva el botón accesible para silenciar o
activar voz con clic, toque, Enter o Espacio. Idioma y cancelación de consultas
siguen a cargo de `IsabelVoice`. Piper permanece sin cambios.

Con movimiento reducido las poses cambian directamente, sin boca animada,
parpadeo ni balanceo. No hay un bucle continuo de canvas en reposo: se dibuja
solo durante transiciones, parpadeos o cambios de amplitud. Al ocultarse la
pestaña o el avatar se suspenden los temporizadores de animación. Al destruirlo
se eliminan observadores, eventos y solicitudes de animación.

El renderer SVG anterior y sus auxiliares se conservan como referencia, con sus
pruebas unitarias, pero el componente ya no los importa.

## Preparación explícita de recursos

Requiere FFmpeg y Python con Pillow. No se ejecuta al instalar, iniciar, compilar
ni desplegar. No requiere NumPy ni una API de generación. Desde la raíz frontend:

```powershell
python scripts/prepare-isa.py --ffmpeg RUTA/ffmpeg.exe --review
python scripts/prepare-isa.py --ffmpeg RUTA/ffmpeg.exe --config scripts/isa-assets.json
```

Primero inspeccionar `tmp/isa-review/video-contact.jpg`. Recortes e índices se
configuran en `scripts/isa-assets.json`. Para ajustar solo máscaras o selección
sin volver a decodificar, usar `--reuse-frames`. No utilizar esa opción si cambia
el recorte o la frecuencia de extracción.

El proceso es secuencial, usa un hilo de FFmpeg y no modifica originales. La copia
portátil autorizada está en `tmp/isa-tools`, ignorada por Git, sin cambios en PATH
ni instalación en Windows.

## Verificación pendiente

Se inspeccionaron las hojas de cuadros y la composición de boca como imágenes.
Se adaptaron las pruebas E2E que dependían del SVG. No se ejecutaron builds,
pruebas ni navegadores de QA, respetando la preferencia de recursos del usuario.
