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
- **Contadores en la nube** (Google Apps Script) — varios profesores de la misma familia comparten el stock en tiempo real
- Descuentos atómicos con bloqueo (`LockService`) y protección contra canjes duplicados
- Envío automático de resultados a Google Sheets
- Diseño responsive (móvil, tablet, PC)
- Botón de impresión de informe

## Arquitectura
- **Frontend**: un único `index.html` (sin dependencias) servido por GitHub Pages.
- **Backend**: Google Apps Script (`apps-script.gs`) desplegado como Web App. Almacena stock, contraseña y códigos canjeados en *Script Properties*, y registra escaneos/resultados en una Google Sheet.

## Despliegue del backend (Google Apps Script)

1. Crea una Google Sheet vacía y copia su **ID** (la parte larga entre `/d/` y `/edit` en la URL).
2. Ve a [script.google.com](https://script.google.com/) y crea un proyecto nuevo.
3. Pega el contenido completo de [apps-script.gs](apps-script.gs) en `Code.gs` (sustituyendo el contenido por defecto).
4. En el menú: **Configuración del proyecto → Propiedades del script** → añade dos propiedades:
   - `TEACHER_PASSWORD` = `profesor26` (o la que prefieras)
   - `SHEET_ID` = el ID de la Sheet del paso 1
5. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como*: yo
   - *Quién tiene acceso*: cualquier usuario
6. Copia la URL de la Web App que te devuelve.
7. En `index.html`, busca la constante `BACKEND_URL` (al principio del `<script>`) y pega la URL.
8. Haz commit y push a GitHub Pages.

> ⚠️ **Importante**: cada vez que modifiques `apps-script.gs`, tienes que crear una **nueva versión** de la implementación (*Implementar → Gestionar implementaciones → ✏️ → Nueva versión*) para que los cambios entren en producción.

## Uso
- **Alumnado**: entra en la URL pública, hace el test y obtiene un QR con su premio.
- **Profesorado**: pulsa “Acceso Profesor” en la portada, introduce la contraseña y selecciona su familia. Desde el panel puede editar nombres y cantidades de los 3 tipos de premio, y escanear los QR del alumnado para canjearlos. El stock se comparte en la nube entre todos los profesores de la misma familia.

## Centro
**IES Luis Bueno Crespo** · Avda. Las Palmeras s/n · 18100 Armilla, Granada
☎ 958 89 37 39 · [iesluisbuenocrespo.es](https://iesluisbuenocrespo.es)
