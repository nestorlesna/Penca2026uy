# PencaLes 2026

Aplicación web de predicciones para la Copa Mundial de Fútbol FIFA 2026. Los usuarios registrados predicen resultados de partidos, acumulan puntos y compiten en un ranking global.

**Torneo:** 48 equipos · 12 grupos (A–L) · 104 partidos · 16 estadios · 11 jun – 19 jul 2026

---

## Funcionalidades

### Para usuarios
- **Fixture** — grilla completa de los 104 partidos, filtrable por fase/grupo/fecha
- **Grupos** — tablas de posiciones en tiempo real con criterios FIFA (Pts → DG → GF)
- **Cuadro** — bracket visual del torneo eliminatorio (dieciseisavos → Final) con banderas y marcadores
- **Mis apuestas** — historial de predicciones y puntos ganados por partido
- **+ Puntos** — apuestas especiales antes del torneo (podio, empates, rango de goles, etc.) con resultado real y puntos ganados visibles por sección
- **Ranking** — tabla de líderes global con puntos totales (partidos + bonus)
- **Subgrupos** — agrupaciones privadas entre jugadores con ranking propio (cada usuario puede crear hasta 3)
- **Ayuda** — reglas detalladas con ejemplos dinámicos según la config activa

### Para administradores
- **Resultados** — carga de resultados con botones +/− para 90', tiempo extra y penales; botón **"Recalcular todo"** que recalcula puntos de todos los partidos finalizados, propaga ganadores al cuadro eliminatorio y recalcula los +Puntos
- **Partidos** — edición de fecha/hora, equipos y estadio de cada partido
- **Equipos** — edición de nombre, abreviación y bandera de cada equipo
- **Terceros** — ranking de los 12 terceros de grupo para el armado del R32
- **Usuarios** — aprobación y activación/desactivación de usuarios
- **Auditoría** — historial de cambios en predicciones con filtros
- **Configuración** — puntajes parametrizables para todos los tipos de acierto y bonus
- **Subgrupos** — habilitar/deshabilitar o eliminar subgrupos creados por usuarios

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Estilos | Tailwind CSS 3 + tema dark personalizado |
| Iconos | Lucide React |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Toasts | Sonner |
| Fechas | date-fns (`es` locale) |
| Deploy | Vercel (frontend) + Supabase (backend) |

---

## Setup local

### Requisitos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)

### 1. Clonar e instalar

```bash
git clone https://github.com/nestorlesna/Penca2026uy.git
cd Penca2026uy
npm install
```

### 2. Variables de entorno

