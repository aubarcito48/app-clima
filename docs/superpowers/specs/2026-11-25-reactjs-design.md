# StitchWeather en React

El usuario solicita la misma aplicación meteorológica en React para su portfolio,
con exactamente trece commits sustanciales y push individual después de cada etapa.
Autoriza completar la migración de forma continua, como se hizo con Vue.

## Enfoque

Rama `reactjs` desde `main` en `136d773`, con worktree `../app-clima-reactjs`.
Angular queda en `main` y Vue en `vuejs`. Se reutilizan contratos, recursos,
estilos y comportamiento; la interfaz se implementa con componentes funcionales,
hooks de React, TypeScript, Vite y React Router. El backend Django no cambia.
Separar las versiones mediante ramas evita mezclar runtimes y permite comparar
las tres implementaciones conservando su historial.

## Paridad requerida

Búsqueda y sugerencias accesibles, ubicación bajo permiso, favoritos, clima actual,
pronóstico, unidades y gráficos; español e inglés, temas persistentes; mapa Leaflet
con capas, leyenda y consulta por punto; alertas oficiales y contactos por país;
carrusel ambiental, página informativa y navegación; recomendaciones, voz,
reintentos, cancelación, sincronización y animación de Isa.

## Restricciones

- Trece commits desde la base, sin commits vacíos ni squash.
- Validar y pushear una etapa antes de comenzar la siguiente.
- Trabajar solo en el worktree React. No modificar Angular, Vue ni el backend.
- Mantener claves privadas en Django y exponer únicamente la URL pública de API.
- Ejecutar pruebas con un solo trabajador y cerrar los servidores al terminar.
- Conservar pruebas de comportamiento y accesibilidad con proveedores simulados.
- No afirmar que los mocks verifican proveedores reales ni navegadores no probados.

La instalación y el build deben ser reproducibles, sin dependencias de Angular o
Vue al concluir. El README debe explicar ramas, ejecución y salida de compilación.
