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

## Prueba 5D: combinaciones explícitas y selección automática

```powershell
python scripts/preview-isa-explicit-combinations.py
node scripts/check-isa-explicit-combinations.mjs
```

Abrir `tmp/isa-mouth-preview/index-5d.html`. Reutiliza los datos y atlas del
HTML 5C ya generado; si falta, generarlo con el comando de la sección anterior.
No vuelve a consultar Groq, sintetizar voz ni ejecutar Rhubarb. Conserva la 5C,
todos los HTML previos, los videos originales y el runtime de producción.

La 5C podía anunciar tomas disponibles sin usarlas. Esta comparación distingue:

- Tres controles: original completo, toma 2 completa, toma 3 completa.
- Tres parejas reales: original + 2, original + 3 y 2 + 3.
- Las tres tomas realmente presentes.
- Automático: puede elegir cualquiera de las tres bases y sus combinaciones;
  no se fuerza variedad para satisfacer una cuota de tomas.

Para cada combinación explícita se evalúan todas sus posibles tomas base, y se
exige presencia de todas las tomas anunciadas mediante una restricción en la
programación dinámica. Si los límites de pose o movimiento impiden cumplirla,
la opción queda no disponible, sin reproducir una alternativa bajo ese nombre.
Esta restricción es para comparar, no una recomendación de forzar tomas en la app.

Se mantienen los límites heurísticos de pose 0,060 y movimiento 0,040, clips
nativos consecutivos de 24/36 cuadros, un uso por toma adicional, y 12 cuadros
de base en extremos y entre inserciones. La penalización de un par de enlaces
es `8 + 80*(poseEntrada+poseSalida) + 120*(movEntrada+movSalida)` multiplicada por
la prioridad del control. Esto cambia el balance respecto a 5C y prioriza evitar
cortes, sin certificar que sean imperceptibles. No se hacen fundidos ni cuadros
congelados, deformados o interpolados. Las tomas conservan relojes independientes.

La ganancia de etiquetas mínima 2 solo se exige al automático. Las combinaciones
explícitas pueden empeorar ese ajuste para permitir una comparación honesta;
la ganancia se muestra en el detalle, sin llamarla precisión fonética. El
automático compara costos de todas las bases, y a igual costo prefiere menos
inserciones. Las etiquetas manuales siguen siendo aproximadas con A→X/G→B/H→C.

Resultado con el mismo audio fijo de seis segundos y prioridad 1:

| Variante | Cuadros original / 2 / 3 | Uniones |
| --- | --- | --- |
| Original completo | 144 / 0 / 0 | 0 |
| Toma 2 completa | 0 / 144 / 0 | 0 |
| Toma 3 completa | 0 / 0 / 144 | 0 |
| Original + 2 reales | 120 / 24 / 0 | 2 |
| Original + 3 reales | 120 / 0 / 24 | 2 |
| 2 + 3 reales | 0 / 120 / 24 | 2 |
| Las tres reales | 96 / 24 / 24 | 4 |
| Automático | 144 / 0 / 0 | 0 |

El selector no está integrado al director local de la app. Este HTML reproduce
una selección calculada para las marcas de un audio almacenado; no demuestra
selección correcta para cualquier texto nuevo ni mejora visual ya aprobada.
La interfaz muestra uso real, cuadros, tramos, uniones y exporta las ocho
decisiones con `reviewed: false`. La validación perceptual sigue pendiente.

Se verificaron presencia obligatoria o rechazo explícito, ausencia de variedad
forzada en automático, límites incluso con peso cero, relojes independientes,
cuadros nativos consecutivos dentro de cada tramo, píxeles de cada variante,
reproducción y fin de audio, pausa al cambiar, exportación, vista móvil, ausencia
de solicitudes HTTP desde el HTML y hashes de HTML previos/runtime intactos.
No se hizo commit ni push de esta etapa.

## Prueba 3C: selección del original con avances limitados

```powershell
python scripts/preview-isa-forward-sequences.py
node scripts/check-isa-forward-sequences.mjs
```

Abrir `tmp/isa-mouth-preview/index-3c.html`. Reutiliza el HTML 3B ya generado:
exactamente sus dos segundos de Piper, marcas de Rhubarb, atlas originales y
51 etiquetas visuales provisionales editables. No consulta servicios externos.
Conserva los HTML 3B, 5C, 5D y los demás, y no modifica la app ni producción.

