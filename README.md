# StitchWeather

Frontend de la app del clima, desarrollado con Angular 21 y Tailwind CSS. Permite buscar lugares o usar la ubicación actual, consultar el clima y pronóstico, y recibir recomendaciones de IA en español o inglés.

Consume la API de [app-clima-backend](https://github.com/aubarcito48/app-clima-backend). Las claves de los proveedores se configuran únicamente en el backend.

**Publicado en Vercel:** [https://app-clima-ecru.vercel.app/](https://app-clima-ecru.vercel.app/)

## Teléfonos nacionales por país

El carrusel selecciona los números del país devuelto por la consulta meteorológica.
Sin una ubicación consultada, invita a buscar una ciudad; para países pendientes
informa que no hay contactos verificados. Los números cortos son para marcar
dentro del país indicado, con disponibilidad de servicio según la zona.

Catálogo local en [emergency-directory.ts](src/app/shared/emergency-contacts/emergency-directory.ts),
verificado el 17/11/2026 con fuentes oficiales:

- [Argentina](https://www.argentina.gob.ar/tema/emergencias).
- [Brasil](https://www.gov.br/mcom/pt-br/noticias/2026/setembro/emergencia-voce-sabe-para-quem-ligar-quando-precisa-de-ajuda/).
- [Chile](https://www.chile.gob.cl/chile/sobre-chile/informacion-turistica/condiciones-de-seguridad/condiciones-de-seguridad).
- [Uruguay](https://www.gub.uy/ministerio-interior/sites/ministerio-interior/files/documentos/publicaciones/GUIA%20DE%20RESPUESTA%20EN%20CASO%20DE%20EMERGENCIA%202016.pdf),
  junto con la [integración actual de SAME 105 al 911](https://www.gub.uy/ministerio-salud-publica/comunicacion/noticias/same-105-se-integro-centro-comando-unificado-para-fortalecer-atencion).

El 107 SAME argentino tiene cobertura local según la fuente nacional; por eso
queda fuera de este catálogo nacional. La sección conserva fuentes visibles,
enlaces `tel:`, accesibilidad de teclado y traducciones ES/EN. Cambiar el país
reinicia el carrusel en el primer contacto. No usa GPS ni llamadas a Groq para
elegir números: reutiliza el país de la ciudad consultada.

## Cambio de tema con revelado circular

El botón de tema revela la nueva paleta con un círculo que se expande desde el
centro del control durante 600 ms, tanto al pasar a oscuro como al volver a claro.
La implementación usa View Transitions y Web Animations nativas del navegador,
sin dependencias adicionales. Cambia la paleta real; no invierte los colores de
las imágenes ni de IsaBot. El foco de teclado y la preferencia guardada se conservan.

Con movimiento reducido o sin soporte de View Transitions, el tema cambia de
forma inmediata. Los cambios del sistema y la sincronización entre pestañas
tampoco disparan el efecto. Los clics rápidos cancelan la animación anterior y
respetan la última elección. La referencia visual fue `video-idea-darkmode.mp4`.

Verificación: compilación de producción, tipado E2E y nueve casos de navegador
en celular, tablet y escritorio (revelado, teclado, clics rápidos, movimiento
reducido y compatibilidad sin View Transitions).

[![Vista previa del portfolio](public/app-clima.png)](https://app-clima-ecru.vercel.app/)

## Ejecución local

El trabajo para reducir la dependencia de Groq en la actuación de Isa se divide
en tres commits: auditoría de recursos, director local y prototipo de boca guiada
por audio. Estado y criterios en [el plan de Isa local](docs/isa-local/PLAN.md).
La primera etapa solo genera un inventario y hojas de revisión: no cambia la
animación ni la voz de la app publicada.

Requiere Node.js 24 y npm. Desde esta carpeta, en PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Si ya existe `.env`, conservá el archivo. La aplicación abre en `http://localhost:4200` y espera el backend en `http://localhost:8000`.

Para cambiar la API, ajustá `PUBLIC_API_BASE_URL_DEVELOPMENT` o `PUBLIC_API_BASE_URL_PRODUCTION` en `.env` y reiniciá o recompilá. La URL de producción de la plantilla es un marcador: reemplazala antes de publicar.

## Isabel (Isa)

Isa usa un personaje ilustrado inspirado en la referencia aportada por el usuario.
Se dibuja en canvas con 61 cuadros seleccionados del video original y 204 cuadros
del nuevo video de habla, preparados en WebP. Conserva reposo, despertar, mirada a la derecha en escritorio,
mirada hacia abajo en móvil y regreso al frente al hablar. No sigue el cursor.
Los originales permanecen en `public/isa-bot`, excluidos de los assets publicados;
la app solo carga `public/isa-bot/runtime`. El detalle del proceso está en
[`src/app/shared/isabel/README.md`](src/app/shared/isabel/README.md).

Isa arranca con la voz activada y permanece en silencio hasta recibir el consejo
de Groq de una consulta en español o inglés una sola vez. Podés silenciarla
tocando el avatar de Isa. Otro toque activa la voz. La elección dura durante la sesión y vuelve a estar
activada al recargar. El backend genera el audio con Piper y la voz femenina
Sharvard (`F = 1`) en español de España y Cori en inglés británico, un 8 % más pausada.
El idioma de la página selecciona la voz; silenciarla funciona en ambos idiomas.
Requiere instalar `requirements-voice.txt`
y el modelo en el backend; los pasos están en su README. No requiere una API key adicional.
En producción hay que instalar el motor y modelos también en el servidor.
El audio es WAV PCM16 mono a 22.050 Hz; el frontend lee su frecuencia para
sincronizar la boca. La voz funciona en el despliegue gratuito de Render.

Al cambiar de búsqueda o idioma se cancela la lectura anterior. Si el navegador
bloquea la reproducción, se informa el motivo y el consejo queda disponible como texto.
Si falla la voz, el texto del clima continúa disponible. Las poses responden
al estado de la consulta y del audio, respetando movimiento reducido. El habla usa
cuadros completos del video: conserva parpadeos, cabeza y expresión facial. Con
marcas Rhubarb válidas, el selector 3C limita los saltos hacia adelante y adapta
el reloj a pausas y microsilencios del audio real. No vuelve a reposo entre palabras.
Sin esas marcas conserva la reproducción anterior. Solo cambia al retrato de reposo
al terminar. La correspondencia de bocas es aproximada; no garantiza cada fonema.

Las pruebas originales, sus generadores y audios quedan conservados y se pueden
reconstruir siguiendo [el archivo de referencia](docs/isa-local/reference-2026-11-15/README.md).
La integración aprobada se describe en [Isa 3C en producción](docs/isa-local/PRODUCTION-3C.md).
Para Cori se usa una toma de habla inglesa con su propio catálogo de boca,
conservando la toma española para Sharvard. La prueba y sus criterios están en
[Cori con video inglés](docs/isa-local/CORI-ENGLISH-VIDEO.md).

## Comandos

El despliegue en Vercel utiliza las cabeceras de `vercel.json`: bloqueo de embedding,
nosniff, permisos de ubicación limitados al propio origen y CSP para base, objetos
y ancestros. No es una CSP completa para scripts. Las pruebas `e2e/security.spec.ts`
verifican que el contenido externo se muestra como texto y no ejecuta HTML.
El backend aplica presupuestos de solicitudes en producción; ver su informe
[de seguridad](https://github.com/aubarcito48/app-clima-backend/blob/main/SECURITY_REVIEW.md).

```powershell
npm run build                 # Compilación de producción
npm test -- --watch=false     # Pruebas unitarias
npm run e2e:install           # Instalar Chromium (primera vez)
npm run e2e                  # Pruebas de extremo a extremo
```
