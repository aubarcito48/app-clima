# StitchWeather en Vue

## Intención y alcance

Crear una versión Vue y TypeScript de StitchWeather para mostrar experiencia con
Vue en el portfolio. Conservar el diseño, las funciones y el contrato del backend
Django de la versión Angular. Trabajar en la rama `vuejs`, con 10 commits de
migración en total, distribuidos en sesiones; esta sesión entrega el primero.

## Enfoques

- Reescribir el frontend en la rama `vuejs`: conserva el historial y permite
  comparar ambas implementaciones. Es el enfoque acordado.
- Mantener Angular y Vue dentro de una misma aplicación: agrega complejidad de
  integración innecesaria para mostrar dos versiones independientes.
- Crear otro repositorio: separa el historial de la migración, contrario a la rama
  solicitada.

## Arquitectura propuesta

Usar componentes Vue, Composition API y TypeScript; Vite para desarrollo y build,
y Vue Router para `/` y `/sobre-nosotros`. Reutilizar los recursos públicos, los
contratos TypeScript independientes de Angular, Tailwind/CSS y Leaflet. Adaptar
servicios a módulos de API y composables de Vue. Mantener claves privadas en Django.
Resolver versiones compatibles al instalar, sin fijarlas por suposición en el plan.

## Restricciones y criterio de finalización

- Mantener Angular en `main` y realizar la migración en `vuejs`.
- Conservar búsqueda, ubicación, favoritos, clima, pronóstico, unidades, idiomas,
  temas, mapa, alertas, contactos, recomendaciones y reproducción de Isa.
- Conservar navegación, adaptación móvil, teclado y preferencias persistentes.
- Cada commit debe tener un alcance revisable y una validación proporcional.
- Total previsto: 10 commits, incluido el plan inicial; sin commits vacíos ni
  fechas artificiales. No completar las diez etapas en esta sesión.
- No publicar ni desplegar como parte del primer commit.

## Estado inicial y trabajo pendiente de Angular

Base: `9f8e059`. La rama tiene un worktree separado en `../app-clima-vuejs`.
El worktree original de Angular contiene cambios sin commit en el mapa, leyenda,
API por punto, traducciones, estilos y pruebas. Esos cambios permanecen allí y no
forman parte de esta base. Antes de implementar el mapa en Vue, revisar su estado
actual e incorporar la funcionalidad que corresponda sin descartarlos ni
incluirlos accidentalmente en commits de documentación.

Las decisiones de archivos y límites por commit están en el plan asociado.