En lugar de enlazar clips libremente como 3B, la programación dinámica empieza
en el mismo cuadro original y avanza siempre al menos un cuadro por instante.
No admite retrocesos ni repeticiones. El control permite omitir 0/1/2/4 cuadros
por enlace; 0 es un control que reproduce exactamente el original. Se mantienen
8/12/16 cuadros consecutivos entre enlaces y al final, y un adelanto acumulado
máximo de 12 cuadros. No se estira ni recorta la duración de audio. El adelanto
puede hacer que la actuación se desplace hasta 0,5 s respecto de su reloj original;
esto es una limitación del ensayo y no una certificación de sincronización.

Para aceptar un avance se verifica distancia de pose máxima 0,040 y error de
movimiento máximo 0,025, calculados sobre el desplazamiento real del enlace y
las velocidades nativas de entrada y salida. Los límites siguen activos con
prioridad cero. El costo suma discrepancias de etiquetas (2 por cuadro) y una
penalización de enlace `peso*(2 + omitidos*0,6 + pose*30 + movimiento*40)`.
Si no mejora el costo del original, se conserva y la interfaz lo indica.

Las etiquetas se estiman por proximidad a las 51 anotaciones originales;
A/G/H se aproximan con X/B/C. Excluir una etiqueta retira su referencia, no el
cuadro de la actuación. No hay nuevos dibujos, interpolación, fundidos ni boca
superpuesta. Limitar el tamaño y frecuencia de avances reduce una causa de
tartamudeo (la repetición de actuación), pero omitir cuadros puede seguir siendo
visible. La selección no contempla todavía retorno al reposo de producción.

Con valores iniciales (máximo 2 omitidos, mínimo 12 consecutivos, prioridad 1),
el ensayo elige un enlace y omite 2 cuadros en los 48 instantes. El costo baja
de 74 a 70,42557; son unidades heurísticas, no una precisión o mejora porcentual.
Con máximo 1 se omite 1 cuadro; con máximo 4 y mínimo 12, se omiten 3 en un enlace.
Con prioridad cero y valores iniciales se eligen dos enlaces y 3 cuadros omitidos.
Estos resultados no demuestran que el usuario los perciba mejores que el original.

Se comprobaron conservación del audio y marcas de 3B, ocho/tres opciones de
política combinadas, ausencia de repeticiones/retrocesos, límites y separación
entre enlaces, dependencia de Rhubarb mediante ejemplo controlado, rechazo de
malas uniones incluso con prioridad cero, píxeles nativos, reproducción/final,
exportación con `reviewed: false`, vista móvil y hashes de pruebas previas y
runtime intactos. La validación perceptual de Nahuel queda pendiente. No se hizo
commit ni push ni se reemplazó ninguna prueba previa.

## Prueba 3C con distintas frases

```powershell
python scripts/preview-isa-forward-phrases.py
node scripts/check-isa-forward-phrases.mjs
```

Abrir `tmp/isa-mouth-preview/index-3c-frases.html`. Requiere la 3C ya generada y
los WAV con marcas isav existentes en `../app-clima-backend/tmp/isa-rhubarb/`.
No genera nuevas voces ni llama a Groq/Rhubarb. Genera seis HTML separados con
el mismo selector, controles y etiquetas editables de 3C. No cambia parámetros
ni archivos de las pruebas previas ni código de aplicación.

| Caso | Duración | Uniones / omitidos con parámetros iniciales |
| --- | --- | --- |
| Control 3C aprobado | 2 s | 1 / 2 |
| Español, consejo corto completo | 4,665 s | 0 / 0 |
| Español con pausa artificial | 5,465 s | 0 / 0 |
| Español largo, primera parte | 6,940 s | 1 / 2 |
| Español largo, segunda parte | 6,934 s | 0 / 0 |
| Inglés, primeros seis segundos | 6 s | 3 / 5 |

Los dos tramos largos se cortan en un límite de marcas a los 6,94 s. Sus PCM
concatenados reconstruyen exactamente el audio original de 13,874 s, sin omitir
ni duplicar muestras. Cada tramo se reproduce por separado para conservar una
única pasada nativa por el video; todavía no prueba una actuación continua de
13,874 s, bucles ni retorno al reposo. El control conserva exactamente el inicio
del video (cuadro fuente 80), audio y marcas de 3C; las demás muestras comienzan
en el cuadro fuente 24 para disponer de suficientes cuadros consecutivos.
Por eso el resultado entre casos no se atribuye únicamente al cambio de frase.

