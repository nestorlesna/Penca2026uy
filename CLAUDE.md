# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Penca2026uy** — FIFA World Cup 2026 prediction pool web app. Users register, predict match results, earn points, and compete on a leaderboard. Deployed on Vercel (frontend) + Supabase (PostgreSQL backend, auth, storage).

Tournament data: 48 teams · 12 groups (A–L) · 104 matches · 16 stadiums · June 11 – July 19, 2026.

## Commands

```bash
npm run dev      # Vite dev server on port 5173
npm run build    # tsc && vite build
npm run lint     # eslint . --ext ts,tsx
npm run preview  # Preview production build
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + custom theme (dark, see below) |
| Icons | Lucide React |
| Routing | React Router v6 (nested Layout) |
| Data fetching | TanStack Query v5 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Toasts | Sonner |
| Dates | date-fns with `es` locale |

## Design System

Dark theme, modern and minimalist. All values go in `tailwind.config.js`:

```js
colors: {
  background: '#0B0F1A',   // app background
  surface:    '#141925',   // cards, panels
  border:     '#1E2535',   // dividers, borders
  primary: {
    DEFAULT: '#10B981',    // emerald — main CTA, highlights
    hover:   '#059669',
  },
  accent: {
    DEFAULT: '#F59E0B',    // amber/gold — rankings, trophies
    hover:   '#D97706',
  },
  text: {
    primary:   '#F8FAFC',
    secondary: '#94A3B8',
    muted:     '#475569',
  },
}
```

Font: Inter. Spanish language throughout UI and route paths.

## Architecture

### Directory layout

```
src/
├── main.tsx
├── App.tsx               # BrowserRouter + Routes
├── index.css             # Tailwind globals
├── components/
│   ├── ui/               # Reusable: Modal, Badge, Button, Input, etc.
│   └── layout/           # Layout.tsx, BottomNav.tsx, Header.tsx
├── pages/                # Route-level components, grouped by feature
├── hooks/                # useAuth, usePredictions, useStandings, etc.
├── services/             # Supabase query functions (not hooks)
├── lib/
│   └── supabase.ts       # Supabase client singleton
├── types/                # Shared TypeScript interfaces
└── utils/
    ├── constants.ts
    └── formatters.ts     # Date, score, duration formatters (es locale)
```

### Routing (Spanish paths)

```
/                   → redirect to /fixture
/fixture            → Full schedule, filterable by phase/group/date
/grupos             → All 12 groups with standings tables
/grupos/:grupo      → Group detail + matches
/equipos/:id        → Team profile
/mis-predicciones   → Logged-in user's predictions + points history
/ranking            → Global leaderboard
/perfil             → Edit profile + avatar
/admin/resultados   → Enter match results (admin only)
/admin/config       → Scoring config (admin only)
/admin/usuarios     → Approve/deactivate users (admin only)
```

### Supabase client

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Auth & Authorization

- Supabase Auth (email/password + Google OAuth)
- `profiles` table mirrors `auth.users` — created via trigger on signup
- `profiles.is_active` = false by default; admin must activate user before they can predict
- `profiles.is_admin` = false by default
- RLS policies: public read on fixture data; predictions are user-owned; admin writes via service role or `is_admin` check

### Key database tables

| Table | Purpose |
|-------|---------|
| `groups` | A–L, order 1–12 |
| `phases` | Group/R32/R16/QF/SF/3rd/Final with has_extra_time flag |
| `stadiums` | 16 venues with city, country, address, photo_urls[] |
| `teams` | 48 teams; is_confirmed=false + placeholder for 6 TBD slots |
| `matches` | 104 matches; home/away nullable; slot_label for TBD display (e.g. "1A", "W73") |
| `knockout_slot_rules` | Defines how knockout matchups are calculated (group_position / match_winner / best_third) |
| `profiles` | Auth user profiles; is_active, is_admin flags |
| `predictions` | User predictions; UNIQUE(user_id, match_id); locked when match starts |
| `scoring_config` | Parametric points: exact_score, correct_winner, correct_draw, et_exact, pk_winner, etc. |

**Views (calculated in SQL):**
- `group_standings` — PJ/PG/PE/PP/GF/GC/GD/Pts per team, ranked within group
- `best_third_ranking` — 12 third-place teams ranked for R32 qualification
- `leaderboard` — Total points per user with breakdown by phase

### Prediction model for knockout matches

Group phase: predict `home_score` + `away_score` (90 min only).

Knockout phase: progressive UI —
1. User always predicts 90min score
2. If predicted 90min is a draw → show ET fields (home_et + away_et delta, i.e. additional goals)
3. If ET also draw → show penalty winner selector
Points are awarded independently per layer (90min correct, ET correct, PK correct).

### Knockout bracket auto-population

After group phase ends, a Supabase Edge Function reads `knockout_slot_rules` and updates `home_team_id`/`away_team_id` on R32 matches. Same logic runs after each knockout round. The best-third selection follows the official FIFA 2026 bracket table (6 possible combinations of which 8 of 12 groups contribute a third-place team).

### Score calculation

Supabase Database Function triggered when admin sets a match result. It iterates all `predictions` for that match and sets `points_earned` based on active `scoring_config`.
