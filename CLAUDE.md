# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Assignment 3 for Design, Build, Ship (MPCS 51238, Spring 2026). A full-stack Next.js app with Clerk auth, Supabase database, and an external public API. Users can search/browse API data and save items to their account.

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Clerk
- **Database**: Supabase (Postgres, scoped per user via Clerk user ID)
- **External API**: TBD (chosen during brainstorming)
- **Deployment**: Vercel

## Dev Commands

```bash
npm run dev       # Start local dev server
npm run build     # Production build
npm run lint      # ESLint
```

## Environment Variables

All secrets go in `.env.local` (never committed). Required keys:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Any external API keys

## Architecture

- `app/` — Next.js App Router pages and layouts
- `app/api/` — Server-side API routes (external API calls go here, not client-side)
- `components/` — Shared UI components
- `lib/` — Supabase client, API helpers, utility functions
- Clerk middleware in `middleware.ts` protects authenticated routes
- Supabase rows are always filtered by `clerk_user_id` (the logged-in user's Clerk ID)

## Key Patterns

- External API calls are made from API routes (`app/api/`), never directly from the browser
- Supabase data is always scoped: `WHERE clerk_user_id = <current user>`
- Clerk's `auth()` / `currentUser()` are used server-side; `useUser()` / `useAuth()` client-side
