# Isa: retrato animado

## Dirección de Groq durante la narración

El consejo puede incluir `segmentos` con texto, mirada, velocidad, energía y pausa.
El componente recibe el plan junto al consejo; `IsabelVoice` agrega saludo y
despedida neutrales y envía todo en una única petición de voz. Piper devuelve
los tiempos reales de cada fragmento dentro del chunk RIFF `isac` del WAV.
La dirección se consulta con `audio.currentTime`, sin estimaciones por longitud
del texto ni temporizadores acumulados. El audio sigue funcionando sin ese chunk.

El catálogo vigente es el del retrato: `isa-awake` (frente y video de habla),
`isa-right` (mirada a la derecha) e `isa-down` (mirada hacia abajo). Las miradas
elegidas por Groq aparecen hasta 1.2 segundos al comenzar el fragmento y en su
pausa final; entre ellas vuelve al frente. Los giros y regresos usan `IsaMotion`
y los fundidos existentes; no reinician el video de habla. No se inventan
expresiones ni boca lateral: solo hay video de habla frontal.

Silenciar, cancelar, cambiar idioma o destruir el componente descarta la dirección
anterior junto con el audio. Con movimiento reducido se conserva el frente
durante la voz sin animaciones. Sin plan válido se mantiene la narración habitual.
No se generan ni descargan recursos visuales nuevos.

## Actualización: habla y cuadros adicionales

La configuración vigente usa `isa-atlas-v3.webp`: **61 cuadros de 320 × 320**
seleccionados del video original (la v2 tenía 36). Se recuperaron cuadros
intermedios de los giros; el parpadeo/sueño conserva sus seis cuadros útiles.
El fallback es `isa-sleep-v3.webp`. Las versiones anteriores se conservan como
referencia, pero el reproductor carga v3.

El video nuevo `public/isa-bot/isa-hablando-video.mp4` dura 10 segundos, con
240 cuadros a 24 fps y resolución 1280 × 720. Se conservó intacto y se prepararon
**204 cuadros**, del 12 al 215, en cinco páginas `isa-speech-v1-0.webp` a
`isa-speech-v1-4.webp`. El manifiesto es `isa-speech-manifest.json`.
Cada página contiene hasta 48 cuadros; se cargan al comenzar el habla y solo
se retienen la actual y la siguiente, para limitar memoria en móvil.

El habla muestra cuadros completos del video nuevo, sin pegar una boca de otra
imagen. La energía RMS que ya calcula `IsabelVoice` distingue pausas largas:
se ignoran huecos menores de 320 ms para no detener el video entre sílabas.
La reproducción mantiene 24 fps y mezcla cuadros adyacentes, también en límites
de página. En una pausa larga se recorre el cierre de boca más cercano dentro
del mismo video y se sostiene ese cuadro, sin sustituir cuerpo/cabeza por el
retrato original. Los cierres revisados están en `closedFrames` de la configuración
y en `closed` del manifiesto. Al terminar o silenciar cierra y funde hacia el
frontal original. Es una animación general, repetida si la narración dura más;
**no sincroniza los fonemas ni cada palabra**. Piper no cambió.

Se corrigió el rebote visible en `resultado-isabot-hablando.mp4`: el primer
reproductor cambiaba de fuente y frenaba cuadros con cada caída instantánea
de volumen. Ahora un retraso de carga también conserva el último cuadro visible
en lugar de mostrar fugazmente el frontal de otra fuente.

Ambos videos usan el mismo recorte de 704 × 704 con origen (300, 8), reducido a
320 × 320. El habla elimina además fragmentos blancos desconectados del
personaje/escritorio. Se revisaron contactos sobre fondo oscuro; los videos
generados por separado aún pueden diferir levemente en expresión y contornos.
Los fundidos suavizan el cambio, no reconstruyen una identidad idéntica.

Con movimiento reducido no se animan ni cargan las páginas de habla. El bucle
se suspende al ocultar la página o el avatar; si falla una página de habla,
se mantiene el retrato original y el audio sigue siendo independiente.

Preparación secuencial, desde la raíz del frontend (Python con Pillow y FFmpeg):

```powershell
python scripts/prepare-isa.py --ffmpeg tmp/isa-tools/ffmpeg.exe --config scripts/isa-assets.json
python scripts/prepare-isa-speech.py --ffmpeg tmp/isa-tools/ffmpeg.exe
```

Ambos admiten `--reuse-frames` para cambiar máscaras/selección sin decodificar
otra vez; no usarlo si cambia el video, recorte, escala o fps. Los scripts no
se ejecutan al iniciar, compilar o instalar. La configuración del habla está en
`scripts/isa-speech-assets.json`. Los MP4 originales siguen excluidos del build.

Revisión local: `tmp/isa-review/prepared-v3.jpg`, `speech-contact.jpg` y
`speech-prepared-v1.jpg`. Las pruebas de `isa-portrait.spec.ts` comprueban:
carga diferida, habla/silencio/fin, movimiento reducido, fallos de imágenes,
visibilidad, limpieza y continuidad a velocidad nativa entre huecos de sílabas.
La comparación local con Chromium y el mismo WAV mide los retornos involuntarios
al frontal y guarda una grabación antes/después en `tmp/isa-smooth-qa`.
La aprobación visual final corresponde al usuario. No se ejecuta la suite E2E
completa para esta corrección.

---

## Historial de la primera implementación

El resto de este documento describe la versión inicial, anterior a v2/v3 y al
video de habla. Sus cifras y la composición de boca no representan el renderer
actual; prevalece la actualización anterior.

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
