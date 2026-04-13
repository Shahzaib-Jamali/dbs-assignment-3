# Paper Trading Platform — Design Spec

**Date:** 2026-04-13
**Course:** Design, Build, Ship — Assignment 3 (MPCS 51238, Spring 2026)

---

## Overview

A full-stack paper trading platform where users simulate stock and forex trading using real market data but no real money. Every new user starts with $50,000 in fake cash. They can search for assets, buy and sell positions, track their portfolio P&L, and review their trade history.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Clerk (auth) + Supabase (database) + Alpha Vantage (external API) + Vercel (deployment)

---

## Pages

### 1. Home (`/`) — Public
Landing/marketing page. Visible to everyone.
- Hero section: bold headline, tagline ("Trade stocks and forex with zero risk"), two CTAs (Sign Up, Log In)
- 3 feature highlight cards: Real Market Prices, Paper Trading, Track Your P&L
- Clean, inviting entry point that motivates sign-up

### 2. Dashboard (`/dashboard`) — Protected
Portfolio overview for the signed-in user.
- 3 stat cards at top: **Cash Balance**, **Portfolio Value** (holdings at current market price), **Total P&L** (green if positive, red if negative)
- Holdings table: Symbol | Asset Type | Qty | Avg Buy Price | Current Price | Unrealized P&L
- Current prices fetched from Alpha Vantage on page load
- Link/button to Trade page

### 3. Trade (`/trade`) — Protected
Search and execute trades.
- Search bar (ticker symbol or company/pair name, e.g. "Apple", "AAPL", "EUR/USD")
- Results rendered as a list; clicking one opens a trade panel showing:
  - Current live price (fetched from Alpha Vantage)
  - Quantity input
  - Estimated cost (quantity × price, calculated live)
  - **Buy** button (disabled if insufficient cash balance)
  - **Sell** button (only visible if user holds that asset; disabled if quantity exceeds held amount)
- On confirm: API route executes the trade atomically

### 4. History (`/history`) — Protected
Chronological trade log.
- Table: Date | Symbol | Asset Type | Action (BUY/SELL) | Qty | Price at Trade | Total Value
- Newest trades first
- No pagination required for MVP

### Navigation
- Top navbar with logo, links to Dashboard / Trade / History (only when signed in), and Clerk `<UserButton />` for account/sign-out
- Unauthenticated users see only Home with Sign In / Sign Up links

---

## Data Model (Supabase)

### `portfolios`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto-generated |
| `clerk_user_id` | text UNIQUE | Clerk user ID |
| `cash_balance` | numeric | starts at 50000.00 |
| `created_at` | timestamptz | auto |

Created automatically on first `/dashboard` load if no row exists for that `clerk_user_id`.

### `holdings`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `clerk_user_id` | text | |
| `symbol` | text | e.g. `AAPL`, `EUR/USD` |
| `asset_type` | text | `stock` or `forex` |
| `quantity` | numeric | units held |
| `avg_buy_price` | numeric | weighted average cost basis |
| `updated_at` | timestamptz | |

One row per (user, symbol). Upserted on each trade. Row deleted when quantity reaches 0.

### `trades`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `clerk_user_id` | text | |
| `symbol` | text | |
| `asset_type` | text | |
| `action` | text | `BUY` or `SELL` |
| `quantity` | numeric | |
| `price_at_trade` | numeric | live price at execution |
| `total_value` | numeric | quantity × price_at_trade |
| `created_at` | timestamptz | |

Immutable insert-only log. Never updated.

---

## Architecture

### File Structure
```
app/
  page.tsx                  # Home (public)
  dashboard/page.tsx        # Portfolio overview (protected)
  trade/page.tsx            # Search + buy/sell (protected)
  history/page.tsx          # Trade log (protected)
  api/
    search/route.ts         # Alpha Vantage symbol search
    quote/route.ts          # Alpha Vantage live price quote
    trade/route.ts          # Execute buy/sell, update Supabase
  layout.tsx                # ClerkProvider wraps app
middleware.ts               # Protects /dashboard, /trade, /history
lib/
  supabase.ts               # Supabase client (server-side)
  alphaVantage.ts           # Alpha Vantage fetch helpers
components/
  Navbar.tsx
  SearchBar.tsx
  HoldingsTable.tsx
  TradeForm.tsx
  TradeHistoryTable.tsx
  StatCard.tsx
```

### Key Data Flows

**Buy flow:**
1. User types in search bar → `GET /api/search?q=...` → server calls Alpha Vantage SYMBOL_SEARCH
2. User selects asset → `GET /api/quote?symbol=...` → server calls Alpha Vantage GLOBAL_QUOTE or FX_DAILY
3. User enters quantity + clicks Buy → `POST /api/trade` with `{ symbol, action: 'BUY', quantity }`
4. Server: verify `cash_balance >= quantity × price`, deduct balance, upsert `holdings`, insert `trades` row
5. Client: refreshes dashboard state

**Sell flow:**
Same as buy but:
- Server verifies user holds sufficient quantity
- Adds `quantity × price` back to `cash_balance`
- Reduces/removes `holdings` row

**Portfolio value on dashboard:**
- Load all user holdings from Supabase
- Batch fetch current prices from Alpha Vantage for each symbol
- Compute unrealized P&L = (current price − avg_buy_price) × quantity
- Total portfolio value = cash_balance + sum of (current price × quantity) for all holdings

### API Key Security
All Alpha Vantage calls are made from Next.js API routes (server-side). `ALPHA_VANTAGE_API_KEY` is never exposed to the browser.

---

## UI & Design

- **Theme:** Light — white/light gray backgrounds, not dark
- **Accent color:** Teal (`#0d9488` or Tailwind `teal-600`) for buttons, nav, branding
- **P&L colors:** Green for positive, red for negative (standard trading convention)
- **Cards:** Rounded corners, subtle shadows, generous padding — inspired by turquoise.health
- **Typography:** Bold hero headlines, clean hierarchy, plenty of whitespace
- **Animations:** Smooth hover states on cards and buttons, fade-in on search results
- **Responsive:** Mobile-friendly layout

---

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ALPHA_VANTAGE_API_KEY=
```

---

## Stretch Goals (post-MVP)

- Remove/unsave holdings (close position at market price)
- Sorting/filtering on history table
- Search history
- Public leaderboard (who has the highest portfolio value)
