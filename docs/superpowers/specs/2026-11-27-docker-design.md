# Docker independiente: frontend

## Intenci?n y alcance acordado
Practicar y demostrar Docker aprendido en la facultad, conservando la posibilidad de desplegar en un servidor m?s adelante. El usuario eligi? un contenedor independiente por repositorio.

## Alternativas
Se consider? Compose para coordinar ambos servicios, pero se eligi? construir y ejecutar cada repositorio por separado. No se agregan orquestaci?n, base de datos ni despliegues remotos.

## Dise?o
Angular, Node 24 y Nginx. Dockerfile y .dockerignore propios, healthcheck e instrucciones en README. Las claves privadas se inyectan al ejecutar el backend y no forman parte de ninguna imagen. El frontend recibe una URL p?blica de API al construir: HTTP ?nicamente en loopback para pr?ctica local, HTTPS en servidor. El backend incluye las dos voces y sus modelos preparados, usa un usuario sin privilegios y conserva Gunicorn con su timeout existente. HTTPS se configura con el proxy del futuro servidor.

## Verificaci?n
Construir y ejecutar la imagen, comprobar HTTP y healthcheck, y probar la integraci?n con el otro servicio. No se modifica el alojamiento publicado.
