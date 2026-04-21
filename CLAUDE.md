# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js Version Warning

This project uses **Next.js 16** — a version with breaking changes from prior releases. APIs, conventions, and file structure may differ from older training data. Before writing any code, check `node_modules/next/dist/docs/` for the relevant guide. Heed deprecation notices.

## Commands

```bash
npm run dev    # start dev server at http://localhost:3000
npm run build  # production build
npm start      # serve production build
npm run lint   # ESLint checks
```

## Tech Stack

- **Next.js 16** with App Router (file-based routing under `src/app/`)
- **React 19**
- **TypeScript 5** (strict mode, path alias `@/*` → `./src/*`)
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- **ESLint 9** flat config (`eslint.config.mjs`)

## Architecture

The project uses the **Next.js App Router** exclusively — no Pages Router. All routes live under `src/app/`.

```
src/
  app/
    (shifts)/       # Monitor routes: /home, /map, /support, /handover
    (dashboard)/    # Coordinator routes: /buildings, …
  components/
    ui/             # Generic: Button, Modal, ConfirmDialog, EmptyState, LoadingSpinner, Icon
    buildings/      # HU-22: BuildingCard, BuildingList, BuildingForm, ClassroomList, ClassroomForm, EquipmentManager
    BottomNav.tsx   # Shared bottom tab bar (configurable tabs)
    Toast.tsx       # Toast notifications
  contexts/
    AuthContext.tsx # JWT + localStorage auth, exposes isCoordinator
  hooks/            # useBuildings, useClassrooms, useEquipment
  services/
    api.ts          # apiFetch — base fetch with Bearer token
    shifts.ts       # check-in / check-out / handover API calls
    buildings.ts    # buildings / classrooms / equipment API calls
  types/
    shift.ts        # ShiftSession, Handover, FaultType, etc.
    buildings.ts    # Building, Classroom, ClassroomEquipment (imports FaultType from shift.ts)
  utils/            # Helper functions
```

## Path Alias

`@/*` maps to `src/` — e.g. `import { apiFetch } from '@/services/api'`.

## Routing

- `(shifts)` group uses **BottomNav** with monitor tabs (INICIO, MAPA, SOPORTES, PERFIL).
- `(dashboard)` group uses **BottomNav** with coordinator tabs (MAPA, SOPORTES, EQUIPO, ADMIN).
- Each group provides its own layout. `AuthProvider` lives in the root layout via `src/components/Providers.tsx`.

## API

Base URL: `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`).  
All calls go through `apiFetch` from `src/services/api.ts`. Token is read from `localStorage['access_token']`.

## Styling

- Tailwind v4 is imported via `@import "tailwindcss"` in `globals.css`.
- Brand primary: `#0A2463`. Secondary text: `#6B7280`. Cards: `border-[#E5E7EB]`, `cornerRadius: 12px`.
- Fonts: Geist Sans/Mono as CSS variables.

## Environment Variables

No `.env` file committed. Use `.env.local` (gitignored) for local overrides.  
Key variable: `NEXT_PUBLIC_API_URL=http://localhost:8005/api/v1`
