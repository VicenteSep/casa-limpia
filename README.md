# 🧹 Casa Limpia

La limpieza de la casa, en equipo contra Dusty. PWA para Vicho y Cami.

- Tareas por habitación con periodicidad y próxima fecha editable.
- **Este finde**: lo que le toca a cada uno (Cocina → Vicho, Baño → Cami, el resto se reparte con un toque).
- **Dusty**: cada tarea hecha le quita vida. Si llegan a 0 antes del domingo, lo derrotan.
- **Los gatos** muestran cómo está la casa (felices / sospechosos / estornudando).
- Sincronización en tiempo real entre los dos teléfonos (Supabase).
- Aviso cada sábado por la mañana: "Vicho, este finde te toca…".

Sin configurar nada, la app arranca en **modo demo** (datos solo en ese teléfono).

---

## Puesta en marcha (≈15 min, una sola vez)

### 1. Supabase (la base de datos compartida)
1. Entra a <https://supabase.com> → **Start your project** → crea cuenta (gratis, sin tarjeta).
2. **New project** → nombre `casa-limpia`, región **West EU / Central EU**, inventa una contraseña de BD y guárdala.
3. Cuando termine de crearse: menú izquierdo **SQL Editor** → **New query**.
   - Abre `supabase/schema.sql`, **cambia los dos emails** (`EMAIL_DE_VICHO…`, `EMAIL_DE_CAMI…`), pégalo y pulsa **Run**.
   - Nueva query → pega `supabase/seed.sql` → **Run** (carga las 56 tareas).
4. **Authentication → Sign In / Providers → Email**: desactiva **Confirm email** (así no hay que confirmar por correo). Guarda.
5. **Project Settings → API Keys** (o **Data API**): copia
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_…`) → esta va en la app, es pública.
   - **Secret key** (`sb_secret_…`) → esta es secreta, solo para GitHub (paso 3).

### 2. Conectar la app
En `config.js` rellena `supabaseUrl` y `supabaseKey` con la URL y la Publishable key.

### 3. GitHub (publicar y avisos)
1. Sube esta carpeta a un repo de GitHub.
2. **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
   En ~1 min la app queda en `https://<usuario>.github.io/<repo>/`.
3. **Settings → Secrets and variables → Actions → New repository secret**, crea:
   | Nombre | Valor |
   |---|---|
   | `SUPABASE_URL` | la Project URL |
   | `SUPABASE_SECRET_KEY` | la Secret key |
   | `VAPID_PUBLIC_KEY` | la que está en `config.js` |
   | `VAPID_PRIVATE_KEY` | la clave privada que te pasé aparte (no la subas al repo) |
   | `APP_URL` | la URL de GitHub Pages |
4. Prueba: **Actions → Avisos del finde → Run workflow**.

### 4. En cada iPhone
1. Abre la URL en **Safari** → botón Compartir → **Añadir a pantalla de inicio**.
2. Abre la app desde el ícono → **Primera vez: crear cuenta** con tu email (el mismo del paso 1.3).
3. ⚙️ → **Activar avisos en este teléfono** → Permitir.

---

## Cómo funciona
- **Al marcar una tarea**, la próxima fecha se calcula como *hoy + periodicidad* y se ajusta al **sábado** de esa semana. Siempre puedes cambiarla a mano (o con los botones "Este finde", "Próximo finde", "+1 semana"…).
- **Asignación**: las habitaciones con responsable fijo (Cocina, Baño) siempre le llegan a esa persona. Las demás aparecen en "Sin asignar" y se reparten con un toque. Al marcarlas hechas vuelven a quedar sin asignar para el siguiente finde. Se puede fijar un responsable en cualquier tarea o habitación.
- **Puntos**: cada tarea quita 5–30 puntos de vida a Dusty (por defecto según lo seguida que sea; editable).
- **Supabase gratis** pausa proyectos sin actividad durante 7 días. El aviso del sábado y un ping los miércoles lo mantienen despierto.

## Archivos
`index.html`, `app.js` (pantallas), `store.js` (datos), `dates.js`, `seed.js` (tareas iniciales para el demo), `sw.js` (offline + avisos), `supabase/*.sql`, `scripts/avisos.mjs` + `.github/workflows/avisos.yml` (avisos del sábado).
