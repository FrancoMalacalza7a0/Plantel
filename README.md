# Plantel

App de gestión de entrenamientos para preparadores físicos de equipos.
El PF arma la sesión del día con ejercicios y videos de referencia; cada
jugador la ve en su celular, marca lo que hizo, comenta, y carga su RPE
(Borg CR-10) + minutos al terminar. La app calcula la carga de sesión
(sRPE de Foster = RPE × minutos) y el PF ve la carga de todo el plantel.

Nombre provisional: **Plantel**. Cambialo cuando quieras (buscá "Plantel"
y "PLANTEL" en `src/` y `public/manifest.json`).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth (roles PF/jugador), Postgres con Row Level Security
- PWA instalable (manifest + íconos); push notifications: próxima etapa
- Deploy: Vercel

## Puesta en marcha (una vez, ~20 min)

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → **New project**.
2. **Región: elegí una de la Unión Europea (ej. Frankfurt `eu-central-1`).**
   El wellness y los datos físicos de los jugadores son datos de salud
   (datos sensibles según la Ley 25.326), y la UE es jurisdicción
   "adecuada" para transferencia internacional. No uses regiones de EE.UU.
3. Guardá la contraseña de la base.

### 2. Crear el esquema

1. En el panel de Supabase: **SQL Editor** → **New query**.
2. Pegá TODO el contenido de `supabase/schema.sql` → **Run**.
   Crea tablas, trigger de perfiles, funciones, políticas RLS e índices.

### 3. Configurar el auth para el piloto

- **Authentication → Sign In / Providers → Email**: para el piloto,
  desactivá **"Confirm email"** así los jugadores entran sin fricción de
  mail. (Para producción: reactivalo o configurá un SMTP propio.)

### 4. Variables de entorno

1. En Supabase: **Project Settings → API** → copiá `Project URL` y
   `anon public key`.
2. En la raíz del proyecto:

```bash
cp .env.example .env.local
# completá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 5. Correr local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

### 6. Deploy en Vercel

1. Subí el proyecto a un repo de GitHub.
2. En Vercel: **New Project** → importá el repo.
3. Agregá las dos variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en **Settings → Environment Variables**.
4. Deploy. Listo: URL pública para pasarle al PF y al plantel.

## Flujo de prueba (5 minutos, hacelo antes de mostrárselo a nadie)

1. **Registrate como PF** → creá un equipo → anotá el **código** de 6
   caracteres.
2. En **Ejercicios**, cargá 2-3 ejercicios con link de YouTube.
3. En el equipo → **Nueva sesión** (fecha de hoy) → agregá los ejercicios
   con series/reps o minutos → guardar.
4. **En otro navegador (o incógnito), registrate como Jugador** → «Unirme
   a un equipo» → pegá el código.
5. Como jugador vas a ver la **sesión de hoy**: mirá un video, marcá
   «Hecho», dejá un comentario, y al final cargá **RPE + minutos**.
6. Volvé a la cuenta del PF → entrá a la sesión: vas a ver los ✓, los
   comentarios y la **carga (UA)** de cada jugador con el promedio.

## Estructura

```
supabase/schema.sql      ← TODO el modelo de datos + seguridad (RLS)
src/middleware.ts        ← protección de rutas + refresh de sesión
src/lib/supabase/        ← clientes browser y server
src/app/
  page.tsx               ← landing (redirige según rol)
  login/ registro/       ← auth con rol PF o jugador
  unirse/                ← el jugador entra con el código del equipo
  pf/                    ← lado PF: equipos, biblioteca, sesiones, resultados
  jugador/               ← lado jugador: sesión de HOY + RPE
src/components/          ← RpePicker (fichas 0-10), VideoEmbed, SignOut
```

## Qué sigue (roadmap corto)

1. **Dashboard de carga**: sRPE semanal por jugador, monotonía y strain,
   tendencia vs. baseline individual (los datos ya se están guardando).
2. **Wellness diario** (la tabla ya existe): sueño, fatiga, dolor,
   estrés, ánimo 1-5 antes de entrenar, con semáforo para el PF.
3. **Export a Excel** de cargas y wellness (los PF viven en Excel).
4. **Push notifications** (recordatorio "cargá tu RPE"): Web Push con
   VAPID; en iPhone requiere que el jugador agregue la app a la pantalla
   de inicio.
5. **Consentimiento informado** en el registro del jugador (texto simple:
   qué se guarda, para qué, quién lo ve) — necesario antes de un piloto
   real por tratarse de datos de salud.

## Notas de diseño

- Paleta: tinta pizarra `#0C2A22`, césped `#17864B`, tiza `#F4F6F3`,
  cinta `#E8B93B`. Escala RPE con la semántica de Foster:
  verde (0-3) → amarillo (4-6) → naranja (7-8) → rojo (9-10).
- Tipografías: Archivo (display, aire de dorsal) + Instrument Sans
  (cuerpo), vía Google Fonts.
- El flujo del jugador está diseñado para completarse en **menos de un
  minuto**: esa es la métrica que decide si esto vive o muere.
