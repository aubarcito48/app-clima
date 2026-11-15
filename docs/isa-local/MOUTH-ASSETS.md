# Selección de imágenes para las bocas de Isa

Revisión visual y organización del 15 de noviembre de 2026. Son candidatas
para una prueba de sincronización; todavía no están integradas en el renderizador.

Ubicación: `public/isa-bot/rhubarb/original/`.

Los JFIF maestros y `isa-originales-backup/` quedan solo en el equipo y están
ignorados por Git. El repositorio conserva los 18 WebP, esta guía y el registro
de selección. En un clon nuevo, los WebP permiten continuar la prueba sin los
JFIF; conservar aparte una copia de los maestros para futuras ediciones.
Angular excluye del build tanto el backup como toda la carpeta `rhubarb/`:
estos candidatos no se publican hasta revisar e integrar la animación.

| Archivo | Procedencia | Estado visual |
| --- | --- | --- |
| `isa-mouth-A.jfif` | Última A, antes `isa-mouth-A-new-rama.jfif` | Cierre sin dientes; probar junto al reposo |
| `isa-mouth-B.jfif` | B-v4 | Apertura pequeña con dientes visibles |
| `isa-mouth-C.jfif` | C | Apertura media, diferenciada de B |
| `isa-mouth-D.jfif` | D | Apertura amplia, diferenciada de C |
| `isa-mouth-E.jfif` | E | Apertura redondeada |
| `isa-mouth-F.jfif` | F | Labios más fruncidos y abertura menor que E |
| `isa-mouth-G.jfif` | G | Conservar para revisión: se ven dientes, pero no es claro el apoyo de los superiores sobre el labio inferior |
| `isa-mouth-H.jfif` | H | Conservar para revisión: la lengua se ve baja; no representa claramente la punta elevada detrás de los dientes superiores |
| `isa-mouth-X.jfif` | Copia del JFIF frontal del backup | Reposo existente, sin nueva generación |

Se eligieron la última A y B-v4 entre los ensayos de la ramificación, siguiendo
la dirección visual elegida por Nahuel. Se eliminaron siete pruebas anteriores
de A/B de esta carpeta, por pedido del usuario. La procedencia y las huellas
SHA-256 de los archivos seleccionados y retirados están en
[mouth-selection.json](mouth-selection.json).

## Preparación pendiente

- A–H miden 2240 × 1920. X conserva los 2240 × 1914 originales. No se recortaron,
  redimensionaron ni convirtieron los archivos durante esta organización.
- Los archivos JFIF contienen imágenes JPEG; se conserva su extensión y contenido.
- Nahuel completó las conversiones: `con-fondo/isa-mouth-{estado}.webp` y
  `sin-fondo/isa-mouth-{estado}-Photoroom.webp`, para A–H y X.
- Conservar una base fija al ensayar los recortes de boca: las imágenes generadas
  también varían los ojos, las cejas y otros detalles del personaje.
- Validar posición, escala, bordes, iluminación y continuidad con el mismo audio
  antes de aprobar el conjunto. Tener las mismas dimensiones no asegura alineación.
- G/H necesitan revisión específica antes de mapearlas a esas formas de Rhubarb.
  Conservarlas no equivale a aprobar su correspondencia. Si no sirven, corregirlas
  o desactivar las formas extendidas afectadas al configurar el reconocedor.

El backup de originales de Isa permanece intacto. X es una copia byte a byte
de `public/isa-bot/isa-originales-backup/original/mirando-al-frente.jfif`.

## Control de las conversiones entregadas

- Se decodificaron los 18 archivos: todos son WebP válidos. Están los nueve
  estados en ambas carpetas y todos conservan las dimensiones de su JFIF.
- Los nueve archivos sin fondo tienen canal alfa real con valores de 0 a 255,
  y aproximadamente el 50 % de sus píxeles son totalmente transparentes.
- La comparación con/sin fondo en las regiones opacas, en las mismas
  coordenadas, dio diferencias RGB medias de 0,80 a 1,26 sobre 255. Esto es
  consistente con conservar la posición en la conversión; no verifica la
  alineación entre las diferentes generaciones de boca.
- Los 18 WebP ocupan aproximadamente 5,27 MiB en total. No es una medición
  de memoria decodificada ni el peso final de los recortes para producción.
- La inspección visual de B y X muestra restos claros alrededor del pelo y
  pequeños residuos en los bordes; la mesa blanca permanece visible. Revisar
  sobre fondos claros y oscuros en la prueba visual. No se modificó la entrega.
- La diferencia de seis píxeles entre X y A–H sigue pendiente. Antes de integrar,
  preparar un lienzo común y probar los recortes sobre una base fija.