El caso de estrés inserta 0,8 s de PCM cero en el consejo corto a los 2,310 s,
conserva intacto el resto de sus muestras y desplaza las marcas existentes.
La X de ese intervalo se añade manualmente, no se presenta como análisis nuevo
de Rhubarb. No es otra frase sintetizada ni prueba de pausa natural. La página
y el inventario distinguen esta derivación. La selección continúa la actuación
durante el silencio y no garantiza labios cerrados. Con etiquetas provisionales
8 de los 20 instantes marcados X coinciden con una etiqueta X seleccionada; esto
es una señal del límite del catálogo/selector, no una medición de precisión real.

La tabla muestra explícitamente qué casos quedan idénticos al original, sin
atribuir a Rhubarb una mejora que no ejecutó. Los costos de selección siguen
siendo heurísticos y la preferencia visual está pendiente de Nahuel.

Se verifican muestras PCM y continuidad de cobertura de audio, pausa artificial
realmente silenciosa sin otros cambios PCM, límites hacia adelante y separación
de enlaces en seis casos, píxeles nativos, control de cero omisiones, reproducción,
fin de audio con duraciones no enteras, exportación con caseId y reviewed:false,
vista móvil, ausencia de HTTP y preservación por hash de HTML anteriores/runtime.
Resultados numéricos en `tmp/isa-mouth-preview/forward-phrases-checks.json`.
HTML y audios derivados quedan en tmp ignorado; los scripts/documentación quedan
disponibles para revisión. Sin commit, push o cambios de producción en esta etapa.

## Comparación de voces: español leyendo inglés

La configuración del worker usa `es_ES-sharvard-medium.onnx`, hablante femenina
1 y fonetizador `es`, para español; para inglés usa `en_US-lessac-medium.onnx`,
hablante 0 y fonetizador `en-us`. La ficha publicada de Sharvard declara español
de España, no soporte bilingüe. Poder generar audio con texto inglés no certifica
que su pronunciación sea correcta ni que sustituya adecuadamente la voz inglesa.

Prueba local con exactamente `Wear a light jacket. It may rain later; bring an umbrella.`:

```powershell
# Desde app-clima-backend, sin cambiar .env ni el worker:
.\.venv\Scripts\python.exe scripts/profile_voice.py --text "Wear a light jacket. It may rain later; bring an umbrella." --language es --output tmp/isa-language-ab/english-with-sharvard.wav
.\.venv\Scripts\python.exe scripts/profile_voice.py --text "Wear a light jacket. It may rain later; bring an umbrella." --language en --output tmp/isa-language-ab/english-with-lessac.wav
# Desde app-clima:
python scripts/preview-isa-language-voices.py
```

Abrir `tmp/isa-mouth-preview/index-3c-voces.html`. Los WAV duran 3,563 y 3,702 s
respectivamente en esta ejecución; una duración similar no mide calidad ni
inteligibilidad. Son dos rutas completas (pesos + fonetizador), no un experimento
que aísle exclusivamente los pesos. Piper puede variar entre ejecuciones.
No se ejecutaron Groq, director ni Rhubarb; no se cambiaron modelos/producción.
Se verificó lectura y reproducción de ambos audios, exclusión mutua al reproducir,
botón detener y ausencia de solicitudes HTTP. Escucha y valoración pendientes.
Todavía no demuestra que usar otra voz resuelva los cortes de animación.

Ficha consultada: https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD

## Isa animada con Cori, Amy y Lessac

```powershell
# Backend: candidatos solo en tmp; se descargan datos, no código externo.
.\.venv\Scripts\python.exe scripts/compare_english_candidates.py --download
.\.venv\Scripts\python.exe scripts/compare_english_candidates.py
# Frontend:
python scripts/preview-isa-english-candidates.py
node scripts/check-isa-english-candidates.mjs
```

Abrir `tmp/isa-mouth-preview/index-3c-voces-animadas.html`. Se conserva el ensayo
anterior de solo audio. Incluye Sharvard en español como referencia de identidad,
Lessac en inglés como control actual y Cori/Amy en inglés a escala normal y con
`length_scale` multiplicado por 1,08. Las cinco muestras inglesas leen exactamente
`Wear a light jacket. It may rain later; bring an umbrella.`. La española es el
consejo corto existente con texto distinto: no sirve para comparar alineación
entre idiomas. La duración no mide semejanza de timbre o precisión de labios.

