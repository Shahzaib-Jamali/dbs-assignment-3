# Paper Trading Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack paper trading platform where users simulate stock and forex trades with a $50,000 starting balance, track portfolio P&L, and review trade history — authenticated via Clerk and persisted in Supabase.

**Architecture:** Next.js App Router with all Alpha Vantage calls made server-side in API routes. Clerk handles auth; the Clerk user ID (`clerk_user_id`) is the foreign key on every Supabase row. All DB writes go through API routes using the Supabase service role key (bypasses RLS; we enforce user scoping manually).

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Clerk (`@clerk/nextjs`), Supabase (`@supabase/supabase-js`), Alpha Vantage REST API, Vercel

---

## File Map

```
app/
  layout.tsx                          # Root layout — ClerkProvider, Navbar, global font
  page.tsx                            # Home/landing page (public)
  dashboard/page.tsx                  # Dashboard — portfolio stats + holdings (protected, server)
  trade/page.tsx                      # Trade page — search + buy/sell (protected, client)
  history/page.tsx                    # History — trade log (protected, server)
  sign-in/[[...sign-in]]/page.tsx    # Clerk-hosted sign-in
  sign-up/[[...sign-up]]/page.tsx    # Clerk-hosted sign-up
  api/
    search/route.ts                   # GET ?q= — stock SYMBOL_SEARCH + forex filter
    quote/route.ts                    # GET ?symbol=&type= — live price from AV
    portfolio/route.ts                # GET — fetch or create user portfolio + holdings
    trade/route.ts                    # POST — execute BUY/SELL, update Supabase
    history/route.ts                  # GET — fetch user's trade log
middleware.ts                         # Clerk middleware — protect /dashboard, /trade, /history
lib/
  supabase.ts                         # Supabase client (service role, server-only)
  alphaVantage.ts                     # AV fetch helpers: search, stockQuote, forexQuote
  forex.ts                            # Hardcoded major forex pairs list
  types.ts                            # Shared TypeScript interfaces
components/
  Navbar.tsx                          # Top nav — logo, links (auth-gated), UserButton
  StatCard.tsx                        # Single portfolio stat (label + value + colour)
  HoldingsTable.tsx                   # Table of current positions
  TradeHistoryTable.tsx               # Table of past trades
  SearchResults.tsx                   # Dropdown list of search hits
  TradeForm.tsx                       # Buy/sell quantity form + confirm button
```

---

## Task 1: Scaffold the Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `.env.local`, `app/globals.css`

- [ ] **Step 1: Create the app**

```bash
cd ~/Desktop/DBS
npx create-next-app@latest "Assignment 3" \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=no \
  --import-alias="@/*"
cd "Assignment 3"
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @clerk/nextjs @supabase/supabase-js
```

- [ ] **Step 3: Create `.env.local`**

Create `/.env.local` with these placeholder keys (fill in real values as you set up each service):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
CLERK_SECRET_KEY=sk_test_placeholder

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_ROLE_KEY=placeholder_service_role_key

ALPHA_VANTAGE_API_KEY=demo
```

> Note: `ALPHA_VANTAGE_API_KEY=demo` uses Alpha Vantage's demo key which returns fixed data for `IBM` (stocks) and `EUR`/`USD` (forex). Replace with your free key from alphavantage.co before submission.

- [ ] **Step 4: Update `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: #0f172a;
  --background: #f8fafc;
}

body {
  background-color: var(--background);
  color: var(--foreground);
}
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: `ready - started server on http://localhost:3000`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with Tailwind, Clerk, Supabase deps"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```typescript
export interface Portfolio {
  id: string
  clerk_user_id: string
  cash_balance: number
  created_at: string
}

export interface Holding {
  id: string
  clerk_user_id: string
  symbol: string
  asset_type: 'stock' | 'forex'
  quantity: number
  avg_buy_price: number
  updated_at: string
  // Enriched client-side:
  current_price?: number
  unrealized_pnl?: number
}

export interface Trade {
  id: string
  clerk_user_id: string
  symbol: string
  asset_type: 'stock' | 'forex'
  action: 'BUY' | 'SELL'
  quantity: number
  price_at_trade: number
  total_value: number
  created_at: string
}

export interface SearchResult {
  symbol: string
  name: string
  asset_type: 'stock' | 'forex'
  from_currency?: string  // forex only
  to_currency?: string    // forex only
}

