#!/bin/bash
# deploy.sh — Commit y push para desplegar a Firebase App Hosting
# Uso: bash deploy.sh "mensaje del commit"
# Ejemplo: bash deploy.sh "fix: correccion en modulo calidad"

set -e

MSG=${1:-"deploy: actualizacion de la app"}

echo ""
echo "=== DEPLOY A FIREBASE APP HOSTING ==="
echo "Mensaje: $MSG"
echo ""

# 1. Verificar que estamos en la rama correcta
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Rama actual: $BRANCH"

# 2. Agregar todos los cambios de nexus_backup
cd "$(git rev-parse --show-toplevel)"
git add molino/nexus_backup/

# 3. Ver qué se va a commitear
echo ""
echo "--- Archivos modificados ---"
git diff --cached --name-only --relative=molino/nexus_backup/
echo "---"

# 4. Commit
git commit -m "$MSG" || echo "(Sin cambios nuevos que commitear)"

# 5. Push — Firebase App Hosting detecta el push y despliega automáticamente
echo ""
echo "Subiendo cambios a GitHub..."
git push origin "$BRANCH"

echo ""
echo "=== Listo! Firebase App Hosting está construyendo tu app. ==="
echo "Puedes ver el progreso en:"
echo "https://console.firebase.google.com/project/studio-6587601373-5651d/apphosting"
echo ""
