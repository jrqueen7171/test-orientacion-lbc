#!/usr/bin/env bash
# Despliegue del backend lbc-orientacion en Cloud Run (Klasvid GCP project).
#
# Uso:
#   cd backend
#   export SHEET_ID="id-de-tu-google-sheet"
#   # opcional (por defecto toma el project de `gcloud config`):
#   # export PROJECT_ID="klasvid-..."
#   # opcional (por defecto profesor26):
#   # export TEACHER_PASSWORD="otra-clave"
#   ./deploy.sh
#
# Requisitos previos:
#   - gcloud instalado y autenticado (`gcloud auth login`)
#   - proyecto por defecto apuntando a Klasvid (`gcloud config set project <id>`)
#   - Firestore en modo Native ya inicializado en el proyecto
#     (si no lo está: `gcloud firestore databases create --location=eur3`)
#   - Google Sheet creada y compartida con el service account del servicio
#     como "Editor" (el script te recuerda qué email añadir al final)

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-lbc-orientacion}"
SECRET_NAME="${SECRET_NAME:-lbc-teacher-password}"
TEACHER_PASSWORD_DEFAULT="profesor26"

# Gmail para el envío de códigos OTP a los alumnos (reutiliza la infra Klasvid)
GMAIL_USER="${GMAIL_USER:-jrqueen71@gmail.com}"
GMAIL_SECRET_NAME="${GMAIL_SECRET_NAME:-GMAIL_APP_PASSWORD}"

if [[ -z "${PROJECT_ID:-}" ]]; then
  echo "❌ PROJECT_ID vacío. Ejecuta: gcloud config set project <klasvid-project-id>" >&2
  exit 1
fi
if [[ -z "${SHEET_ID:-}" ]]; then
  echo "❌ Falta SHEET_ID. Exporta: export SHEET_ID=<id-de-tu-google-sheet>" >&2
  exit 1
fi

echo "→ Project: $PROJECT_ID"
echo "→ Region:  $REGION"
echo "→ Service: $SERVICE"
echo "→ Sheet:   $SHEET_ID"
echo ""

# 1. Habilitar APIs necesarias (idempotente)
echo "→ Habilitando APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  sheets.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID" --quiet

# 2. Crear / actualizar secreto con la contraseña del profesor
if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "→ Secret $SECRET_NAME ya existe (se reutiliza la versión latest)."
else
  PW="${TEACHER_PASSWORD:-$TEACHER_PASSWORD_DEFAULT}"
  echo "→ Creando secret $SECRET_NAME..."
  printf '%s' "$PW" | gcloud secrets create "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --replication-policy="automatic" \
    --data-file=-
fi

# 3. Dar acceso al secreto al service account por defecto de Cloud Run
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "→ Concediendo secretAccessor a $SA_EMAIL..."
gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet >/dev/null

# Acceso al secreto compartido GMAIL_APP_PASSWORD (Klasvid)
if gcloud secrets describe "$GMAIL_SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud secrets add-iam-policy-binding "$GMAIL_SECRET_NAME" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
else
  echo "⚠️  Secret $GMAIL_SECRET_NAME no existe en $PROJECT_ID. Los OTPs por email fallarán." >&2
fi

# 4. Deploy desde fuente (Cloud Build crea la imagen a partir del Dockerfile)
echo "→ Desplegando en Cloud Run..."
gcloud run deploy "$SERVICE" \
  --source=. \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --allow-unauthenticated \
  --service-account="$SA_EMAIL" \
  --set-env-vars="SHEET_ID=${SHEET_ID},GMAIL_USER=${GMAIL_USER}" \
  --set-secrets="TEACHER_PASSWORD=${SECRET_NAME}:latest,GMAIL_APP_PASSWORD=${GMAIL_SECRET_NAME}:latest" \
  --min-instances=0 \
  --max-instances=5 \
  --memory=256Mi \
  --cpu=1 \
  --concurrency=20 \
  --timeout=30

URL=$(gcloud run services describe "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.url)')

echo ""
echo "✅ Desplegado. URL pública: $URL"
echo ""
echo "Siguientes pasos manuales:"
echo "  1. Abre la Google Sheet (ID: $SHEET_ID) → Compartir → añade como Editor:"
echo "       ${SA_EMAIL}"
echo ""
echo "  2. En index.html cambia la constante:"
echo "       const BACKEND_URL = '${URL}/api';"
echo ""
echo "  3. Commit + push. GitHub Pages recogerá el cambio."
echo ""
echo "Prueba rápida (debería devolver ok:true):"
echo "  curl -s '${URL}/'"
