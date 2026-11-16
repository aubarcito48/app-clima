# Cori 3C: texto cálido y lluvia

Prueba aislada solicitada por Nahuel para comparar tiempos de voz con esta frase:

> Wear a light sweater or tee and a short‑sleeve shirt; the day feels warm at 25°C with mild wind. Bring an umbrella when it starts to rain around midday.

La fuente exacta está en `cori-warm-rain.txt` y el WAV real en
`cori-warm-rain.wav`, SHA-256
`e27508820d2a33834234e8f43eae02eddc20f9fad0c3157e0697763b64017089`.
Se generó localmente con el backend actual: Cori medium, multiplicador de síntesis
1,08, director local y Rhubarb. No hay consultas a Groq, reproducción acelerada
ni pausas artificiales adicionales. No se añade saludo o despedida de la app:
esta muestra aísla únicamente el texto solicitado.

```powershell
node scripts/preview-isa-cori-custom-text.mjs
node scripts/check-isa-cori-custom-text.mjs
```

El generador empaqueta el renderizador y reloj actuales desde su código fuente,
con atlas incrustados; no depende de acceder al backend al abrir el HTML. Abrir
`tmp/isa-mouth-preview/index-3c-cori-texto-calido-lluvia.html` con Live Server.
Los parámetros `--wav`, `--text-file` y `--output` permiten preparar otros casos
en archivos separados, usando un WAV con marcas Rhubarb propias de ese texto.

Esta grabación dura **10,049 segundos**, con 8 pausas y 8 microhuecos acústicos
detectados; recorre dos tramos del ciclo inglés. Los microhuecos no prueban límites
lingüísticos entre palabras. La página muestra los intervalos, posición temporal,
controles nativos de audio y exportación de tiempos, además del cambio de tema.

Verificado en Chromium: texto exacto y hash del audio, lectura completa con el
retrato inglés actual, cierre, filtro oscuro, tabla de pausas, ancho móvil,
exportación y ausencia de errores o solicitudes HTTP. La revisión auditiva y
visual queda pendiente de Nahuel. No cambia producción; sin commit ni push.

## Comparación posterior de velocidades y recuperación de pausas

Se conserva el HTML anterior intacto. La comparación está en
`tmp/isa-mouth-preview/index-3c-cori-texto-calido-lluvia-ajuste.html`.

```powershell
node scripts/preview-isa-cori-timing-comparison.mjs
node scripts/check-isa-cori-timing-comparison.mjs
```

La grabación 1,08 anterior se conserva byte por byte. Las nuevas 1,20 y 1,30 están
en `cori-timing-variants`, con texto, duración y hashes en su manifiesto. Se
sintetizaron con el worker actual mediante un override en memoria del factor de
Piper, sin editar el backend, configuración ni entorno. Cada WAV lleva análisis
Rhubarb propio. No se cambia `playbackRate`: todas se escuchan a velocidad 1×.

| Factor de síntesis | Duración real | Pausas | Microhuecos |
| --- | --- | --- | --- |
| 1,08 (actual) | 10,049 s | 8 | 8 |
| 1,20 | 10,804 s | 5 | 12 |
| 1,30 | 11,686 s | 6 | 11 |

Izquierda: reloj actual con la voz elegida. Derecha: las mismas secuencias del
rostro completo con un reloj experimental de pausa/recuperación local. Una curva
smoothstep retiene hasta 100 ms, proporcional a la duración del hueco, y recupera
con una aceleración máxima de 0,15×. Los desfases se combinan por máximo, no suma.
El reloj es monótono, no adelanta al audio y vuelve a desfase cero al finalizar.
No se aplican además las retenciones del reloj anterior: eso duplicaría el ajuste.
Se acota también el final de un tramo parcial para evitar un retroceso fraccional.

La barra conserva todas las marcas reales del WAV: amarillo para pausas, azul
para microhuecos y cursor de reproducción. Se puede recorrer con clic o slider,
escuchar desde cada intervalo y exportar la comparación. Desactivar el ajuste
del retrato derecho lo hace usar exactamente el mismo reloj de la izquierda.

Las tres muestras pasaron verificaciones a intervalos de 1 ms: retraso máximo
100 ms, velocidad del reloj entre 0,40× y 1,15×, final sin retraso, índices de
cuadros monótonos. Chromium verificó selección de voces, marcas, cursor,
reproducción/cierre, control sin cambios, exportación y ancho móvil sin red.
Las capturas esperan a que termine la entrada al habla antes de comparar rostros.

Esto no garantiza boca cerrada en cada pausa ni alineación por palabra: conserva
la actuación completa disponible y sus límites. La naturalidad debe evaluarse
por Nahuel antes de considerar integración. No se cambió producción.
