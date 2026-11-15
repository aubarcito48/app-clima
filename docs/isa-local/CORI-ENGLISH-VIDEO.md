# Cori con la primera toma inglesa

Prueba aislada del 15/11/2026. No modifica la app publicada, backend, variables,
atlas de producción ni HTML anteriores. Sin consultas a Groq ni nueva síntesis.

```powershell
python scripts/preview-isa-cori-english-video.py --ffmpeg tmp/isa-tools/ffmpeg.exe
node scripts/check-isa-cori-english-video.mjs
```

Requiere haber reconstruido las referencias mediante
[el archivo de pruebas](reference-2026-11-15/README.md), Python con NumPy/Pillow,
Node y Chromium de Playwright. El video nuevo es
`public/isa-bot/isa-video-ingles.mp4`; su hash queda en el inventario.

Abrir con Live Server `tmp/isa-mouth-preview/index-3c-cori-video-ingles.html`.
Hay tres paneles:

1. Original y selección 3C con pausas/micropausas aprobadas.
2. Video nuevo inglés continuo con el mismo tratamiento acústico.
3. Video nuevo inglés con ese reloj y selección Rhubarb/3C conservadora.

Un solo audio de Cori alimenta los tres. Se puede elegir entre las síntesis
normales y pausadas existentes; cada una conserva sus propias marcas, detección
de pausas y microhuecos. No se reutilizan tiempos de otra grabación. La muestra
predeterminada es la versión pausada aprobada (multiplicador de síntesis 1,08).
No se agrega silencio a la voz ni se fuerza una pausa entre cada palabra.

Los nuevos cuadros conservan el rostro completo a 24 FPS, con el mismo recorte
que el original. Se anotaron provisionalmente formas de boca cada cuatro cuadros
del nuevo video: son aproximaciones visuales, no reconocimiento de fonemas.
Los saltos se limitan a dos cuadros, tramos de al menos doce y los umbrales de
pose/movimiento anteriores. En ambas muestras el selector nuevo eligió **cero
saltos**: los paneles 2 y 3 son iguales con estos parámetros. No se relajan las
restricciones para fabricar una diferencia.

El control de micropausas solo modifica el reloj de los paneles nuevos. El
desfase permite adelantarlos o retrasarlos hasta 160 ms para diagnóstico; cero
es la referencia inicial. Ninguno de estos controles modifica el WAV. Se puede
exportar la combinación elegida y sus datos para comparar con el segundo video.

Verificado: conservación de audio, marcas y referencia anterior; hashes de las
fuentes; selección monótona y acotada; reproducción/fin, cambio de voz, recorrido,
exportación, cuadros visibles y ancho móvil en Chromium, sin solicitudes HTTP.
Resultados y capturas en `tmp/isa-mouth-preview/english-take-1`.

La evaluación de naturalidad queda pendiente de Nahuel. La frase dura alrededor
de cuatro segundos: esta prueba no valida aún otros consejos, bucles ni el cierre
final del reproductor de producción. Prueba conservada en un commit local por
pedido de Nahuel, sin push ni integración en producción. Revisión pendiente.
