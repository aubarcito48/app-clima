# Prueba 2: conservar la actuación del video

Este ensayo compara los mismos cuadros nativos del video de Isa: a la izquierda,
sin cambios; a la derecha, con un recorte de boca que acompaña la posición de la
cara. No modifica la aplicación ni reemplaza la primera prueba.

Desde la raíz del frontend:

```powershell
python scripts/preview-isa-mouth-motion.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav
node scripts/check-isa-mouth-motion-preview.mjs
```

Abrir `tmp/isa-mouth-preview/index-2.html` directamente o con Live Server.
`tmp/isa-mouth-preview/index.html` conserva la prueba anterior. El generador y
la comprobación verifican que ese archivo no cambie. Los resultados temporales
quedan fuera de Git.

El ensayo usa 48 cuadros a 24 FPS y dos segundos de audio de Piper ya generado,
con sus marcas de Rhubarb. No hace consultas a Groq. Sigue tres sectores de
ojos y nariz para estimar desplazamiento, escala y rotación del recorte; no
resuelve la perspectiva 3D ni reconstruye la mandíbula. En esta muestra, 43
cuadros superan los límites de seguimiento; los otros cinco muestran el cuadro
original sin recorte. Ese conteo no mide precisión fonética ni calidad visual.

La comprobación verifica que los píxeles fuera de la zona de la boca no cambien,
que continúe el movimiento original y que funcionen reproducción, pausa,
selección de cuadros, exportación de ajustes y vista móvil. La naturalidad,
los bordes, el color de piel y la continuidad de la mandíbula requieren revisión
visual de Nahuel.

Conservar ambas pruebas. Antes de integrar, publicar o pushear estos cambios,
mostrar el resultado y esperar la decisión de Nahuel.

## Prueba 3: selección de cuadros completos

La grabación `unknown_2026.11.15-07.11.mp4` mostró que el recorte de la prueba 2
se percibe separado de la mandíbula y las mejillas, con cambios bruscos al volver
al cuadro original. Se conserva esa prueba como referencia.

```powershell
python scripts/preview-isa-whole-frames.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav
node scripts/check-isa-whole-frames-preview.mjs
```

Abrir `tmp/isa-mouth-preview/index-3.html`. Conserva los HTML 1 y 2, verificados
por hash. Usa los mismos dos segundos de audio y selecciona entre 51 cuadros
completos del atlas nativo, sin superposición, deformación ni fundido.

Las etiquetas iniciales se propusieron al revisar una hoja de contacto cada
cuatro cuadros. Son aproximaciones visuales editables, no etiquetas fonéticas
validadas. A/G/H no tienen ejemplos confirmados y usan X/B/C. La galería permite
corregir etiquetas o excluir candidatos; la exportación conserva esos cambios
y la secuencia temporal en JSON, marcada `reviewed: false`.

La secuencia minimiza conjuntamente discrepancia de boca, cambios de pose/cuerpo
y distancia respecto al movimiento original. Es una optimización sobre recursos
existentes: puede sostener cuadros, interrumpir parpadeos o producir saltos.
No preserva necesariamente la actuación temporal original ni genera movimiento
faltante. El control de continuidad sirve para inspeccionar ese compromiso.

La comprobación verifica los 48 instantes contra los píxeles de sus cuadros
completos de origen, además de reproducción, exclusión de candidatos, exportación,
vista móvil y conservación de las pruebas anteriores. No certifica naturalidad
ni sincronización perceptiva. Sigue pendiente la revisión conjunta antes de
commitear, integrar o pushear.

## Ajuste 3B: pequeños tramos consecutivos

```powershell
python scripts/preview-isa-whole-frames.py --sequences --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav
node scripts/check-isa-sequences-preview.mjs
```

Abrir `tmp/isa-mouth-preview/index-3b.html`. Conserva las pruebas 1, 2 y 3
mediante verificación de hash. Reproduce tramos de 4, 6 u 8 cuadros nativos
consecutivos a 24 FPS; el valor inicial es 6 (250 ms). No saltea, repite ni
mezcla cuadros dentro de cada tramo. Selecciona los tramos considerando el
audio y las diferencias de pose en sus enlaces. Los cuadros intermedios usan
la etiqueta visual más cercana: esa aproximación requiere revisión.

