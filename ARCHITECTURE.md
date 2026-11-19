# Organización del frontend

Se conservan las capas de Angular y se agrupan sus archivos por funcionalidad.
`service` mantiene su nombre original para evitar un cambio de nomenclatura extra.

```text
src/app/
  app.*                        Arranque y rutas de la aplicación
  pages/
    weather/                   Pantalla principal del clima
    site/about-page/           Página institucional
  service/
    weather/                   API, presentación y disponibilidad parcial
    places/                    Búsqueda, ubicación actual y favoritos
    alerts/                    Consulta de alertas
    assistant/voice/           Reproducción de Isa y análisis del audio
    preferences/               Idioma, traducciones y tema
  models/
    weather/                   Contratos del clima, pronóstico y temperaturas
    places/                    Consultas y lugares guardados
    alerts/                    Contratos de alertas
    assistant/                 Segmentos y tiempos de Isa
  shared/
    weather/                   Clima actual, pronóstico, mapa, gráficos y detalles
    places/city-search/        Buscador y normalización de consultas
    alerts/                    Alertas y contactos de emergencia
    assistant/                 Consejo y retrato de Isa
    preferences/               Controles de idioma, tema y pipe de traducción
    site/                      Navegación, pie de página e información institucional
  testing/
    weather/                   Fixtures de consultas meteorológicas
    alerts/                    Fixtures de alertas
    assistant/                 Fixtures de voz
```

## Dependencias

- Las páginas coordinan servicios y componentes; no contienen credenciales de proveedores.
- Los componentes consumen contratos de `models` y servicios de su función o de preferencias.
- `service/weather/climate-presentation.ts` transforma el contrato HTTP para la interfaz.
- `service/assistant/voice/isabel-voice.ts` utiliza el reproductor de
  `shared/assistant/isabel/isa-playback.ts` para sincronizar voz y animación.
  Esta dependencia existente se conserva; la mudanza no introduce otra abstracción.
- Los modelos y fixtures mantienen sus validaciones y datos existentes.

Las pruebas `.spec.ts` permanecen junto al archivo que verifican. Las pruebas de
varios componentes meteorológicos están en `shared/weather/`.

## Convenciones de mantenimiento

Agregar un archivo dentro de una funcionalidad existente antes de crear otra
carpeta. Una nueva funcionalidad solo necesita las capas que realmente utiliza.
No se necesitan archivos de reexportación ni módulos Angular adicionales.

Conservar juntos el componente y sus archivos HTML, estilos, recursos y pruebas.
El retrato de Isa mantiene su carpeta para preservar las relaciones entre sus
catálogos, planificadores y herramientas de revisión.

Los scripts de `scripts/` usan las nuevas ubicaciones. Los recursos publicados en
`public/`, las URLs públicas y las claves de almacenamiento del navegador no cambian.
`scripts/reference/` conserva sus referencias históricas.

La reorganización no añade dependencias ni cambia los contratos del backend.
