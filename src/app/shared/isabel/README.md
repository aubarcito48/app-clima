El archivo `isabel.avatar.json` proviene del `kirby-avatar-esm.zip` elegido por el usuario.
Se conserva su geometría, colores, expresiones y animaciones. La identidad visible
es Isa; la tarjeta muestra el avatar y su descripción, sin título visible.
Vive en el espacio inferior del navbar y dentro del menú lateral en celular.
La página proyecta una única instancia en el navbar para conservar la lectura
al cerrar el menú o cambiar entre la navegación móvil y de escritorio.
El avatar también es un botón para silenciar/activar la voz, accesible con
clic, toque, Enter y Espacio. Es el único control de voz de la tarjeta.

Motor: `@bible-strong/avatar-core@0.1.0`, empaquetado localmente por Angular.
`isabel-avatar.ts` dibuja el SVG a partir de una única pose muestreada por frame.
El personaje y el renderer se cargan en chunks diferidos; no dependen de esm.sh.
Isa duerme en reposo. Al consultar despierta mirando al frente con los ojos
grandes y redondeados de la expresión surprise (`surprised-left`).
Mientras prepara el audio mira a la derecha, hacia la tarjeta del clima.
Cuando empieza a hablar vuelve al frente y mantiene durante toda la lectura
los mismos ojos configurados para despertar (`awake`).
Durante la lectura se superponen como máximo dos entrecerrados suaves,
que reducen temporalmente la altura un 20 % y vuelven a abrir sin alterar
la configuración. Empiezan a los segundos 1 y 7, duran 1,6 segundos cada uno
y no se repiten después del segundo. El parpadeo automático del motor se omite
durante el habla para no sumar cierres extra. Se conservan
los valores configurados. Se detiene al silenciar o terminar. Este gesto facial
funciona también con movimiento reducido, sin reactivar el balanceo del cuerpo.
Al finalizar conserva los mismos ojos y separación configurados para despertar,
sin volver a la expresión frontal antigua,
y espera cinco segundos antes de dormirse. Una nueva consulta cancela
ese regreso al sueño. Silenciar también cierra la boca e inicia el descanso.
Las frases se ubican aproximadamente por su longitud y el progreso real del audio;
no hay marcas de palabras ni sincronización de labios. Sin controles de animación.
La boca se proyecta sobre la superficie facial con el mismo quaternion y
perspectiva de los ojos, incluyendo las transiciones y el movimiento ambiente.
Se oculta al girar hacia la cara posterior; no se posiciona por el contorno 2D.
Su apertura usa la energía RMS del WAV en intervalos de 40 ms y el tiempo real
del reproductor. Se cierra durante silencios, al detener o silenciar y al finalizar.
Con `prefers-reduced-motion` se mantienen expresiones sin movimiento continuo.

Los ojos se abren progresivamente al despertar (1100 ms) y se cierran al dormir
(1500 ms), con aceleración y frenado suaves. La transición parte de la pose
visible y conserva las medidas configuradas; también funciona con movimiento
reducido. Durante la transición se omite el parpadeo automático.

La voz requiere el endpoint `/api/v1/voz/` del backend y su instalación de Piper
con el modelo `es_ES-sharvard-medium`, hablante femenino `F = 1`.
El WAV es PCM16 mono a 22.050 Hz. La envolvente lee la frecuencia del archivo
para sincronizar la boca y no requiere una API key adicional.
Arranca activada sin hablar hasta recibir texto. Se puede silenciar y reactivar
durante la sesión, y solo lee recomendaciones en español. Al consultar otro lugar, borrar el resultado,
cambiar el idioma o desmontar el componente, se detiene el audio anterior.
Cada consejo se intenta leer una sola vez. Silenciar y reactivar no vuelve a
sintetizar un consejo ya intentado; una consulta recibida mientras estaba
silenciada puede leerse al reactivar. No hay botón de repetición.