Crear `.env.local` en la raíz:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
VITE_TURNSTILE_SITE_KEY=<tu-site-key-de-cloudflare-turnstile>
```

### 3. Inicializar base de datos

Ejecutar los scripts **en orden** desde el **SQL Editor de Supabase**:

```
supabase/01_schema.sql           # Tablas base
supabase/02_auth_rls.sql         # RLS policies
supabase/03_views_functions.sql  # Vistas, funciones PL/pgSQL y triggers
supabase/05_storage.sql          # Buckets de Storage
supabase/06_audit.sql            # Tabla de auditoría de predicciones
supabase/07_bonus.sql            # Tablas y función de apuestas especiales (+Puntos)
supabase/08_group_overrides.sql  # Overrides admin para posiciones y terceros
supabase/09_combinaciones.sql    # 495 combinaciones FIFA de mejores terceros
supabase/10_recalculate_all.sql  # Función de recálculo global
supabase/11_loader_role.sql      # Rol de cargador de resultados
supabase/12_subgrupos.sql        # Tablas, RLS, funciones y vistas de subgrupos
supabase/00_reset_init.sql       # Carga datos del torneo (grupos, equipos, partidos, etc.)
```

> `04_seed.sql` es opcional — contiene datos de prueba.

> **Importante:** `00_reset_init.sql` requiere que exista un usuario con email `nestor.lesna@gmail.com` en `auth.users` antes de ejecutarse. Ese usuario quedará como administrador.

**Para resets posteriores** (borrar datos y recargar el torneo sin tocar el schema):

```
supabase/00_reset_init.sql
```

### 4. Ejecutar en desarrollo

```bash
npm run dev      # http://localhost:5173
npm run build    # Build de producción
npm run lint     # ESLint
npm run preview  # Preview del build
```

---

## Sistema de puntos

### Por partido

| Situación | Grupos | Eliminatorias |
|-----------|--------|---------------|
| Marcador exacto | 5 pts | 5 + 2 bonus = 7 pts |
| Ganador correcto | 2 pts | 2 pts |
| Empate correcto | 2 pts | — |
| ET resultado exacto | — | 3 pts |
| Ganador en penales | — | 2 pts |

*(valores configurables desde Admin → Configuración)*

### Apuestas especiales (+ Puntos)

| Apuesta | Puntos | Se calcula cuando... |
|---------|--------|----------------------|
| Podio exacto (posición correcta) | 10 pts c/u | M103 y M104 terminados |
| Equipo en top 4 pero posición incorrecta | 5 pts c/u | M103 y M104 terminados |
| Cantidad exacta de empates en grupos | 15 pts | 72 partidos de grupos terminados |
| Rango de goles del torneo | 20 pts | M103 y M104 terminados |
| ¿0-0 en la Final? | 25 pts | M103 y M104 terminados |
| Equipo con más goles | 20 pts | M103 y M104 terminados |
| Grupo con más goles | 13 pts | 72 partidos de grupos terminados |

*(todos configurables desde Admin → Configuración)*

---

## Flujo de cálculo de puntos

```
Admin carga resultado
  └─ setMatchResult()          → actualiza scores + status='finished'
       └─ trigger auto_set_match_winner  → calcula winner_team_id
  └─ calculateMatchPoints()    → calcula puntos de predicciones
  └─ populate_knockout_matches() → propaga ganadores al cuadro
  └─ calculate_bonus_points()  → recalcula +Puntos (si condiciones cumplidas)
```

Si por algún motivo los puntos no se actualizaron, el botón **"Recalcular todo"** en Admin → Resultados ejecuta `recalculate_all()` que procesa todos los partidos finalizados de una vez.

---

## Estructura del proyecto

```
src/
├── App.tsx
├── components/
│   ├── layout/                # Header, BottomNav, Layout
│   ├── ui/                    # Modal, Badge, TeamFlag, etc.
│   ├── admin/                 # ResultForm
│   ├── groups/                # GroupTable
│   └── matches/               # MatchCard, PredictionModal
├── pages/
│   ├── FixturePage.tsx
│   ├── GruposPage.tsx / GrupoDetailPage.tsx / EquipoPage.tsx
│   ├── BracketPage.tsx        # /cuadro
│   ├── RankingPage.tsx
│   ├── MasPuntosPage.tsx      # /mas-puntos
│   ├── MisPrediccionesPage.tsx
│   ├── SubgruposPage.tsx      # /subgrupos
│   ├── SubgrupoDetailPage.tsx # /subgrupos/:id
│   ├── AyudaPage.tsx
│   └── admin/
│       ├── ResultadosPage.tsx
│       ├── PartidosAdminPage.tsx
│       ├── EquiposAdminPage.tsx
│       ├── TercerosPage.tsx
│       ├── UsuariosPage.tsx
│       ├── AuditoriaPage.tsx
│       └── ConfigPage.tsx
├── services/
│   ├── matchService.ts
│   ├── predictionService.ts
│   ├── bonusService.ts
│   ├── adminService.ts
│   ├── combinacionesService.ts
│   ├── leaderboardService.ts
│   ├── auditService.ts
│   ├── teamService.ts
│   ├── groupService.ts
│   └── subgrupoService.ts
├── hooks/                     # useAuth, usePredictions, useStandings, etc.
├── types/                     # Interfaces TypeScript
└── lib/supabase.ts            # Cliente Supabase singleton

