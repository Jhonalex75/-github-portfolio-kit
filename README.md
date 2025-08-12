# Kit de mejora de portafolio GitHub (para Jhonalex75)

Este kit te ayuda a profesionalizar tu perfil y repositorios de GitHub de forma rápida:

- README de perfil listo para el repo especial `Jhonalex75`.
- Plantillas de README para proyectos con secciones estándar.
- CI (GitHub Actions) para pruebas y estilo de código en proyectos Python.
- Plantillas de Issues y Pull Requests.
- Archivos de configuración: `requirements.txt`, `pyproject.toml`, `Dockerfile`, `environment.yml` (Conda).

## Cómo usar este kit

1) Mejora de perfil
- Crea (o actualiza) el repositorio especial con el mismo nombre de tu usuario: `Jhonalex75`.
- Copia `PROFILE/README_PROFILE.md` como `README.md` en ese repo y súbelo.
- En tu perfil de GitHub, fija ("Pin") tus repos principales: `POLEAS`, `Grua`, `Mantenimiento`, u otros que quieras destacar.

2) Mejora de repos individuales
- Copia `TEMPLATES/README_PROJECT_TEMPLATE.md` a cada repo como `README.md` y completa los campos.
- Añade una licencia apropiada si falta (usa `LICENSE` MIT u otra, o adapta `TEMPLATES/CODE_OF_CONDUCT.md` y `TEMPLATES/CONTRIBUTING_TEMPLATE.md`).
- Para repos Python: añade `requirements.txt` (puedes partir de `TEMPLATES/requirements_template.txt`) o `pyproject.toml` (basado en `TEMPLATES/pyproject_template.toml`).
- Si es una app (Flask/Streamlit/React), añade `Dockerfile` (usa `TEMPLATES/Dockerfile_template`) y pasos de despliegue (ver `SCRIPTS/DEPLOY_GUIDE.md`).

3) CI/CD
- Copia `.github/workflows/python-ci.yml` dentro de cada repo Python. Se ejecutará en pushes y PRs:
  - Instala dependencias si existe `requirements.txt`.
  - Verifica estilo con Black/Flake8 si hay archivos `.py`.
  - Ejecuta `pytest` si existe carpeta `tests/`.

4) Consistencia y alineación
- Revisa que el README coincida con el stack real del repo (corrige menciones a Unity/C# si el código es TS/Python, etc.).
- Mantén nomenclatura y estructura consistentes entre repos.

## Comandos útiles (opcional con GitHub CLI)

Si usas GitHub CLI (`gh`) y ya iniciaste sesión con `gh auth login`:

```powershell
# Crear repo de perfil (si no existe) y subir README
mkdir ..\perfil ; cd ..\perfil
Copy-Item "..\ARCHIVOS PYTHON\PROFILE\README_PROFILE.md" -Destination ".\README.md"
git init
git add README.md
git commit -m "feat(profile): add profile README"
if (!(gh repo view Jhonalex75 2>$null)) { gh repo create Jhonalex75 --public -y -d "Perfil de GitHub" }
git branch -M main
git remote add origin https://github.com/Jhonalex75/Jhonalex75.git
git push -u origin main
```

Para cada proyecto, repite el patrón: copia plantillas, completa datos, confirma y haz push.

## Checklist rápido

- [ ] README de perfil creado y visible.
- [ ] Repos principales fijados en el perfil.
- [ ] READMEs claros en cada repo (objetivo, stack, cómo ejecutar, capturas/GIFs).
- [ ] Licencia añadida.
- [ ] CI activado (Actions) en repos Python.
- [ ] Despliegue disponible (GitHub Pages/Fly.io/Render/Heroku/Docker).
- [ ] Estilo y estructura consistentes en todos los repos.

## Marcar este repo como Template

1) Ve a Settings → General → Template repository y actívalo.
2) Opcional: añade Topics (template, ci-cd, python, docker, engineering).
3) Para crear nuevos proyectos: botón "Use this template".

## Guía rápida de uso

- Para un proyecto Python: copia `TEMPLATES/requirements_template.txt` como `requirements.txt` o usa `TEMPLATES/pyproject_template.toml`.
- Activa CI copiando `.github/workflows/python-ci.yml`.
- Añade `TEMPLATES/README_PROJECT_TEMPLATE.md` como README y completa secciones.
- Si despliegas: usa `TEMPLATES/Dockerfile_template` y la guía `SCRIPTS/DEPLOY_GUIDE.md`.
