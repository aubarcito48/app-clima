# Isa 3C con pausas y micropausas

Integración aprobada por Nahuel el 15/11/2026. Español: Sharvard F=1 sin cambiar
su velocidad base. Inglés: Cori medium, `length_scale` multiplicado por 1,08.
El director local sigue organizando la actuación; Groq genera el consejo del clima.
Rhubarb obtiene marcas de boca del WAV. Estos ajustes no agregan consultas a Groq.

`isa-playback.ts` analiza el WAV PCM16 mono de 22.050 Hz y las marcas `isav` antes
de iniciar el audio. El reloj se suaviza durante pausas reales y huecos acústicos
breves; estos últimos no se consideran necesariamente límites de palabras.
No se agrega silencio a la voz ni se cambia al estado de reposo en esas pausas.

Se conservan los cuadros completos del video y su interpolación, parpadeos,
movimientos de cabeza, ciclo nativo y salida hacia una boca cerrada. El selector
solo avanza, con tramos mínimos de 12 cuadros, saltos máximos de 2 y límites de
distancia visual. Las etiquetas de boca del catálogo siguen siendo provisionales.
En audios largos, los ciclos completos mantienen los 180 cuadros nativos para
evitar repeticiones o congelamiento al agotar un tramo; el último ciclo parcial
puede usar la selección 3C. El reloj adaptativo se aplica durante todo el audio.

El análisis respeta límites de tamaño, duración y número de marcas. Si falta el
análisis Rhubarb o el formato no es válido, se conserva el reproductor anterior.
Cambiar de ciudad, idioma o silenciar cancela también un análisis pendiente.
La preferencia de movimiento reducido permanece vigente.

## Verificación

- Comparación del reloj y cuadros contra las muestras aprobadas de español,
  Cori y Amy: mismos resultados a 120 comprobaciones por segundo.
- Audios reales de más de 13 segundos: reloj monótono, ciclo nativo conservado.
- Pruebas unitarias de voz y retrato, suite del backend y build de Angular.
- Reconstrucción completa del [archivo de las pruebas](reference-2026-11-15/README.md).

Las pruebas visuales aisladas no garantizan sincronización perfecta para cualquier
texto. Tras desplegar se debe observar la latencia y memoria reales de Render;
las mediciones locales no sustituyen esos datos. Configuración requerida:
`ISA_DIRECTOR=local`, `ISA_LIP_SYNC=rhubarb` y el tiempo de espera de Rhubarb
configurado para permitir el análisis completo (en la prueba, 60 segundos).

## Variante inglesa del panel 3

Por pedido posterior de Nahuel, Cori utiliza los cuadros completos de
`isa-video-ingles.mp4`, su catálogo de boca y las pausas/micropausas del audio real.
El español conserva su configuración aprobada. La selección del idioma afecta
tanto el análisis 3C como el atlas del retrato. El ciclo inglés dura siete segundos
y conserva todos sus cuadros en vueltas completas; el cierre usa sus propias
referencias. Detalles y validación en [CORI-ENGLISH-VIDEO.md](CORI-ENGLISH-VIDEO.md).

## Seguimiento inglés v2

Nahuel aprobó publicar la [selección inglesa v2](ENGLISH-FRAME-ALIGNMENT-V2.md)
el 16/11/2026. Solo inglés sigue ahora las marcas Rhubarb también en los ciclos
completos, con retenciones/saltos de un cuadro, desvío máximo de ocho cuadros y
extremos de ciclo conservados. Su reloj usa el tiempo directo del WAV para no
sumar un segundo ajuste acústico a la selección alineada. El catálogo inglés
refina varios cierres revisados visualmente. Español conserva el comportamiento
descrito inicialmente. Se mantienen voz Cori, director y backend actuales.

El código activo coincide con los planes y tiempos de la comparación aprobada;
esto mejora el seguimiento, sin prometer coincidencia fonética perfecta.