Los enlaces entre tramos todavía pueden saltar o reiniciar una expresión.
En la muestra inicial de 6 cuadros hay siete enlaces no consecutivos entre
ocho tramos; no afirmar que la continuidad global esté resuelta. El ajuste
separa el efecto de recuperar cuadros intermedios del problema pendiente de
enlazar movimientos. Excluir una etiqueta retira su uso como referencia, pero
no elimina ese cuadro de los interiores de otros tramos.

La prueba verifica píxeles de origen, avance consecutivo dentro de todos los
tramos en las tres duraciones, reproducción, exportación y vista móvil.
La prueba 4 será distinta: Nahuel generará nuevos videos en Gemini para ampliar
formas de boca y transiciones disponibles. Todavía no se generó ni integró
ese material. No confundir esta variante con la prueba 4.

## Alternativa: ritmo continuo sin Rhubarb

```powershell
python scripts/preview-isa-rhythm.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav
node scripts/check-isa-rhythm-preview.mjs
```

Abrir `tmp/isa-mouth-preview/index-ritmo.html`. La carpeta del WAV conserva su
nombre histórico, pero este generador lee exclusivamente PCM de 16 bits; no
requiere ni interpreta `isav`, formas fonéticas ni etiquetas de imágenes.
Extrae los segundos 3 a 9 y calcula energía RMS cada 20 ms, normalizada con el
percentil 90 y un umbral relativo. El reloj de video integra una velocidad
entre 0,90 y 1,10, suavizada con una constante de 160 ms. El audio no se altera.

Ambas vistas recorren desde el mismo cuadro la secuencia nativa en su orden
original. La intensidad cero produce imágenes idénticas. Se incluyen 7,5 s de
video para una muestra de audio de 6 s: incluso a velocidad máxima no se llega
al final, de modo que este ensayo no necesita resolver el enlace de un bucle.
No implica que ese enlace esté resuelto para narraciones más largas.

Esta variante no busca bocas abiertas/cerradas ni fuerza coincidencias con
pausas: usa energía para modular suavemente el ritmo y mantiene la continuidad
de origen. La correspondencia de labios con el audio puede seguir siendo
incorrecta. La comparación visual pendiente determinará si aporta una mejora.

Se verificaron límites de velocidad y avance positivo para distintas envolventes,
igualdad con intensidad cero, reproducción/pausa/final, vista móvil y hashes de
los HTML anteriores. En una simulación de presentación a 60 Hz, la muestra
recorre 143 cuadros distintos en seis segundos sin retrocesos ni saltos de
índice superiores a uno; no es una medición del rendimiento real del equipo.
Este HTML queda separado de producción y de la futura prueba 4 con nuevos videos.

## Prueba 4: primera toma adicional de Gemini

Fuente disponible: `public/isa-bot/isa-hablando2-video.mp4`, 1280 × 720,
24 FPS, unos 10,03 segundos. El segundo pedido quedó pendiente por
indisponibilidad de Gemini; no hace falta esperarlo para evaluar esta toma.

```powershell
python scripts/preview-isa-new-video.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav --ffmpeg tmp/isa-tools/ffmpeg.exe
node scripts/check-isa-new-video-preview.mjs
```

Abrir `tmp/isa-mouth-preview/index-4.html`. El generador extrae 240 PNG a
`tmp/isa-mouth-preview/video-2/`, aplica el mismo recorte `[300,8,704,704]`,
tamaño 320 × 320 y tratamiento de fondo que los recursos actuales, y genera
cinco atlas WebP locales. No sobrescribe atlas ni manifiestos de producción.
El inventario local registra el hash del video, el recorte y el rango usado.

Tres vistas comparan el video anterior a velocidad constante, la nueva toma
a velocidad constante y la nueva toma con el reloj de ritmo continuo. Las
tres usan los cuadros de origen 24 a 203 como material disponible y el mismo
fragmento de seis segundos de Piper. No existe correspondencia garantizada
entre ese audio y la frase solicitada a Gemini. Intensidad cero iguala las dos
vistas nuevas; no iguala actuaciones distintas. El video completo está disponible
en un apartado independiente, con fondo original, sin Piper y silenciado por
defecto. Sus controles y los de Piper se pausan mutuamente para evitar solaparse.

Esta etapa prepara y compara material, **no fusiona las tomas**. Antes de
combinarlas hay que revisar diferencias de pose/escala y elegir enlaces
compatibles conservando las secuencias intermedias. Más cuadros no garantizan
esas uniones ni sincronización fonética. No hay clasificación automática de
bocas ni selección por visemas en esta prueba.

