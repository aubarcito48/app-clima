# Selectores de frames por idioma

La app conserva un motor Rhubarb compartido. Cada WAV mantiene sus propias
marcas `isav`; el idioma conocido de la solicitud decide qué selector aplicar.
Rhubarb no detecta el idioma ni mezcla los análisis de distintos audios.

- `isa-frame-selector-es.ts`: catálogo, etiquetas y selección españoles.
- `isa-frame-selector-en.ts`: catálogo, etiquetas y selección ingleses.
- `isa-playback.ts`: lee el WAV, calcula el reloj y deriva al selector adecuado.
- `isa-mouth-cue.ts`: contrato de tiempos y etiquetas, sin reglas de actuación.

Esta extracción conserva los resultados de ambos selectores, incluidos los
ciclos completos nativos. No activa una nueva sincronización inglesa ni cambia
los audios, atlas, etiquetas visuales, director o parámetros de Rhubarb.
Los futuros ajustes de selección inglesa se realizan en su módulo propio.

La precisión perceptual sigue pendiente: el catálogo inglés es provisional y
los ciclos completos todavía conservan la secuencia original. La separación
permite resolverlo sin modificar el selector español aprobado.

Validación reproducible: `node scripts/check-isa-playback-runtime.mjs` comprueba
los resultados frente a las referencias aprobadas; la comparación de Cori se
genera y verifica con los comandos de `CORI-ENGLISH-DIRECTOR-V1.md`.
