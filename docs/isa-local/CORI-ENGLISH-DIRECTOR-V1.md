# Cori y director inglés pausado v1

```powershell
../app-clima-backend/.venv/Scripts/python.exe scripts/synthesize-isa-english-director.py
node scripts/preview-isa-cori-timing-comparison.mjs --manifest docs/isa-local/cori-english-director-v1/manifest.json --output tmp/isa-mouth-preview/index-3c-cori-director-ingles-v1.html
node scripts/check-isa-cori-timing-comparison.mjs --manifest docs/isa-local/cori-english-director-v1/manifest.json --html index-3c-cori-director-ingles-v1.html
```

La comparación anterior y sus audios no se sobrescriben. La nueva página usa la
misma frase y dos grabaciones: baseline conservada (10,049 s) y director inglés
pausado v1 (10,496 s). Esta última mantiene Cori base 1,08 y usa velocidades
0,92/0,92/0,92 con pausas pedidas de 90/120/0 ms para estos tres fragmentos.
No se cambia `playbackRate`. La síntesis no garantiza duración proporcional exacta.

La barra conserva pausas acústicas amarillas y microhuecos azules. Los intervalos
violetas son las pausas del plan medidas dentro del WAV por Piper (`isac`), no
posiciones calculadas a partir de longitud del texto. La tabla desplegable muestra
cada fragmento, su velocidad, pausa solicitada e intervalos medidos de habla/pausa.
El panel derecho incorpora esos intervalos y fusiona sus solapamientos con los
silencios detectados, para no aplicar dos veces el mismo ajuste.

Se verificaron hashes, texto intacto, correspondencia de tres fragmentos con el
chunk `isac` real, reloj monótono y acotado, marcas de barra, lectura completa de
la muestra nueva, cierre, control sin cambios, exportación y ancho móvil en
Chromium, sin consultas HTTP. Los colores del retrato y su actuación completa
permanecen en los recursos actuales; no se incorporan bocas fijas ni nuevos videos.

Esto verifica el funcionamiento del ensayo, no su calidad perceptual. Los gestos
por fragmento no se fuerzan sobre la cabeza durante el habla y todavía no se
garantiza que cada fonema coincida con una forma exacta de boca. La revisión
auditiva y visual queda pendiente de Nahuel. El perfil activo de la app y la
interpretación española siguen como estaban. El ensayo se conserva en el
repositorio para revisión; guardarlo no activa el perfil pausado en la app.