Los candidatos son en_GB-cori-medium y en_US-amy-medium de piper-voices, revisión
fija `e9ab671f2a0e50a701b34361136ba3e6a3a9eb0c`. Cada ONNX pesa 63.221.984 bytes;
se verifican SHA256 de los pesos y Git blob SHA1/tamaño de config y MODEL_CARD.
Se guardan con sus fichas en `backend/tmp/isa-english-candidates/models/`.
No se reemplazan las voces instaladas ni se modifica worker, settings o .env.

La síntesis ocurre en procesos locales separados con CPU, un hilo por operación,
misma normalización/chunking y pausas entre chunks del worker. Para comparar se
usa hablante 0 en los modelos ingleses y 1 en la referencia Sharvard. Cada audio
inglés se analiza después con Rhubarb `phonetic`, threads 1 y extendedShapes GHX,
igual que producción. Nunca se reutilizan marcas de otra voz o velocidad.
No hay llamadas a Groq. Los procesos no comparten modelos residentes y se
finalizan antes de Rhubarb. Cada síntesis tiene límite de 45 s y Rhubarb de 60 s.

Duraciones de esta ejecución: Lessac 3,366 s; Cori 3,946/4,178 s; Amy 5,154/5,572 s.
La escala 1,08 busca lectura más pausada, pero al sintetizar por separado y sin
semilla fija no implica exactamente 8 % más duración. El código no cambia el
tono ni fuerza la longitud a coincidir con una frase española diferente.

Cada página muestra original continuo frente a 3C con ese mismo audio. Atlas,
etiquetas provisionales, inicio en cuadro fuente 24 y parámetros iniciales son
idénticos. Cambian audio, duración y marcas propias. El ensayo puede conservar
todo el original si no acepta enlaces. No demuestra todavía mejora con otras
frases, reconocimiento de silencio, ciclos largos o retorno al reposo. Escucha
y revisión perceptual pendientes; no se recomienda una voz por su ficha sola.

Se verificaron seis casos con WAV y marcas distintas, hashes de los audios,
duración, límites/separación de enlaces hacia adelante, píxeles nativos, control
cero omisiones, reproducción/fin/exportación, vista móvil, ausencia de HTTP y
preservación de HTML previos/runtime. Reportes en los archivos temporales
`english-voices-animated-inventory.json` y `english-voices-animated-checks.json`.
No se hizo commit/push ni cambio de aplicación o producción.

Fichas de voces (las condiciones se revisan individualmente antes de distribuir):
- https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/medium/MODEL_CARD
- https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/amy/medium/MODEL_CARD

## 3C inglés: ritmo de animación con las dos voces pausadas

```powershell
python scripts/preview-isa-english-rhythm.py
node scripts/check-isa-english-rhythm.mjs
```

Abrir `tmp/isa-mouth-preview/index-3c-ingles-ritmo.html`. Conserva español y las
pruebas previas por hash. Reutiliza exactamente audios, marcas, cuadros y etiquetas
de las páginas Cori/Amy con length_scale ×1,08; no genera otra voz ni consulta APIs.
La selección 3C original (máximo 2 omitidos, mínimo 12 consecutivos, peso 1) se
mantiene como base. Izquierda usa su reloj actual y derecha modifica suavemente
el reloj sobre esa misma secuencia, sin cambiar el sonido.

El reloj inglés se calcula mediante programación dinámica en bloques de 125 ms,
empezando con velocidad 1. Integra rampas lineales continuas de velocidad. Las
tasas permitidas son `1 + intensidad*0,1*(índice-2)`, índice 0–4; entre bloques
el índice solo puede variar una unidad. El costo suma discrepancias de etiqueta
muestreadas dentro del bloque, penalización 0,12 al cuadrado del cambio de índice
y 0,025 al cuadrado de su separación del índice neutro. No usa el tono de voz.
Es una heurística sobre etiquetas aproximadas, no alineación fonética medida.

