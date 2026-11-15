# Ensayo local de boca sobre una base fija

La vista se genera fuera del build de Angular. No cambia el retrato de producción,
no llama a Groq/OpenWeather y no sintetiza voz: usa un WAV existente de Piper
que ya contenga las marcas de Rhubarb en su chunk `isav`.

## Generar y abrir

Desde la raíz del frontend, con Python y Pillow disponibles:

```powershell
python scripts/preview-isa-mouths.py --wav ../app-clima-backend/tmp/isa-rhubarb/es_long.wav
```

Abrir `tmp/isa-mouth-preview/index.html` en el navegador. Es un HTML autónomo:
contiene sus imágenes y audio; puede abrirse como archivo, sin iniciar servidores.
El archivo y las capturas de revisión quedan en `tmp/`, ignorado por Git.

El WAV de ejemplo también es local e ignorado. Si falta, generar una muestra
desde el backend con su `scripts/probe_lip_sync.py` (Piper/Rhubarb instalados),
y pasar la ruta resultante mediante `--wav`. No se necesita consultar Groq.

## Qué revisar

1. Seleccionar A–H/X manualmente y alternar «Comparar con la base sin recorte».
2. Revisar el borde de los labios y las mejillas en fondo celeste, oscuro y blanco.
3. Reproducir el audio o saltar desde la línea de tiempo. El reloj del elemento
   de audio elige la marca; no se aproxima a partir de la longitud del texto.
4. Pausar conserva el instante; terminar o volver al inicio deja X.
5. En modo manual, ajustar horizontal, vertical, escala y suavidad del borde por
   boca. «Guardar ajustes» descarga un JSON marcado `reviewed: false` para revisarlo.
   La vista no guarda cambios automáticamente ni modifica los archivos fuente.

X es el WebP transparente, centrado en un lienzo de 2240 × 1920 con tres píxeles
de margen arriba y abajo. No se estira la imagen original de 2240 × 1914.
A–H se recortan en el navegador desde sus WebP con fondo: el interior de la boca
no necesita eliminar el fondo exterior. La composición usa una máscara elíptica
con borde suave. Así los ojos, el pelo y el cuerpo son siempre los de X.

La posición inicial del recorte es una aproximación revisable, no una alineación
ya aprobada. En particular, una apertura amplia puede necesitar una corrección
local de mandíbula que este recorte no reproduce. Se pueden ver diferencias de
tono o un borde al alternar formas; no se promete resolverlas con el difuminado.
No se generan cuadros intermedios ni se cambia el audio para ocultar esos defectos.

G/H están desactivadas inicialmente por su correspondencia visual pendiente:
G utiliza B y H utiliza C como alternativas aproximadas solo para el ensayo.
El indicador muestra tanto la marca original como la forma dibujada. La casilla
permite probar las candidatas originales; no modifica Rhubarb ni el backend.

## Verificación enfocada

```powershell
python scripts/test_preview_isa_mouths.py
node scripts/check-isa-mouth-preview.mjs
```

El segundo comando utiliza el Playwright/Chromium ya instalado en el proyecto,
sin iniciar Angular ni Django, y cierra su navegador al terminar. Comprueba que
no cambien píxeles fuera del recorte, que B/D sean diferentes, exportación y
restablecimiento de ajustes, reproducción real, pausa, salto, cierre en X,
selección experimental y ausencia de desborde horizontal en móvil. Guarda
capturas en el mismo directorio local para inspección visual.

Estas comprobaciones verifican el funcionamiento del ensayo; la naturalidad,
calidad de los bordes y correspondencia acústica siguen necesitando revisión humana.