supabase/
├── 00_reset_init.sql          # Reset de datos + carga completa del torneo
├── 01_schema.sql              # Tablas base
├── 02_auth_rls.sql            # RLS policies
├── 03_views_functions.sql     # group_standings, best_third_ranking, leaderboard,
│                              #   calculate_match_points(), populate_knockout_matches(),
│                              #   trigger auto_set_match_winner
├── 04_seed.sql                # (opcional) datos de prueba
├── 05_storage.sql             # Buckets Storage
├── 06_audit.sql               # predictions_audit + trigger
├── 07_bonus.sql               # bonus_config, bonus_predictions, bonus_points,
│                              #   calculate_bonus_points(), leaderboard view actualizado
├── 08_group_overrides.sql     # group_position_overrides, best_third_rank_overrides,
│                              #   vistas group_standings/best_third_ranking actualizadas
├── 09_combinaciones.sql       # 495 combinaciones FIFA de mejores terceros
├── 10_recalculate_all.sql     # recalculate_all() — recálculo global idempotente
├── 11_loader_role.sql         # Rol de cargador de resultados
└── 12_subgrupos.sql           # subgrupos, subgrupo_members, RLS, RPC, triggers, vistas
```

---

## Despliegue

### Vercel
1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Agregar variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_TURNSTILE_SITE_KEY`
3. Framework preset: **Vite**

### Supabase
- Ejecutar los scripts SQL en orden (ver sección Setup)
- Configurar buckets de Storage: `avatars` y `flags` (públicos)
- Activar Auth provider: Email/Password

---

## Aplicación Android (Capacitor)

La app móvil se genera con Capacitor, que empaqueta el build web en una app nativa Android.

### Requisitos
- **Android Studio** ([descargar](https://developer.android.com/studio))
- **JDK 17+** (viene incluido con Android Studio)
- **Node.js 18+**

### Primer setup

```bash
# 1. Instalar dependencias (si no están instaladas)
npm install

# 2. Build del proyecto web + sync con Capacitor
npm run cap:sync
```

### Generar APK para instalar

#### Opción A: Desde la terminal (rápido)

```bash
# Build + sync
npm run cap:sync

# Generar APK debug directamente
cd android
./gradlew assembleDebug
# En Windows: gradlew.bat assembleDebug
```

El APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. Se puede instalar directamente en cualquier dispositivo Android (habilitar "Orígenes desconocidos" en ajustes).

#### Opción B: Desde Android Studio (recomendado)

1. Abrir Android Studio → **File → Open** → seleccionar la carpeta `android/`
2. Esperar a que Gradle sincronice el proyecto
3. Conectar un dispositivo Android por USB (con depuración USB activada) o usar un emulador
4. Click en **Run** (▶) o `Shift + F10`

Esto instala la app directamente en el dispositivo/emulador. Para generar un APK manualmente:

**Build → Build Bundle(s) / APK(s) → Build APK(s)**

El APK queda en `android/app/build/outputs/apk/debug/`.

### Generar APK de producción (firmado)

Para distribuir la app fuera de Play Store:

1. Generar un keystore:
```bash
keytool -genkey -v -keystore pencales-release.keystore -alias pencales -keyalg RSA -keysize 2048 -validity 10000
```

2. Crear `android/app/keystore.properties`:
```properties
storePassword=<tu-password>
keyPassword=<tu-password>
keyAlias=pencales
storeFile=../pencales-release.keystore
```

3. En Android Studio: **Build → Generate Signed Bundle / APK** → seleccionar el keystore → elegir **APK** → **Build**

El APK firmado queda en `android/app/release/`.

### Sincronizar cambios del código web

Cada vez que modifiques el código de la app web:

```bash
npm run cap:sync    # Build + copia los archivos a Android
```

O si ya hiciste build manualmente:

```bash
npx cap copy        # Solo copia archivos sin rebuild
npx cap sync        # Copy + actualiza plugins nativos
```

### Actualizar el logo/icono

El logo fuente está en `resources/icon.svg`. Para regenerar todos los iconos y splash screens:

```bash
npx capacitor-assets generate
npx cap sync
```

### Scripts npm disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo web |
| `npm run build` | Build de producción web |
| `npm run cap:sync` | Build web + sync con Capacitor |
| `npm run cap:android` | Build + sync + abre Android Studio |
| `npm run cap:ios` | Build + sync + abre Xcode (solo macOS) |

---

## Licencia

Proyecto privado · Todos los derechos reservados · 2025-2026