Se verifican píxeles del nuevo atlas, avance consecutivo del reloj, diferencia
entre tomas, igualdad de las dos nuevas vistas con intensidad cero, reproducción,
video completo, vista móvil y hashes de las pruebas previas y recursos runtime.
La decisión visual y cualquier integración, commit o push siguen pendientes
de revisión con Nahuel.

## Corrección de alcance: prueba 4B, unir las tomas

Nahuel aclaró que comparar tomas por separado no era el objetivo final de la
prueba: había que incorporar tramos nuevos al material anterior. Se conserva
`index-4.html` y se prepara `index-4-fusion.html`. También quedó disponible
`isa-hablando3-video.mp4`, con otros 240 cuadros a 24 FPS, 1280 × 720 y unos
10,03 segundos de duración.

```powershell
python scripts/preview-isa-fusion.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav --ffmpeg tmp/isa-tools/ffmpeg.exe
node scripts/check-isa-fusion-preview.mjs
```

La secuencia usa el original como base. Reemplaza dos intervalos separados por
sendos fragmentos continuos de 30 cuadros (1,25 s) de las tomas 2 y 3; conserva
la duración y el material original fuera de esos intervalos. No agrega imágenes
aisladas ni sobrepone bocas. Son cinco tramos, con cuatro enlaces entre tomas.

El generador propone seis alternativas de enlace para cada inserción. Compara
ojos, contorno de cabeza y cuerpo, excluyendo la zona central de boca, y considera
la diferencia de movimiento en los extremos. Es una propuesta visual para revisar,
no alineación geométrica ni clasificación fonética. El inventario registra también
una diferencia de apariencia de boca, que no certifica un sonido faltante.

El HTML permite alternar enlaces, desactivar cada inserción, comparar fondo
oscuro/blanco y activar el ajuste de ritmo en ambas vistas para una comparación
con el mismo reloj. El valor inicial conserva velocidad fija para inspeccionar
primero las uniones. Las tomas completas siguen en su orden dentro de cada tramo.
Las inserciones pueden generar saltos en los enlaces y no garantizan resolver
las bocas faltantes; el audio de Piper sigue siendo una muestra de comparación.

Todo el material derivado se guarda en tmp. La caché de preparación incluye
hash de la fuente y parámetros de recorte. Se conservan videos fuente, atlas,
manifiesto y todos los HTML anteriores. Se verifican dos inserciones de 30 cuadros,
cuatro enlaces, orden interno, píxeles nativos, igualdad al desactivar ambas,
opciones de enlace, reproducción, reloj de ritmo, exportación y vista móvil.
La selección exportada queda con `reviewed: false` hasta la revisión conjunta.

## Prueba 5: Rhubarb guía un selector local de secuencias

```powershell
python scripts/preview-isa-rhubarb-sequences.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav --ffmpeg tmp/isa-tools/ffmpeg.exe
node scripts/check-isa-rhubarb-sequences.mjs
```

Abrir `tmp/isa-mouth-preview/index-5.html`. El flujo conceptual es:
Groq genera el consejo → `ISA_DIRECTOR=local` prepara gestos, ritmo y pausas →
Piper genera voz → Rhubarb obtiene formas de boca y tiempos → un selector local
elige material de video. El selector de esta prueba es distinto del director
existente; no se cambió el backend ni se incorporó otro modelo o consulta.

El HTML usa 39 marcas **reales ya guardadas** en el WAV `es_long.wav`, recortadas
a sus segundos 3–9, junto con los mismos seis segundos PCM. No vuelve a ejecutar
Rhubarb. Prepara 87 candidatos de 12 cuadros consecutivos (0,5 s), con puntos de
inicio cada seis cuadros, sobre el rango de origen 24–203 de las tres tomas.

Las etiquetas son propuestas visuales: se reutilizan las 51 anotaciones iniciales
de la toma 1 y se añaden 40 por cada toma nueva, revisadas en hojas de contacto
cada seis cuadros. Los intermedios usan la anotación más cercana. No se entrenó
un clasificador, no hay ejemplos confirmados de A/G/H y se usan X/B/C como
aproximaciones. El JSON de inventario registra las anotaciones y deja
`reviewed: false`; no afirmar que todas las formas faltantes estén cubiertas.

El selector minimiza discrepancias con las marcas del audio junto con un costo
de cambios de pose y de secuencias no consecutivas. Prefiere continuar una toma
cuando sigue siendo una opción útil, pero admite saltos. No superpone bocas,
mezcla imágenes, interpola caras ni cambia la velocidad. Las marcas permanecen
en el reloj del audio y no se combinan aquí con el ajuste de ritmo.

