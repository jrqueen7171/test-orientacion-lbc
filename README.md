# Test de Orientación Profesional — IES Luis Bueno Crespo

📋 Cuestionario interactivo de 50 preguntas para orientar al alumnado hacia las familias profesionales del centro.

## Familias profesionales evaluadas
- 📊 Administración y Gestión
- 🛒 Comercio y Marketing
- 🏗️ Edificación y Obra Civil
- ⚡ Electricidad y Electrónica
- 🧵 Textil, Confección y Piel

## Características
- 37 preguntas de **Soft Skills** (puntualidad, asertividad, don de gentes, resolución de conflictos, negociación…)
- 13 preguntas de **Aptitudes Técnicas**
- Informe detallado con correcciones y consejos de mejora
- Perfil completo de competencias transversales
- Sistema de **premios con código QR** (3 tipos por familia)
- **Panel docente** con lector QR integrado y contraseña
- **Contadores en la nube** (Firestore) — varios profesores de la misma familia comparten el stock en tiempo real
- Descuentos atómicos con `runTransaction` y protección contra canjes duplicados
- Log de escaneos y resultados en una Google Sheet
- Diseño responsive (móvil, tablet, PC)
- Botón de impresión de informe

## Arquitectura
- **Frontend**: un único `index.html` (sin dependencias) servido por GitHub Pages.
- **Backend**: servicio Node.js + Express desplegado en **Cloud Run** (`europe-west1`), reutilizando el proyecto GCP de Klasvid. Código en [backend/](backend/).
  - **Firestore** (nativo) → stock de premios y códigos canjeados (operaciones atómicas).
  - **Google Sheets** → log de escaneos (`escaneos`) y resultados del test (`resultados`).
  - **Secret Manager** → contraseña del profesor, inyectada como env var.

## Despliegue del backend

### 1. Preparar la Google Sheet
Crea una Google Sheet vacía y copia su **ID** (parte entre `/d/` y `/edit` en la URL). Las pestañas `resultados` y `escaneos` se crean automáticamente la primera vez que se escribe en ellas.

### 2. Preparar gcloud
```bash
gcloud auth login
gcloud config set project <id-del-proyecto-klasvid>
```

Si Firestore aún no está inicializado en el proyecto:
```bash
gcloud firestore databases create --location=eur3
```

### 3. Desplegar
```bash
cd backend
export SHEET_ID="id-de-tu-google-sheet"
# opcional — por defecto usa "profesor26":
# export TEACHER_PASSWORD="otra-clave"
./deploy.sh
```

El script:
- Habilita las APIs necesarias (Cloud Run, Cloud Build, Firestore, Sheets, Secret Manager).
- Crea el secreto `lbc-teacher-password` (si no existe) con la contraseña.
- Da permisos al service account por defecto de Cloud Run para leer el secreto.
- Despliega el servicio en `europe-west1` con autoescalado 0→5 instancias.
- Imprime al final la URL pública y el service account.

### 4. Compartir la Sheet con el service account
El script imprime un email tipo `NÚMERO-compute@developer.gserviceaccount.com`. Ve a la Sheet → **Compartir** → añádelo como **Editor**. Sin esto, `submitResults` y el log de escaneos fallarán.

### 5. Conectar el frontend
Copia la URL que imprimió el script y pégala en [index.html](index.html) (busca `const BACKEND_URL`):
```js
const BACKEND_URL = 'https://lbc-orientacion-XXXX-ew.a.run.app/api';
```
Haz commit y push. GitHub Pages servirá la versión nueva en segundos.

### Redeploy tras cambios
Basta con volver a ejecutar `./deploy.sh` desde `backend/`.

## Uso
- **Alumnado**: entra en la URL pública, hace el test y obtiene un QR con su premio.
- **Profesorado**: pulsa “Acceso Profesor” en la portada, introduce la contraseña y selecciona su familia. Desde el panel puede editar nombres y cantidades de los 3 tipos de premio, y escanear los QR del alumnado para canjearlos. El stock se comparte en la nube entre todos los profesores de la misma familia.

## Centro
**IES Luis Bueno Crespo** · Avda. Las Palmeras s/n · 18100 Armilla, Granada
☎ 958 89 37 39 · [iesluisbuenocrespo.es](https://iesluisbuenocrespo.es)