export interface QuoteResult {
  symbol: string
  price: number
  asset_type: 'stock' | 'forex'
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Supabase Client + Database Tables

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create `lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

// Service role key — NEVER import this file in client components
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

- [ ] **Step 2: Create Supabase project**

1. Go to supabase.com → New Project
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
3. Go to Settings → API → copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

- [ ] **Step 3: Run this SQL in the Supabase SQL editor**

```sql
-- Portfolios: one row per user, holds cash balance
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  cash_balance NUMERIC(15, 2) NOT NULL DEFAULT 50000.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holdings: one row per (user, symbol), upserted on each trade
CREATE TABLE holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'forex')),
  quantity NUMERIC(15, 6) NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(15, 6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clerk_user_id, symbol)
);

-- Trades: immutable log of every buy/sell
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'forex')),
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity NUMERIC(15, 6) NOT NULL,
  price_at_trade NUMERIC(15, 6) NOT NULL,
  total_value NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_holdings_user ON holdings(clerk_user_id);
CREATE INDEX idx_trades_user ON trades(clerk_user_id);
CREATE INDEX idx_trades_created ON trades(created_at DESC);
```

- [ ] **Step 4: Verify tables exist**

In Supabase → Table Editor, confirm `portfolios`, `holdings`, `trades` all appear.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Supabase client and create database tables"
```

---

## Task 4: Clerk Auth + Middleware

**Files:**
- Create: `middleware.ts`, `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Create Clerk app**

1. Go to clerk.com → Create Application
2. Enable Email + Google sign-in (or just email)
3. Copy **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`
4. Copy **Secret Key** → `CLERK_SECRET_KEY` in `.env.local`

- [ ] **Step 2: Create `middleware.ts`**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/trade(.*)',
  '/history(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Step 3: Create `app/sign-in/[[...sign-in]]/page.tsx`**

```tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignIn />
    </main>
  )
}
```

- [ ] **Step 4: Create `app/sign-up/[[...sign-up]]/page.tsx`**

```tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp />
    </main>
  )
}
```

- [ ] **Step 5: Verify auth redirects work**

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard` — should redirect to `/sign-in`.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts app/sign-in app/sign-up
git commit -m "feat: add Clerk middleware and sign-in/sign-up pages"
```

---

## Task 5: Forex Pairs + Alpha Vantage Helpers

**Files:**
- Create: `lib/forex.ts`, `lib/alphaVantage.ts`

- [ ] **Step 1: Create `lib/forex.ts`**

```typescript
export const FOREX_PAIRS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar',            from: 'EUR', to: 'USD' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar',   from: 'GBP', to: 'USD' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen',    from: 'USD', to: 'JPY' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc',     from: 'USD', to: 'CHF' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar',from: 'AUD', to: 'USD' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', from: 'USD', to: 'CAD' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar',from:'NZD', to: 'USD' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound',        from: 'EUR', to: 'GBP' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen',         from: 'EUR', to: 'JPY' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen',from: 'GBP', to: 'JPY' },
]
```

- [ ] **Step 2: Create `lib/alphaVantage.ts`**

```typescript
const AV_BASE = 'https://www.alphavantage.co/query'
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY!

export async function searchSymbols(query: string): Promise<{
  symbol: string; name: string; type: string
}[]> {
  const url = `${AV_BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const matches = data['bestMatches'] ?? []
  return matches.slice(0, 8).map((m: Record<string, string>) => ({
    symbol: m['1. symbol'],
    name: m['2. name'],
    type: m['3. type'],
  }))
}

export async function getStockQuote(symbol: string): Promise<number | null> {
  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()
  const quote = data['Global Quote']
  if (!quote || !quote['05. price']) return null
  return parseFloat(quote['05. price'])
}

