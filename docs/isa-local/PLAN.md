# Isa: dirección y boca locales, en tres commits

Se inicia por StitchWeather. Esta etapa no cambia el comportamiento publicado.
No se entrenó un modelo ni se promete precisión fonética con los recursos actuales.

## Commit 1: inventario y banco de revisión

- Auditar los atlas que realmente importa `isa-portrait.ts`.
- Generar hojas de contacto de todos los fotogramas, con su índice de atlas y de
  origen, conservando las marcas de boca cerrada del manifiesto existente.
- Registrar tamaño, frecuencia, cobertura y hash de los recursos para que las
  futuras anotaciones correspondan a una versión concreta.
- Describir el flujo actual y las condiciones para evaluar los siguientes pasos.

Para reproducir desde la raíz del frontend, con Python y Pillow:

```powershell
python scripts/audit-isa-assets.py
```

Salida local: `tmp/isa-local-audit/inventory.json` y `speech-page-0.jpg` a
`speech-page-4.jpg`. No consulta servicios, reproduce audio, modifica originales
ni cambia el código ejecutado por la app. Las hojas quedan fuera de Git.
El inventario revisado se conserva en [assets-baseline.json](assets-baseline.json).

### Línea de base real

El renderizador usa un retrato con pistas para despertar, dormir y mirar, más
un atlas separado de habla obtenido de `isa-hablando-video.mp4`. Durante la voz
mantiene el retrato mirando al frente y reproduce de manera continua los cuadros
del habla; no salta a la pose neutra entre frases.

El WAV ya se analiza localmente para obtener energía RMS cada 40 ms. Sin embargo,
`setMouthOpening` del renderizador actual no modifica la boca y el componente no
le conecta esa señal. La reproducción usa el reloj del audio, ajustado por el
ritmo de los segmentos; no es sincronización por fonemas. Groq todavía elige el
plan de segmentos que Piper interpreta para el ritmo, volumen y pausas.

Esto corrige la descripción histórica del README que hablaba de superponer un
recorte de boca: ese no es el camino activo del retrato actual.

Más FPS por sí solos no agregan formas de boca ni información del audio. Hay que
comprobar variedad de bocas, alineación del rostro y continuidad antes de elegir
fotogramas. Saltar entre dos cuadros con cabezas o cuerpos diferentes podría
reintroducir los movimientos que ya corregimos.

## Commit 2: director local, separado de la boca

Pendiente. Probar un director determinista en el backend que reciba el consejo
aprobado y produzca segmentos compatibles con el contrato actual, con el mismo
texto, límites de velocidad/energía y catálogo real de Isa. Groq generaría el
consejo; esta dirección dejaría de pedirse al modelo en el modo local.

Primero será un modo de prueba seleccionable en configuración, comparado con
el director actual. No se reemplaza toda la actuación antes de revisarla. Medir
tokens reales en ambos modos con el mismo contexto y varias muestras; no confundir
menos instrucciones con una garantía de menor coste para cada respuesta aislada.

Criterios: texto intacto, plan válido, resultados repetibles, español/inglés,
cancelación y silencios correctos. No agregar gestos que los recursos no soportan.

## Commit 3: boca guiada por el audio

Pendiente. Preparar un prototipo aislado que compare el bucle actual con una
selección local guiada por audio usando exactamente el mismo WAV. No publicar
un cambio en la boca antes de revisar continuidad y correspondencia con la voz.

Separar dos niveles: energía/silencio puede mejorar apertura y cierre; distinguir
formas fonéticas necesita visemas y marcas de tiempo. Entrenar un clasificador de
imágenes solo etiqueta lo que ve: no aporta por sí mismo la sincronización ni
genera las formas faltantes. No presentar RMS como un clasificador fonético.

Si los atlas no permiten un resultado continuo, conservar el renderizador actual
y entregar una lista concreta de recursos nuevos: bocas cerrada, entreabierta,
abierta, redondeada y estirada, más las que justifique el inventario fonético.
Misma cámara, escala, luz y pose; separar la boca del movimiento de cabeza/cuerpo
cuando el formato de producción lo permita. Las categorías definitivas dependerán
de los sonidos que podamos representar, no de asumir que cinco vocales bastan.

### Evaluación compartida

Usar frases cortas y largas con pausas, cierre de labios en m/p/b, vocales abiertas
y redondeadas, español e inglés, voz pausada/reanudada, fin de audio, silencio,
cancelación y movimiento reducido. Comparar con audio idéntico y revisar en móvil
y escritorio. Medir tiempos y recursos; cualquier valoración de naturalidad se
anota como observación, no como un porcentaje de precisión inventado.
