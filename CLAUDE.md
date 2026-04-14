@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Paper trading platform — Assignment 3 for Design, Build, Ship (MPCS 51238, Spring 2026). Users simulate stock and forex trades with $50,000 in virtual cash. Built with Next.js 16 + Tailwind CSS + Clerk + Supabase + Alpha Vantage API, deployed on Vercel.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Auth**: Clerk (`@clerk/nextjs` v7)
- **Database**: Supabase (Postgres) — service role key used server-side
- **External API**: Alpha Vantage (stocks + forex)
- **Deployment**: Vercel

## Dev Commands

```bash
npm run dev       # Start local dev server (Turbopack by default in Next.js 16)
npm run build     # Production build
npm start         # Start production server
```

## Next.js 16 Critical Patterns

**`proxy.ts` not `middleware.ts`**: Next.js 16 renamed `middleware.ts` → `proxy.ts` and the export `middleware` → `proxy`.

**All request-time APIs are async** (breaking change from v15):
```typescript
// WRONG (v14/v15 pattern)
const { userId } = auth()
const cookieStore = cookies()

// CORRECT (v16 pattern)
const { userId } = await auth()
const cookieStore = await cookies()
// params and searchParams in pages are also Promises — must be awaited
```

**Tailwind v4**: Use `@import "tailwindcss"` in CSS, not `@tailwind base/components/utilities`.

## Architecture

```
app/
  layout.tsx          # Root layout — ClerkProvider wraps everything
  page.tsx            # Home (public)
  dashboard/          # Portfolio stats + holdings (protected server component)
  trade/              # Search + buy/sell (protected client component)
  history/            # Trade log (protected server component)
  api/
    search/           # GET — Alpha Vantage SYMBOL_SEARCH + forex filter
    quote/            # GET — Alpha Vantage live price
    portfolio/        # GET — fetch or create user portfolio + holdings
    trade/            # POST — execute BUY/SELL, update Supabase
    history/          # GET — fetch user trade log
proxy.ts              # Clerk auth gate — protects /dashboard, /trade, /history
lib/
  supabase.ts         # Supabase client (service role — SERVER ONLY)
  alphaVantage.ts     # Alpha Vantage fetch helpers
  forex.ts            # Hardcoded major forex pairs
  types.ts            # Shared TypeScript interfaces
components/           # Navbar, StatCard, HoldingsTable, TradeHistoryTable, SearchResults, TradeForm
```

## Key Patterns

- **External API calls go through `/app/api/` routes only** — Alpha Vantage key never reaches the browser
- **All Supabase writes use the service role key** (`SUPABASE_SERVICE_ROLE_KEY`) server-side — never the anon key for mutations
- **Every Supabase query filters by `clerk_user_id`** — this is how data is scoped per user (no RLS)
- **Portfolio auto-created on first `/dashboard` load** if no row exists for that `clerk_user_id`
- **Cash balance**: BUY deducts `quantity × price`, SELL adds it back

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ALPHA_VANTAGE_API_KEY
```