export async function getForexQuote(from: string, to: string): Promise<number | null> {
  const url = `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()
  const rate = data['Realtime Currency Exchange Rate']
  if (!rate || !rate['5. Exchange Rate']) return null
  return parseFloat(rate['5. Exchange Rate'])
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/forex.ts lib/alphaVantage.ts
git commit -m "feat: add Alpha Vantage helpers and forex pairs list"
```

---

## Task 6: API Routes — Search + Quote

**Files:**
- Create: `app/api/search/route.ts`, `app/api/quote/route.ts`

- [ ] **Step 1: Create `app/api/search/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchSymbols } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import type { SearchResult } from '@/lib/types'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? ''
  if (!q || q.length < 1) return NextResponse.json([])

  // Match forex pairs
  const forexMatches: SearchResult[] = FOREX_PAIRS
    .filter(p =>
      p.symbol.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.from.toLowerCase().includes(q) ||
      p.to.toLowerCase().includes(q)
    )
    .map(p => ({
      symbol: p.symbol,
      name: p.name,
      asset_type: 'forex',
      from_currency: p.from,
      to_currency: p.to,
    }))

  // Search stocks via Alpha Vantage
  let stockMatches: SearchResult[] = []
  try {
    const avResults = await searchSymbols(q)
    stockMatches = avResults
      .filter(r => r.type === 'Equity')
      .map(r => ({
        symbol: r.symbol,
        name: r.name,
        asset_type: 'stock',
      }))
  } catch {
    // AV search failed — return forex only
  }

  const combined: SearchResult[] = [...forexMatches, ...stockMatches]
  return NextResponse.json(combined)
}
```

- [ ] **Step 2: Create `app/api/quote/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import type { QuoteResult } from '@/lib/types'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? ''
  const type = req.nextUrl.searchParams.get('type') as 'stock' | 'forex' | null

  if (!symbol || !type) {
    return NextResponse.json({ error: 'symbol and type required' }, { status: 400 })
  }

  let price: number | null = null

  if (type === 'stock') {
    price = await getStockQuote(symbol)
  } else {
    const pair = FOREX_PAIRS.find(p => p.symbol === symbol)
    if (!pair) return NextResponse.json({ error: 'Unknown forex pair' }, { status: 400 })
    price = await getForexQuote(pair.from, pair.to)
  }

  if (price === null) {
    return NextResponse.json({ error: 'Could not fetch price' }, { status: 502 })
  }

  const result: QuoteResult = { symbol, price, asset_type: type }
  return NextResponse.json(result)
}
```

- [ ] **Step 3: Verify search endpoint**

```bash
npm run dev
# In another terminal:
curl "http://localhost:3000/api/search?q=IBM"
# Expected: JSON array with IBM stock in results

curl "http://localhost:3000/api/search?q=EUR"
# Expected: JSON array including EUR/USD, EUR/GBP, EUR/JPY
```

- [ ] **Step 4: Verify quote endpoint**

```bash
curl "http://localhost:3000/api/quote?symbol=IBM&type=stock"
# Expected: { symbol: "IBM", price: <number>, asset_type: "stock" }

curl "http://localhost:3000/api/quote?symbol=EUR%2FUSD&type=forex"
# Expected: { symbol: "EUR/USD", price: <number>, asset_type: "forex" }
```

- [ ] **Step 5: Commit**

```bash
git add app/api/search app/api/quote
git commit -m "feat: add search and quote API routes"
```

---

## Task 7: Portfolio API Route

**Files:**
- Create: `app/api/portfolio/route.ts`

- [ ] **Step 1: Create `app/api/portfolio/route.ts`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Portfolio, Holding } from '@/lib/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get or create portfolio
  let { data: portfolio, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // No row found — create one
    const { data: created, error: createError } = await supabase
      .from('portfolios')
      .insert({ clerk_user_id: userId, cash_balance: 50000 })
      .select()
      .single()

    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })
    portfolio = created
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get holdings
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('*')
    .eq('clerk_user_id', userId)
    .gt('quantity', 0)

  if (holdingsError) return NextResponse.json({ error: holdingsError.message }, { status: 500 })

  return NextResponse.json({
    portfolio: portfolio as Portfolio,
    holdings: (holdings ?? []) as Holding[],
  })
}
```

- [ ] **Step 2: Verify portfolio creation**

Sign in through the app, then:

```bash
curl -H "Cookie: <your-clerk-cookie>" "http://localhost:3000/api/portfolio"
```

Or test it from the browser console after signing in:

```javascript
fetch('/api/portfolio').then(r => r.json()).then(console.log)
```

Expected: `{ portfolio: { cash_balance: 50000, ... }, holdings: [] }`

- [ ] **Step 3: Commit**

```bash
git add app/api/portfolio
git commit -m "feat: add portfolio GET route — creates portfolio on first visit"
```

---

## Task 8: Trade Execution API Route

**Files:**
- Create: `app/api/trade/route.ts`

- [ ] **Step 1: Create `app/api/trade/route.ts`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { symbol, asset_type, action, quantity } = body as {
    symbol: string
    asset_type: 'stock' | 'forex'
    action: 'BUY' | 'SELL'
    quantity: number
  }

  if (!symbol || !asset_type || !action || !quantity || quantity <= 0) {
    return NextResponse.json({ error: 'Invalid trade parameters' }, { status: 400 })
  }

  // Fetch live price
  let price: number | null = null
  if (asset_type === 'stock') {
    price = await getStockQuote(symbol)
  } else {
    const pair = FOREX_PAIRS.find(p => p.symbol === symbol)
    if (!pair) return NextResponse.json({ error: 'Unknown forex pair' }, { status: 400 })
    price = await getForexQuote(pair.from, pair.to)
  }

  if (price === null) return NextResponse.json({ error: 'Could not fetch price' }, { status: 502 })

  const total_value = parseFloat((price * quantity).toFixed(2))

  // Fetch current portfolio
  const { data: portfolio, error: pErr } = await supabase
    .from('portfolios')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  if (pErr || !portfolio) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

  if (action === 'BUY') {
    if (portfolio.cash_balance < total_value) {
      return NextResponse.json({ error: 'Insufficient cash balance' }, { status: 400 })
    }

    // Deduct cash
    const { error: balErr } = await supabase
      .from('portfolios')
      .update({ cash_balance: portfolio.cash_balance - total_value })
      .eq('clerk_user_id', userId)

    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 })

    // Upsert holding (weighted average on new buy)
    const { data: existing } = await supabase
      .from('holdings')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('symbol', symbol)
      .single()

    if (existing && existing.quantity > 0) {
      const newQty = existing.quantity + quantity
      const newAvg = ((existing.avg_buy_price * existing.quantity) + (price * quantity)) / newQty
      await supabase
        .from('holdings')
        .update({ quantity: newQty, avg_buy_price: newAvg, updated_at: new Date().toISOString() })
        .eq('clerk_user_id', userId)
        .eq('symbol', symbol)
    } else {
      await supabase
        .from('holdings')
        .upsert({
          clerk_user_id: userId,
          symbol,
          asset_type,
          quantity,
          avg_buy_price: price,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_user_id,symbol' })
    }
  }

  if (action === 'SELL') {
    const { data: holding } = await supabase
      .from('holdings')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('symbol', symbol)
      .single()

    if (!holding || holding.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient holdings to sell' }, { status: 400 })
    }

    // Add cash back
    const { error: balErr } = await supabase
      .from('portfolios')
      .update({ cash_balance: portfolio.cash_balance + total_value })
      .eq('clerk_user_id', userId)

    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 })

    // Reduce holding
    const newQty = holding.quantity - quantity
    if (newQty === 0) {
      await supabase
        .from('holdings')
        .delete()
        .eq('clerk_user_id', userId)
        .eq('symbol', symbol)
    } else {
      await supabase
        .from('holdings')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('clerk_user_id', userId)
        .eq('symbol', symbol)
    }
  }

  // Log the trade
  const { error: tradeErr } = await supabase
    .from('trades')
    .insert({
      clerk_user_id: userId,
      symbol,
      asset_type,
      action,
      quantity,
      price_at_trade: price,
      total_value,
    })

  if (tradeErr) return NextResponse.json({ error: tradeErr.message }, { status: 500 })

  return NextResponse.json({ success: true, price, total_value })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/trade
git commit -m "feat: add trade execution API route with buy/sell logic"
```

