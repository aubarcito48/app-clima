# Cori: seguimiento inglés de las marcas Rhubarb

Comparación posterior a la separación de selectores, aprobada por Nahuel para
producción el 16/11/2026. Conserva los WAV del director inglés y sus marcas
Rhubarb. La integración activa su selección y reloj en inglés; conserva motor,
backend, voz, director, español, atlas e imágenes.

## Hallazgos

El selector activo conserva los ciclos completos nativos de siete segundos sin
adaptar sus frames a las marcas de boca. En los tramos cortos solo admite saltos
hacia delante. El ajuste de silencios cambia el reloj, pero no puede fabricar
una boca cerrada donde la secuencia disponible muestra una boca abierta.

El catálogo inglés tiene anotaciones visuales cada cuatro frames y asigna a los
intermedios la etiqueta más cercana. La revisión de recortes por cuadro confirma
varios cierres omitidos y un candidato X con labios separados (índice 72).
Los refinamientos seleccionados se guardan en
`english-frame-alignment-v2/visual-label-review.json`. El índice 140 conserva X:
la inspección del cuadro completo confirma la boca cerrada. La revisión es
visual y parcial, no reconocimiento de fonemas ni garantía de sincronía exacta.

## Selección experimental

`scripts/isa-english-frame-alignment.mjs` calcula un plan por ciclo, incluidos los
completos, contra los tiempos originales del WAV. Puede retener un cuadro o
saltar uno; limita la desviación a ocho cuadros y exige cuatro avances nativos
entre modificaciones. Los saltos conservan los límites de pose 0,04 y movimiento
0,025. Cada ciclo completo empieza y termina en los mismos cuadros originales.
La interpolación sigue los pares elegidos para no retroceder durante retenciones
ni congelarse al final del ciclo. No hay saltos hacia atrás dentro de un ciclo.

El lado izquierdo conserva el reloj y la selección actuales; el derecho usa el
tiempo directo de audio con el plan nuevo. No se apila el reloj experimental de
pausas encima de ese plan. Esta comparación evalúa el conjunto; no atribuye la
mejora a una sola de sus decisiones. Ambos lados usan el mismo renderizador,
video y audio a velocidad 1×. La etiqueta Rhubarb del instante se muestra debajo
del control de tiempo.

## Resultados diagnósticos

Ambos planes se miden con el mismo catálogo inglés refinado. Las formas A/G/H
siguen agrupadas con X/B/C por falta de referencias específicas en el catálogo.

| Grabación | Coincidencia actual | Coincidencia ensayo | Cierres actuales / ensayo |
| --- | --- | --- | --- |
| Director actual | 63/241 (26,1 %) | 81/241 (33,6 %) | 11/42 / 13/42 |
| Director pausado v1 | 51/252 (20,2 %) | 79/252 (31,3 %) | 5/47 / 13/47 |

Son coincidencias entre etiquetas a 24 muestras/s, no porcentajes de precisión
fonética ni de naturalidad. La correspondencia todavía es insuficiente para
afirmar sincronización exacta. Falta revisar las etiquetas restantes y decidir
cuánta variación de tiempo se puede aceptar sin afectar la naturalidad de cabeza
y cuerpo. Un video de actuación fija, limitado a avanzar por su secuencia,
no garantiza que toda forma requerida esté disponible en el instante necesario.

## Reproducción y validación

```powershell
python scripts/review-isa-english-mouths.py
node scripts/preview-isa-english-frame-alignment.mjs
node scripts/check-isa-english-frame-alignment.mjs
node scripts/check-isa-playback-runtime.mjs
```

El script de recortes requiere Pillow en ese Python. El generador y verificador
usan las dependencias Node existentes; no consultan APIs ni vuelven a sintetizar.

Abrir `tmp/isa-mouth-preview/index-3c-cori-seleccion-ingles-v2.html` y probar
primero «Director inglés pausado v1». Desactivar el seguimiento iguala los dos
relojes como control. La exportación conserva los planes, marcas y hashes;
no incluye copias base64 del audio.

Verificado con dos WAV de Cori y un audio inglés largo archivado: planes
monótonos a 240 muestras/s, posiciones y saltos acotados, extremos del ciclo,
pausas/reproducción/fin, idioma inglés en ambos retratos, control A/B,
exportación, temas claro/oscuro, ancho móvil y funcionamiento sin HTTP.
Se comprueban hashes del audio y video fuente y la conservación de los archivos
durante la generación/verificación de la comparación. Las referencias españolas
mantienen sus resultados. El selector de producción inglés reproduce los planes
y tiempos de la v2 a 240 comprobaciones por segundo en las tres grabaciones.

## Integración aprobada

`isa-frame-selector-en.ts` contiene la política de la v2. El catálogo inglés
incorpora los refinamientos de cierre; `isa-playback.ts` usa su reloj directo
solo para `en`. El español conserva selector, catálogo y reloj anteriores.
El perfil de voz inglés `paced-v1` sigue optativo: esta integración no cambia
la síntesis de Cori ni las reglas del director del backend.

La referencia anterior está congelada desde el commit `b32340a` en
`scripts/reference/isa-playback-before-english-v2.mjs`, un bundle de verificación
que no se importa en la app. Así la comparación no cambia su lado izquierdo al
activar la v2. Sus indicadores `reviewed:false`/`productionChanged:false` describen
la exportación diagnóstica original y el generador, no el estado del despliegue.

Además de la comparación, pasan la compilación de producción, las 23 pruebas de
voz/retrato y cuatro casos de reproducción de ambos idiomas en móvil/escritorio.
La aprobación del avance no implica sincronización perfecta: los cierres y la
naturalidad conservan los límites descritos arriba.
