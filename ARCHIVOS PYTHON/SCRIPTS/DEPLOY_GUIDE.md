# Guía rápida de despliegue

## GitHub Pages (estático o documentación)

1. Genera contenido estático (ej. `docs/` o build de frontend).
2. En GitHub, activa Pages en Settings → Pages, rama `gh-pages` o `/docs`.
3. Opcional: usa una acción como `peaceiris/actions-gh-pages` para publicar automáticamente.

## Fly.io / Render / Heroku (apps Python/Flask)

- Define `requirements.txt` y un entrypoint claro.
- Prueba localmente con `python -m src.main` o `flask run`.
- Crea `Dockerfile` (usa `TEMPLATES/Dockerfile_template`) o archivos de plataforma (Procfile, etc.).

### Ejemplo Fly.io con Docker

- Instala Fly CLI y ejecuta:
  - `flyctl launch` (detecta Dockerfile)
  - `flyctl deploy`

### Ejemplo Render

- Conecta el repo en Render, define build (`pip install -r requirements.txt`) y start command (`python -m src.main`).

## Consejos

- Mantén variables de entorno en secretos de la plataforma.
- Automatiza la publicación con GitHub Actions tras hacer push a `main`.