Las tres tomas están disponibles, pero no se obliga a usar todas. Con los valores
iniciales, la muestra elige 120 cuadros de la toma 1, 24 de la toma 2 y ninguno
de la toma 3; hay cuatro enlaces no consecutivos. El control de continuidad
permite comparar el compromiso. El cuadro seleccionado, la marca solicitada,
las aproximaciones y las discrepancias se muestran en pantalla; la tabla expone
las decisiones por tramo y se pueden exportar para revisar.

Se verifica que cambiar las marcas, manteniendo el catálogo, cambia las
selecciones; se comprueban tanto un caso controlado como los recursos reales.
También se verifican píxeles nativos, orden interno de cada tramo, reproducción,
tabla, exportación, vista móvil y conservación de los HTML y runtime anteriores.
No se mide precisión fonética ni naturalidad: ambas siguen pendientes de revisión
visual y de mejorar el catálogo si las aproximaciones no alcanzan.

## Prueba 5B: restricciones de continuidad

```powershell
python scripts/preview-isa-rhubarb-sequences.py --stable --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav --ffmpeg tmp/isa-tools/ffmpeg.exe
node scripts/check-isa-stable-sequences.mjs
```

Abrir `tmp/isa-mouth-preview/index-5b.html`. Se conserva `index-5.html` con su
comportamiento original. El nuevo selector empieza en el primer cuadro de la
toma original y mantiene las marcas reales y el mismo catálogo de la prueba 5.

Las reglas son obligatorias, incluso con prioridad de continuidad cero:

- Dentro de la misma toma, continuar exactamente con el siguiente cuadro;
  no retroceder, repetir ni saltar a otra parte de esa toma.
- Al cambiar de toma, no retroceder en el índice de origen ni solapar cuadros;
  se permite adelantar como máximo seis cuadros respecto a la continuación.
- Rechazar enlaces con distancia de pose superior a 0,035, en la métrica visual
  del ensayo. Es un umbral heurístico, no una garantía de calidad perceptiva.
- Después de un cambio, mantener al menos tres bloques de 12 cuadros (1,5 s)
  antes de permitir otro. Al finalizar el audio, la muestra puede terminar antes.

La continuidad se aplica como restricción del grafo, no solamente como costo que
una buena coincidencia de boca pueda superar. El camino original consecutivo
sigue disponible si no hay un cambio compatible. Este control conserva el orden
de índices de origen entre tomas, una restricción deliberadamente conservadora
para el ensayo; no implica que los distintos videos representen la misma frase.

**Resultado de la muestra inicial:** la prueba 5 tenía cuatro enlaces no
consecutivos, con 120 cuadros originales y 24 de la toma 2. La 5B selecciona
144 cuadros consecutivos de la toma original, sin cortes ni tomas nuevas.
Esto recupera continuidad sacrificando las sustituciones; no afirmar que se
resolvió la integración de las nuevas bocas ni la sincronización fonética.
Las restricciones pueden excluir opciones visualmente útiles: falta revisarlas
con Nahuel antes de ajustar criterios o cambiar de enfoque.

La comprobación incluye casos controlados donde las marcas sí eligen una rama
permitida, se rechazan enlaces incompatibles y se impide usar un tramo solapado
aunque el costo de continuidad sea cero. En la muestra real se verifican los
cuatro cortes anteriores frente a cero actuales, avance, píxeles, controles,
reproducción, exportación, vista móvil y conservación de los HTML y runtime.

Se mantiene `ISA_DIRECTOR=local`. La futura prueba 6 comparará los directores
local y Groq con el mismo texto y reglas de animación, después de revisar esta
corrección. Esta comparación no se ejecutó ni se realizaron consultas nuevas a
Groq en la prueba 5B. No se modificó producción ni se hizo commit o push.

## Prueba 6: director local frente a Groq

Se prepararon dos planes reales para el mismo texto, uno con `direct_locally`
y otro con una petición real al modelo configurado, `openai/gpt-oss-20b`.
Ambos se validaron para conservar exactamente el consejo y se sintetizaron
con el mismo worker/modelo/speaker de Piper. Procedimiento y límites:
`clima/app-clima-backend/docs/isa-local/PHASE-6.md`.

```powershell
node scripts/preview-isa-directors.mjs
node scripts/check-isa-directors-preview.mjs
```