Intensidad cero reproduce el mismo reloj y cuadros de 3C, incluido el último
cuadro en duraciones no enteras. El reloj adaptado conserva el orden de la ruta
3C y sus uniones heredadas. Al ralentizar dura más cada cuadro; al acelerar
avanza su presentación. No interpola imágenes ni superpone bocas. Puede alcanzar
cuadros nativos posteriores al final de la ruta si su fase termina adelantada.
No soluciona todavía reposo en silencio, vueltas del video o transición final.

Se eligieron valores iniciales diferentes para que haya cambios reales visibles:

| Voz pausada | Intensidad inicial | Velocidad elegida | Fase final / audio |
| --- | --- | --- | --- |
| Cori | 1 | 0,90×–1,20× | 4,453 / 4,178 s |
| Amy | 0,75 | 0,925×–1,075× | 5,478 / 5,572 s |

En esta frase Cori mantiene exactamente 3C con intensidades 0–0,75; solo en 1
elige un reloj diferente. La interfaz muestra límites permitidos y velocidades
efectivas, sin atribuir cambios donde no los hay. Amy cambia desde 0,25. Estos
resultados se ajustan a una única frase y no establecen preferencias auditivas o
visuales. La aprobación corresponde a Nahuel tras comparar la reproducción.

Se verifican dependencia de las marcas mediante un ejemplo controlado, intensidad
cero idéntica, fase monótona, continuidad de fase y velocidad en las uniones,
velocidad acotada, índices de origen válidos, preservación del plan 3C izquierdo,
audio/marcas idénticos a cada muestra original, píxeles nativos, reproducción,
exportación con reviewed:false, vista móvil, ausencia de HTTP y hashes de español,
HTML anteriores y runtime intactos. Reporte en `english-rhythm-checks.json` dentro
de tmp. Sin commit, push ni integración a la aplicación en esta etapa.

## 3C español/inglés: pausas detectadas en el audio

```powershell
python scripts/preview-isa-pauses.py
node scripts/check-isa-pauses.mjs
```

Abrir `tmp/isa-mouth-preview/index-3c-pausas.html`. Compara Sharvard español,
Cori/Amy inglesas pausadas y el control español con 0,8 s de silencio artificial.
Cada WAV, marca de Rhubarb y cuadro proviene de su prueba anterior, sin volver a
sintetizar ni consultar servicios. La izquierda conserva 3C original y la derecha
añade solo la modulación de pausas. No incorpora el reloj inglés del ensayo
anterior: se aísla esta variable. Español aprobado y HTML previos quedan intactos.

El detector trabaja sobre PCM16, con RMS en ventanas de round(sampleRate*0,01)
muestras (aproximadamente 10 ms). El umbral de entrada es el percentil 90 RMS
menos 30 dB, acotado entre −50 y −38 dBFS; el de salida es el doble. Se requieren
50 ms, margen de 60 ms respecto a extremos y energía cercana suficiente antes
y después. No depende de texto, puntuación, número de oraciones o una X de
Rhubarb. Es baja energía acústica estimada: puede clasificar consonantes poco
sonoras como pausa y perder silencios muy cortos. No se presenta como VAD fiable.

Se detectaron 5 intervalos en español, 4 en Cori y 5 en Amy, con estos audios.
En el control artificial se detecta 2,315–3,103 s frente al intervalo conocido
2,310–3,110 s; el detector no recibe esa anotación. La barra y tabla muestran
exactamente los intervalos usados para que la revisión auditiva pueda corregir
una falsa interpretación, en lugar de atribuir a puntuación una pausa inventada.

El reloj de pausas se integra cada 5 ms. La reducción de velocidad entra y sale
con rampas smoothstep de 35 ms y una respuesta exponencial de 25 ms. La intensidad
inicial es 0,8; cero conserva exactamente el reloj 3C. La tasa objetivo mínima
es 1−0,65*intensidad, nunca cero. Para limitar retraso acumulado se reduce el freno
cuando el desfase se acerca a 0,2 s y se recupera suavemente con un objetivo de
hasta 1+0,06*intensidad, sin saltar la fase ni corregir el final de golpe.

Con intensidad 0,8 las tasas efectivas mínimas rondan 0,546× y las máximas 1,048×.
Los desfases finales son aproximadamente 101 ms (es), 124 ms (Cori) y 94 ms (Amy).
La fase siempre avanza, sigue la actuación de habla y conserva uniones de 3C.
Al desacelerar permanece más tiempo cada cuadro completo; ojos/cabeza también
se ralentizan. No hay rig ni boca separada: no se garantiza cierre/relajación de
labios en cada pausa. En pausas largas, el límite de desfase vuelve a acercar la
tasa a 1; no se ofrece esto como solución definitiva de silencios largos.

