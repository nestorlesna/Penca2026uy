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
- **Ayuda** — reglas detalladas con ejemplos dinámicos según la config activa

### Para administradores
- **Resultados** — carga de resultados con botones +/− para 90', tiempo extra y penales; botón **"Recalcular todo"** que recalcula puntos de todos los partidos finalizados, propaga ganadores al cuadro eliminatorio y recalcula los +Puntos
- **Partidos** — edición de fecha/hora, equipos y estadio de cada partido
- **Equipos** — edición de nombre, abreviación y bandera de cada equipo
- **Terceros** — ranking de los 12 terceros de grupo para el armado del R32
- **Usuarios** — aprobación y activación/desactivación de usuarios
- **Auditoría** — historial de cambios en predicciones con filtros
- **Configuración** — puntajes parametrizables para todos los tipos de acierto y bonus

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
│   └── groupService.ts
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
└── 10_recalculate_all.sql     # recalculate_all() — recálculo global idempotente
```

---

## Despliegue

### Vercel
1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Agregar variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. Framework preset: **Vite**

### Supabase
- Ejecutar los scripts SQL en orden (ver sección Setup)
- Configurar buckets de Storage: `avatars` y `flags` (públicos)
- Activar Auth providers: Email/Password + Google OAuth

---

## Licencia

Proyecto privado · Todos los derechos reservados · 2025-2026
