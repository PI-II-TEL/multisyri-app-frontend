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
- **TypeScript 5** (strict mode, path alias `@/*` → `./*`)
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- **ESLint 9** flat config (`eslint.config.mjs`)

## Architecture

The project uses the **Next.js App Router** exclusively — no Pages Router. All routes live under `src/app/`.

```
src/
  app/          # Routes, layouts, and pages
  components/   # Reusable UI components
  hooks/        # Custom React hooks
  store/        # Global state management (not yet implemented)
  services/     # API/external service clients
  lib/          # Shared utility libraries
  types/        # TypeScript type definitions
  utils/        # Helper functions
```

Most directories currently contain only `.keep` placeholders — the project is in early development. State management library is not yet chosen.

## Styling

- Tailwind v4 is imported via `@import "tailwindcss"` in `globals.css` (not the v3 `@tailwind` directives).
- Theme uses CSS custom properties (`--background`, `--foreground`) with dark mode via `prefers-color-scheme`.
- Fonts: Geist Sans and Geist Mono, injected as CSS variables (`--font-geist-sans`, `--font-geist-mono`).

## Environment Variables

No `.env` file exists yet. Local overrides go in `.env.local` (gitignored). Never commit `.env` files.
