# Contorno de Isa en modo oscuro

Corrección estética local: filtro SVG sobre la transparencia del retrato, activo
solo bajo `html[data-theme='dark']`. Reduce el contorno exterior un píxel mostrado
con erosión de alfa y conserva los colores interiores. No aplica una clave blanca
global, no oscurece las canas y no modifica atlas, videos, tiempos ni selectores.
El mismo filtro cubre poses, habla española, habla inglesa y fallback de carga.

```powershell
node scripts/check-isa-dark-edges.mjs
```

La comprobación recorre los **469 cuadros**: 61 poses, 204 de habla española y
204 de habla inglesa. Verifica cada cuadro a 88 px y 200 px (938 comparaciones),
ausencia de píxeles opacos nuevos y colores interiores sin cambios. Genera hojas
antes/después para todos los cuadros y reportes en `tmp/isa-edge-review`.
La cantidad de alfa retenida no es una puntuación de calidad visual.

Las hojas muestran una reducción del halo claro y puntos sueltos. No se promete
una segmentación perfecta: luces reales del pelo y la mesa blanca siguen siendo
parte del personaje. Un solo filtro constante evita usar máscaras diferentes
entre cuadros; el movimiento merece también una revisión perceptual en la app.

El build y las pruebas de reproducción en ambos idiomas comprueban el filtro
en modo oscuro y su desactivación al pasar a claro. Nahuel autorizó publicar
la corrección después de estas verificaciones.