Abrir `tmp/isa-mouth-preview/index-6.html`. La página usa el retrato y el reloj
de audio actuales, transpilados de sus fuentes sin modificar la app. Conserva
el material continuo de la 5B, sin sustituciones por Rhubarb. El renderizador
mantiene el frente durante el habla: los gestos pedidos se muestran en tablas,
no se inventa su ejecución. Comparar principalmente ritmo, volumen y pausas,
incluido el silencio final distinto que eligió cada director.

La muestra local tiene tres segmentos y 6,551 s; Groq eligió dos segmentos y
6,994 s. Una petición informó 940 tokens de entrada y 220 de salida (95 de
razonamiento incluidos), total 1160. Es una muestra de dirección aislada con
texto fijo, no el consumo total de la app ni un ahorro promedio medido.
Los audios se sintetizaron por separado sin semilla fija: puede haber variación
de Piper además de la debida al plan.

El HTML funciona sin consultas externas y reproduce una voz por vez. Se
comprobaron texto igual, tiempos `isac` reales, reproducción/pausa/cierre,
exportación, vista móvil, ausencia de red desde la página y hashes de fuentes,
runtime y pruebas previas. Datos y voces derivados quedan en tmp. La revisión
perceptual y cualquier cambio a producción siguen pendientes de Nahuel.

## Prueba 5C: comparar las cuatro combinaciones

```powershell
python scripts/preview-isa-combinations.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav --ffmpeg tmp/isa-tools/ffmpeg.exe
node scripts/check-isa-combinations.mjs
```

Abrir `tmp/isa-mouth-preview/index-5c.html`. Compara solo original, original
con toma 2, original con toma 3 y original con ambas disponibles. El consejo,
los seis segundos de audio, las marcas reales de Rhubarb, las etiquetas visuales
aproximadas y las reglas de selección son comunes a las cuatro opciones.
Se mantiene el director local y no hay llamadas nuevas a Groq.

Se corrige la condición de relojes compartidos de la 5B: la numeración de origen
de videos diferentes no se compara. Se considera la entrada y la salida por
distancia de pose y por diferencia del movimiento entre cuadros. Dentro de cada
inserción se conservan cuadros nativos consecutivos; fuera se conserva el cuadro
original del mismo instante. La duración no cambia. No hay superposiciones,
fundidos, deformaciones, imágenes nuevas ni saltos dentro de cada tramo.

El generador propone 852 inserciones posibles de 24 o 36 cuadros (1 o 1,5 s).
Cada toma nueva puede usarse como máximo una vez y se reserva al menos medio
segundo de original al principio, al final y entre inserciones. El selector
descarta enlaces con distancia de pose mayor a 0,060 o diferencia de movimiento
mayor a 0,040. Estos límites son heurísticos y distintos del umbral 0,035 de la
5B: no atribuir todos los cambios de resultado solamente a los relojes.

Rhubarb orienta la selección comparando las etiquetas visuales de cada tramo
con sus marcas temporales. Se exige reducir al menos dos discrepancias de
etiqueta respecto al tramo original, además de superar los costos de unión.
Esa reducción no mide precisión fonética: las anotaciones siguen siendo
provisionales. El director local existente no se modifica.

Resultado inicial con prioridad de continuidad 1:

| Tomas disponibles | Cuadros original / toma 2 / toma 3 | Uniones |
| --- | --- | --- |
| Solo original | 144 / 0 / 0 | 0 |
| Original y toma 2 | 120 / 24 / 0 | 2 |
| Original y toma 3 | 144 / 0 / 0 | 0 |
| Original y ambas | 120 / 24 / 0 | 2 |

El tramo elegido de la toma 2 usa los cuadros de origen 150–173 y reemplaza los
segundos 0,5–1,5 del audio. La toma 3 no se selecciona con estos valores; no se
fuerza su aparición ni se concluye que nunca sea útil. La tabla del HTML muestra
la combinación disponible y lo usado realmente. El usuario puede comparar el
costo de continuidad y exportar las cuatro decisiones con `reviewed: false`.

Las pruebas incluyen relojes independientes con un enlace sintético desde el
cuadro 111 del original al cuadro 0 de otra toma, rechazo de enlaces por pose y
movimiento incluso con prioridad cero, dependencia de las marcas de audio,
las cuatro combinaciones, preservación del original, orden y píxeles nativos,
reproducción/exportación/vista móvil y hashes de HTML anteriores y runtime.
Siguen pendientes las revisiones visuales de ambos enlaces y la preferencia de
Nahuel. No se modificó producción ni se hizo commit o push.