---

## Task 9: History API Route

**Files:**
- Create: `app/api/history/route.ts`

- [ ] **Step 1: Create `app/api/history/route.ts`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Trade } from '@/lib/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data as Trade[])
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/history
git commit -m "feat: add trade history API route"
```

---

## Task 10: Navbar + Root Layout

**Files:**
- Create: `components/Navbar.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/Navbar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trade',     label: 'Trade' },
  { href: '/history',  label: 'History' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-teal-600">PaperTrade</span>
        </Link>

        {/* Nav links — signed-in only */}
        <SignedIn>
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-teal-600'
                    : 'text-slate-600 hover:text-teal-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </SignedIn>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="redirect">
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Log In
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import Navbar from '@/components/Navbar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PaperTrade — Practice Trading',
  description: 'Simulate stock and forex trading with $50,000 in virtual cash',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-slate-50 text-slate-900`}>
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 3: Verify navbar renders**

```bash
npm run dev
```

Visit `http://localhost:3000` — navbar with "PaperTrade" logo, Sign Up / Log In buttons should appear.

- [ ] **Step 4: Commit**

```bash
git add components/Navbar.tsx app/layout.tsx
git commit -m "feat: add Navbar with Clerk auth state and root layout"
```

---

## Task 11: Home Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'

const features = [
  {
    icon: '📈',
    title: 'Real Market Prices',
    description: 'Live stock and forex quotes powered by Alpha Vantage — no fake data.',
  },
  {
    icon: '💰',
    title: '$50K Starting Balance',
    description: 'Every account starts with $50,000 in virtual cash to practice with.',
  },
  {
    icon: '📊',
    title: 'Track Your P&L',
    description: 'Monitor unrealized gains and losses across your full portfolio in real time.',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="inline-block rounded-full bg-teal-100 px-4 py-1 text-sm font-semibold text-teal-700 mb-6">
            Paper Trading · Zero Risk
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Trade stocks &amp; forex
            <span className="text-teal-600"> without the risk</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-600 mb-10">
            Practice investing with $50,000 in virtual cash. Search real assets, execute simulated trades,
            and track your portfolio — no money on the line.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <Link
                href="/sign-up"
                className="rounded-xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-teal-700 transition-all hover:shadow-teal-200 hover:shadow-xl"
              >
                Start Trading Free
              </Link>
              <Link
                href="/sign-in"
                className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Log In
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-teal-700 transition-all"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/trade"
                className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Start Trading
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-4">
            Everything you need to practice
          </h2>
          <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
            Build trading skills and test strategies with real market data — completely risk-free.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map(f => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-8 shadow-sm hover:shadow-md hover:border-teal-100 transition-all"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-teal-700">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to start practicing?
          </h2>
          <p className="text-teal-100 mb-8 text-lg">
            Create a free account and get $50,000 in virtual cash instantly.
          </p>
          <SignedOut>
            <Link
              href="/sign-up"
              className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-teal-700 hover:bg-teal-50 transition-colors shadow-lg"
            >
              Create Free Account
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/trade"
              className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-teal-700 hover:bg-teal-50 transition-colors shadow-lg"
            >
              Make Your First Trade
            </Link>
          </SignedIn>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Verify home page**

```bash
npm run dev
```

Visit `http://localhost:3000` — hero, 3 feature cards, CTA banner. Check both signed-out and signed-in states show different CTA buttons.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: build home landing page with hero and feature cards"
```

---

## Task 12: Reusable Components

**Files:**
- Create: `components/StatCard.tsx`, `components/HoldingsTable.tsx`, `components/TradeHistoryTable.tsx`

- [ ] **Step 1: Create `components/StatCard.tsx`**

```tsx
interface StatCardProps {
  label: string
  value: string
  subtext?: string
  variant?: 'default' | 'positive' | 'negative'
}

export default function StatCard({ label, value, subtext, variant = 'default' }: StatCardProps) {
  const valueColor =
    variant === 'positive' ? 'text-emerald-600' :
    variant === 'negative' ? 'text-red-500' :
    'text-slate-900'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/HoldingsTable.tsx`**

```tsx
import type { Holding } from '@/lib/types'

interface HoldingsTableProps {
  holdings: Holding[]
}

export default function HoldingsTable({ holdings }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400">
        No holdings yet. Head to the{' '}
        <a href="/trade" className="text-teal-600 hover:underline font-medium">Trade page</a>{' '}
        to buy your first asset.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3 text-left">Symbol</th>
            <th className="px-6 py-3 text-left">Type</th>
            <th className="px-6 py-3 text-right">Qty</th>
            <th className="px-6 py-3 text-right">Avg Buy</th>
            <th className="px-6 py-3 text-right">Current</th>
            <th className="px-6 py-3 text-right">Unrealized P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {holdings.map(h => {
            const pnl = h.current_price != null
              ? (h.current_price - h.avg_buy_price) * h.quantity
              : null
            const isPositive = pnl != null && pnl >= 0

            return (
              <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-900">{h.symbol}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    h.asset_type === 'forex'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-teal-50 text-teal-700'
                  }`}>
                    {h.asset_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-700">{Number(h.quantity).toFixed(4)}</td>
                <td className="px-6 py-4 text-right text-slate-700">${Number(h.avg_buy_price).toFixed(4)}</td>
                <td className="px-6 py-4 text-right text-slate-700">
                  {h.current_price != null ? `$${h.current_price.toFixed(4)}` : '—'}
                </td>
                <td className={`px-6 py-4 text-right font-semibold ${
                  pnl == null ? 'text-slate-400' :
                  isPositive ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {pnl != null ? `${isPositive ? '+' : ''}$${pnl.toFixed(2)}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/TradeHistoryTable.tsx`**

```tsx
import type { Trade } from '@/lib/types'

interface TradeHistoryTableProps {
  trades: Trade[]
}

export default function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400">
        No trades yet. Make your first trade on the{' '}
        <a href="/trade" className="text-teal-600 hover:underline font-medium">Trade page</a>.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3 text-left">Date</th>
            <th className="px-6 py-3 text-left">Symbol</th>
            <th className="px-6 py-3 text-left">Type</th>
            <th className="px-6 py-3 text-left">Action</th>
            <th className="px-6 py-3 text-right">Qty</th>
            <th className="px-6 py-3 text-right">Price</th>
            <th className="px-6 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {trades.map(t => (
            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-slate-500">
                {new Date(t.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td className="px-6 py-4 font-semibold text-slate-900">{t.symbol}</td>
              <td className="px-6 py-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.asset_type === 'forex'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-teal-50 text-teal-700'
                }`}>
                  {t.asset_type}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                  t.action === 'BUY'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {t.action}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-slate-700">{Number(t.quantity).toFixed(4)}</td>
              <td className="px-6 py-4 text-right text-slate-700">${Number(t.price_at_trade).toFixed(4)}</td>
              <td className="px-6 py-4 text-right font-semibold text-slate-900">
                ${Number(t.total_value).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/StatCard.tsx components/HoldingsTable.tsx components/TradeHistoryTable.tsx
git commit -m "feat: add StatCard, HoldingsTable, TradeHistoryTable components"
```

---

## Task 13: Dashboard Page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import StatCard from '@/components/StatCard'
import HoldingsTable from '@/components/HoldingsTable'
import Link from 'next/link'
import type { Holding, Portfolio } from '@/lib/types'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Get or create portfolio
  let portfolio: Portfolio | null = null
  const { data: existing, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    const { data: created } = await supabase
      .from('portfolios')
      .insert({ clerk_user_id: userId, cash_balance: 50000 })
      .select()
      .single()
    portfolio = created
  } else {
    portfolio = existing
  }

  // Get holdings
  const { data: rawHoldings } = await supabase
    .from('holdings')
    .select('*')
    .eq('clerk_user_id', userId)
    .gt('quantity', 0)

  const holdings: Holding[] = rawHoldings ?? []

  // Enrich holdings with current prices
  const enriched: Holding[] = await Promise.all(
    holdings.map(async h => {
      let currentPrice: number | null = null
      try {
        if (h.asset_type === 'stock') {
          currentPrice = await getStockQuote(h.symbol)
        } else {
          const pair = FOREX_PAIRS.find(p => p.symbol === h.symbol)
          if (pair) currentPrice = await getForexQuote(pair.from, pair.to)
        }
      } catch { /* ignore price fetch errors */ }

      const unrealizedPnl = currentPrice != null
        ? (currentPrice - h.avg_buy_price) * h.quantity
        : null

      return {
        ...h,
        current_price: currentPrice ?? undefined,
        unrealized_pnl: unrealizedPnl ?? undefined,
      }
    })
  )

  // Compute portfolio value
  const holdingsValue = enriched.reduce((sum, h) => {
    return sum + (h.current_price != null ? h.current_price * h.quantity : 0)
  }, 0)
  const cashBalance = portfolio?.cash_balance ?? 0
  const totalValue = cashBalance + holdingsValue
  const totalPnl = totalValue - 50000

  const formatUSD = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Portfolio</h1>
          <p className="text-slate-500 mt-1">Your paper trading account overview</p>
        </div>
        <Link
          href="/trade"
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
        >
          + New Trade
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-3 mb-8">
        <StatCard
          label="Cash Balance"
          value={formatUSD(cashBalance)}
          subtext="Available to trade"
        />
        <StatCard
          label="Portfolio Value"
          value={formatUSD(totalValue)}
          subtext="Cash + holdings"
        />
        <StatCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? '+' : ''}${formatUSD(totalPnl)}`}
          subtext={`${totalPnl >= 0 ? '+' : ''}${((totalPnl / 50000) * 100).toFixed(2)}% vs starting balance`}
          variant={totalPnl >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Holdings */}
      <h2 className="text-xl font-bold text-slate-900 mb-4">Current Holdings</h2>
      <HoldingsTable holdings={enriched} />
    </main>
  )
}
```

- [ ] **Step 2: Verify dashboard**

Sign in, visit `http://localhost:3000/dashboard`.

Expected: 3 stat cards showing $50,000 cash, $50,000 total value, $0.00 P&L. Empty holdings table with link to Trade.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard
git commit -m "feat: build dashboard page with portfolio stats and holdings table"
```

---

## Task 14: Trade Page Components + Page

**Files:**
- Create: `components/SearchResults.tsx`, `components/TradeForm.tsx`, `app/trade/page.tsx`

- [ ] **Step 1: Create `components/SearchResults.tsx`**

```tsx
import type { SearchResult } from '@/lib/types'

interface SearchResultsProps {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}

export default function SearchResults({ results, onSelect }: SearchResultsProps) {
  if (results.length === 0) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {results.map(r => (
        <button
          key={r.symbol}
          onClick={() => onSelect(r)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
        >
          <div>
            <span className="font-semibold text-slate-900">{r.symbol}</span>
            <span className="ml-2 text-sm text-slate-500">{r.name}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            r.asset_type === 'forex'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-teal-50 text-teal-700'
          }`}>
            {r.asset_type}
          </span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/TradeForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { SearchResult, QuoteResult, Holding } from '@/lib/types'

interface TradeFormProps {
  selected: SearchResult
  quote: QuoteResult | null
  userHolding: Holding | null
  cashBalance: number
  onTrade: (action: 'BUY' | 'SELL', quantity: number) => Promise<void>
}

export default function TradeForm({ selected, quote, userHolding, cashBalance, onTrade }: TradeFormProps) {
  const [quantity, setQuantity] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qty = parseFloat(quantity) || 0
  const price = quote?.price ?? 0
  const estimatedCost = qty * price

  const canBuy = qty > 0 && cashBalance >= estimatedCost && price > 0
  const canSell = qty > 0 && userHolding != null && userHolding.quantity >= qty && price > 0

  const handleTrade = async (action: 'BUY' | 'SELL') => {
    setError(null)
    setLoading(true)
    try {
      await onTrade(action, qty)
      setQuantity('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Trade failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      {/* Asset info */}
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">{selected.symbol}</h3>
        <p className="text-sm text-slate-500">{selected.name}</p>
        {quote ? (
          <p className="text-3xl font-bold text-teal-600 mt-2">
            ${quote.price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          </p>
        ) : (
          <p className="text-slate-400 mt-2 animate-pulse">Fetching price…</p>
        )}
      </div>

      {/* Holding info */}
      {userHolding && userHolding.quantity > 0 && (
        <div className="mb-4 rounded-lg bg-teal-50 px-4 py-3 text-sm">
          <span className="text-teal-700 font-medium">You hold:</span>{' '}
          <span className="text-teal-900 font-bold">{Number(userHolding.quantity).toFixed(4)} units</span>
        </div>
      )}

      {/* Quantity input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
        <input
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="e.g. 10"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Estimated cost */}
      {qty > 0 && price > 0 && (
        <div className="mb-5 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">Estimated {qty > 0 ? 'cost' : 'value'}:</span>{' '}
          <span className="font-bold text-slate-900">
            ${estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 font-medium">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          disabled={!canBuy || loading}
          onClick={() => handleTrade('BUY')}
          className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing…' : 'Buy'}
        </button>
        <button
          disabled={!canSell || loading}
          onClick={() => handleTrade('SELL')}
          className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing…' : 'Sell'}
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-400 text-center">
        Cash available: ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/trade/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import SearchResults from '@/components/SearchResults'
import TradeForm from '@/components/TradeForm'
import type { SearchResult, QuoteResult, Holding, Portfolio } from '@/lib/types'

export default function TradePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load portfolio on mount
  const loadPortfolio = useCallback(async () => {
    const res = await fetch('/api/portfolio')
    const data = await res.json()
    setPortfolio(data.portfolio)
    setHoldings(data.holdings)
  }, [])

  useEffect(() => { loadPortfolio() }, [loadPortfolio])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        setResults(await res.json())
      } finally {
        setSearchLoading(false)
      }
    }, 400)
  }, [query])

  // Fetch quote when asset selected
  useEffect(() => {
    if (!selected) { setQuote(null); return }
    setQuote(null)
    fetch(`/api/quote?symbol=${encodeURIComponent(selected.symbol)}&type=${selected.asset_type}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setQuote(data) })
  }, [selected])

  const handleSelect = (result: SearchResult) => {
    setSelected(result)
    setQuery('')
    setResults([])
    setTradeSuccess(null)
  }

  const handleTrade = async (action: 'BUY' | 'SELL', quantity: number) => {
    if (!selected) return
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: selected.symbol,
        asset_type: selected.asset_type,
        action,
        quantity,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Trade failed')
    setTradeSuccess(`${action} ${quantity} × ${selected.symbol} @ $${data.price.toFixed(4)} — Total: $${data.total_value.toFixed(2)}`)
    await loadPortfolio()
  }

  const userHolding = holdings.find(h => h.symbol === selected?.symbol) ?? null

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Trade</h1>
        <p className="text-slate-500 mt-1">Search for a stock or forex pair to buy or sell</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white shadow-sm px-4">
          <svg className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search stocks or forex… (e.g. Apple, AAPL, EUR/USD)"
            className="flex-1 py-4 text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          {searchLoading && (
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        {results.length > 0 && (
          <SearchResults results={results} onSelect={handleSelect} />
        )}
      </div>

      {/* Trade success */}
      {tradeSuccess && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm font-medium text-emerald-700">
          ✓ Trade executed: {tradeSuccess}
        </div>
      )}

      {/* Trade form */}
      {selected ? (
        <TradeForm
          selected={selected}
          quote={quote}
          userHolding={userHolding}
          cashBalance={portfolio?.cash_balance ?? 0}
          onTrade={handleTrade}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
          <p className="text-lg font-medium">Search for an asset above to start trading</p>
          <p className="text-sm mt-2">Stocks (e.g. AAPL, TSLA) and forex pairs (e.g. EUR/USD)</p>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Verify trade page end-to-end**

1. Sign in → visit `/trade`
2. Type "IBM" → confirm results appear in dropdown
3. Click IBM → confirm price loads in TradeForm
4. Enter quantity 1 → click Buy
5. Expected: success message, check `/dashboard` cash balance decreased

- [ ] **Step 5: Commit**

```bash
git add components/SearchResults.tsx components/TradeForm.tsx app/trade
git commit -m "feat: build trade page with search, quote, and buy/sell execution"
```

---

## Task 15: History Page

**Files:**
- Create: `app/history/page.tsx`

- [ ] **Step 1: Create `app/history/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TradeHistoryTable from '@/components/TradeHistoryTable'
import type { Trade } from '@/lib/types'

export default async function HistoryPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-red-500">Failed to load trade history.</p>
      </main>
    )
  }

  const trades = (data ?? []) as Trade[]
  const totalVolume = trades.reduce((sum, t) => sum + Number(t.total_value), 0)

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trade History</h1>
          <p className="text-slate-500 mt-1">
            {trades.length} trade{trades.length !== 1 ? 's' : ''} ·{' '}
            ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} total volume
          </p>
        </div>
      </div>
      <TradeHistoryTable trades={trades} />
    </main>
  )
}
```

- [ ] **Step 2: Verify history page**

After making a trade on `/trade`, visit `/history`. Confirm the trade appears in the table with correct action, quantity, price, and total.

- [ ] **Step 3: Commit**

```bash
git add app/history
git commit -m "feat: build trade history page"
```

---

## Task 16: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<your-username>/paper-trading.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Import project on Vercel**

1. Go to vercel.com → Add New → Project → Import GitHub repo
2. Vercel detects Next.js automatically — keep defaults

- [ ] **Step 3: Add all environment variables in Vercel dashboard**

Under Settings → Environment Variables, add each of these for Production:

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

- [ ] **Step 4: Deploy**

Trigger a deploy (push a commit or click "Redeploy"). Wait for build to succeed.

- [ ] **Step 5: Add Vercel URL to Clerk allowed origins**

In Clerk dashboard → Settings → Domains → Add your `https://<your-app>.vercel.app` URL.

- [ ] **Step 6: Smoke test the live URL**

1. Visit the live URL → home page loads
2. Sign up with a new account → redirected to dashboard with $50,000 balance
3. Go to Trade → search IBM → buy 1 share → confirm success
4. Go to Dashboard → see updated cash balance and IBM holding
5. Go to History → confirm trade appears

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: final deployment verified"
git push
```

---

## Self-Review Checklist (Spec Coverage)

| Spec requirement | Covered by task |
|---|---|
| Next.js + Tailwind CSS | Task 1 |
| Clerk auth (sign up, log in, sign out) | Task 4, 10 |
| Supabase data scoped to user | Tasks 3, 7, 8, 9 |
| External API (Alpha Vantage) | Tasks 5, 6 |
| Search/browse API data | Task 6, 14 |
| Save items (buy trades) | Task 8 |
| View saved items (dashboard + history) | Tasks 13, 15 |
| $50K starting balance | Task 3 (SQL default), Task 7, 13 |
| BUY decreases balance, SELL increases | Task 8 |
| Environment variables in .env.local | Task 1 |
| Multiple git commits | Every task ends with a commit |
| Deploy to Vercel with env vars | Task 16 |
| Live URL works | Task 16 |
| 4-page website (Home, Dashboard, Trade, History) | Tasks 11, 13, 14, 15 |
| Teal/light design inspired by turquoise.health | Tasks 10, 11, 12, 14 |