Se comprobaron detección PCM con silencio controlado, exclusión de un hueco de
20 ms, ausencia de dependencia textual, conservación byte a byte de cada audio,
marcas/cuadros idénticos a la referencia, intensidad cero idéntica, avance
monótono positivo, límites de cuadros, respuesta de tasa en pausas, reproducción,
píxeles nativos, exportación reviewed:false, vista móvil, ausencia de HTTP y hashes
de español/HTML anteriores/runtime intactos. Reportes temporales:
`pause-comparison-inventory.json`, `pause-comparison-checks.json`.
La naturalidad, falsos positivos acústicos y coordinación de labios quedan para
revisión de Nahuel. Sin commit/push ni cambio de app, backend o producción.

## 3C: microhuecos acústicos sobre las pausas aprobadas

```powershell
python scripts/preview-isa-micro-pauses.py
node scripts/check-isa-micro-pauses.mjs
```

Abrir `tmp/isa-mouth-preview/index-3c-micropausas.html`. Usa únicamente las tres
muestras naturales anteriores: Sharvard español y Cori/Amy inglesas pausadas.
No añade el control artificial de 0,8 s. La izquierda reconstruye exactamente
`pauseTimeline(..., 0.8)` de la prueba anterior. La derecha añade un reloj de
microhuecos sin cambiar WAV, marcas, cuadros, etiquetas o selección base 3C.

Se analizan ventanas PCM de aproximadamente 5 ms con umbral de entrada igual a
la mitad del anterior, acotado superiormente a −50 dBFS, y salida 1,5 veces mayor.
Se admiten huecos de 18 a menos de 50 ms, con energía alrededor, fuera de los
extremos de 80 ms y sin tocar pausas anteriores más su margen de 15 ms. No se
etiquetan como límites de palabras: pueden ser cierres consonánticos internos.
El criterio no crea intervalos donde la voz sigue enlazada. Encontró 2 huecos
en español, 3 en Cori y 2 en Amy con estas grabaciones.

Cada hueco propone un núcleo de retención de hasta 16 ms con rampas smoothstep
de 8 ms. La intensidad inicial 1 limita mucho el avance, sin cambiar al gesto de
reposo; la intensidad 0,5 suaviza el efecto. El presupuesto de retraso extra se
reduce al acercarse a 80 ms, por lo que el núcleo no implica congelamiento exacto
del reloj. La recuperación suma como máximo 0,025× y solo fuera de micropausas y
pausas previas. Se integra cada 2 ms sobre la velocidad del reloj aprobado.
Las pausas anteriores conservan intervalos/parámetros, pero un desfase nuevo puede
cambiar el cuadro que cae en ellas. No se afirma que el resultado visual sea igual.

En intensidad cero o sin huecos se reutilizan exactamente las filas del reloj
anterior, sin recomputación aproximada. Los cuadros contienen ojos/cabeza/boca:
retener una imagen afecta todo el rostro. Su cadencia nativa de 24 FPS no permite
un nuevo dibujo para cada microevento de 20 ms; la revisión perceptual es esencial.
No hay interpolación ni cuadros generados ni movimientos de labios independientes.

Resultados con intensidad 1 (no son precisión fonética):

| Voz | Microhuecos nuevos | Máximo retraso extra | Retraso extra final |
| --- | --- | --- | --- |
| Sharvard es | 2 | 19,0 ms | 7,5 ms |
| Cori pausada | 3 | 42,9 ms | 3,5 ms |
| Amy pausada | 2 | 30,8 ms | 0,5 ms |

Se verificaron detector sobre PCM controlado y exclusión de voz continua/gaps
muy cortos/largos y pausas ya cubiertas, identidad exacta a intensidad cero,
preservación del reloj izquierdo, audio/marcas/cuadros anteriores idénticos,
fase monótona, índices nativos, retraso adicional acotado, estado de habla,
píxeles, reproducción/fin/exportación, vista móvil, ausencia de HTTP y hashes de
HTML previos/runtime intactos. Reportes temporales `micro-pause-inventory.json`
y `micro-pause-checks.json`. Validación auditiva/visual y falsos positivos pendientes.
No se cambió la app, backend ni producción; no se hizo commit o push.
