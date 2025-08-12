# Título del proyecto

Breve descripción del proyecto y su objetivo. Incluye el contexto (ej. cálculo de poleas, análisis de grúa, app de mantenimiento, etc.).

## Demo / Capturas (opcional)

Inserta GIFs o imágenes que muestren el resultado.

## Tecnologías

- Lenguaje y librerías principales
- Herramientas (CI, Docker, etc.)

## Estructura rápida

```
project/
  ├─ src/
  ├─ tests/
  ├─ requirements.txt (o pyproject.toml)
  ├─ .github/workflows/
  └─ README.md
```

## Requisitos

- Python >= 3.10
- pip/venv o conda

## Instalación y ejecución

```bash
# 1) Crear entorno
python -m venv .venv && source .venv/bin/activate  # (Windows: .venv\\Scripts\\activate)

# 2) Instalar dependencias
pip install -r requirements.txt  # o usar pyproject.toml

# 3) Ejecutar
python -m src.main  # ajusta al entrypoint real
```

## Pruebas

```bash
pytest -q
```

## Estilo de código

- Black, Flake8 (ver `pyproject.toml` o configs)
- Ejecutado automáticamente en CI

## Despliegue

- Opciones: Docker, Fly.io, Render, Heroku, GitHub Pages (según tipo de app)
- Ver guía `SCRIPTS/DEPLOY_GUIDE.md`

## Roadmap (opcional)

- [ ] Feature 1
- [ ] Feature 2

## Contribuir

Ver `CONTRIBUTING.md`. ¡Issues y PRs bienvenidos!

## Licencia

MIT u otra apropiada. Ver `LICENSE`.
