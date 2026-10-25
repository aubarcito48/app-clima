# StitchWeather

Frontend de la app del clima, desarrollado con Angular 21 y Tailwind CSS. Permite buscar lugares o usar la ubicación actual, consultar el clima y pronóstico, y recibir recomendaciones de IA en español o inglés.

Consume la API de [app-clima-backend](https://github.com/aubarcito48/app-clima-backend). Las claves de los proveedores se configuran únicamente en el backend.

**Publicado en Vercel:** [https://app-clima-ecru.vercel.app/](https://app-clima-ecru.vercel.app/)

[![Vista previa del portfolio](public/app-clima.png)](https://app-clima-ecru.vercel.app/)

## Ejecución local

Requiere Node.js 24 y npm. Desde esta carpeta, en PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Si ya existe `.env`, conservá el archivo. La aplicación abre en `http://localhost:4200` y espera el backend en `http://localhost:8000`.

Para cambiar la API, ajustá `PUBLIC_API_BASE_URL_DEVELOPMENT` o `PUBLIC_API_BASE_URL_PRODUCTION` en `.env` y reiniciá o recompilá. La URL de producción de la plantilla es un marcador: reemplazala antes de publicar.

## Comandos

```powershell
npm run build                 # Compilación de producción
npm test -- --watch=false     # Pruebas unitarias
npm run e2e:install           # Instalar Chromium (primera vez)
npm run e2e                  # Pruebas de extremo a extremo
```