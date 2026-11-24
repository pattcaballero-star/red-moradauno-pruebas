# Red MoradaUno · prototipo y pruebas de usabilidad

Sitio estático (sin servidor). Abre `index.html`.

## Publicar en GitHub Pages
1. Crea un repositorio en GitHub (público) y sube todo el contenido de esta carpeta (incluido `.nojekyll`).
2. En el repo: Settings > Pages > Source: "Deploy from a branch" > Branch `main` / carpeta `/ (root)` > Save.
3. En 1–2 minutos queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

## Guardar las sesiones en Google Sheets (opcional)
1. Crea una hoja de Google. Extensiones > Apps Script. Pega el contenido de `apps-script.gs` y cambia `CLAVE`.
2. Implementar > Nueva implementación > Aplicación web. Ejecutar como: tú. Acceso: cualquier persona. Copia la URL que termina en `/exec`.
3. Pégala en `js/config.js` (`window.M1_ENDPOINT = '...'`), sube el cambio.
4. Los resultados se ven en la hoja o en `resultados.html` (pide la clave).

## Uso
- `guion.html`: crea y copia los enlaces para cada asesora (ID de participante).
- Enlace de facilitadora: `index.html?fac=1` (muestra el selector "Estados" y no registra).
- El enlace normal oculta las herramientas del prototipo y guía las 6 tareas con el botón "Terminé".
