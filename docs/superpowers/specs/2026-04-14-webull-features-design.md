# Webull-Comparable Features — Design Spec
Date: 2026-04-14

## Overview

Add three features to close the gap with Webull's paper trading platform:
1. Candlestick chart with line/candle toggle
2. Watchlist — dedicated `/watchlist` page
3. Bankruptcy reset — portfolio reset only when value < $1,000

---

## Feature 1: Chart Toggle (Line ↔ Candlestick)

### UX
- `TimeRangeTabs` component gains a toggle on its right side: two buttons `📈 Line` and `🕯 Candle`
- Active mode is highlighted in teal, inactive in slate
- Toggle state lives in `TradePage` (parent), passed down as a `mode` prop
- Chart cache key includes mode: e.g. `AAPL-1D-candle`

### Data
- Alpha Vantage time series responses already include `1. open`, `2. high`, `3. low`, `4. close` for every data point — we currently only use `4. close`
- New type: `CandlePoint { time: string; open: number; high: number; low: number; close: number }`
- `/api/chart` gains an optional `mode` query param (`line` | `candle`, default `line`)
- In `candle` mode, the route maps all four OHLC values instead of just close
- Response shape stays `{ points: ChartPoint[] | CandlePoint[] }`

### Component
- `PriceChart` gains a `mode: 'line' | 'candle'` prop
- In `candle` mode: uses `chart.addSeries(CandlestickSeries, opts)` instead of `LineSeries`
- Candle colors: up = `#10b981` (teal/green), down = `#ef4444` (red) — matches existing theme
- In `line` mode: behavior unchanged

### Scope boundary
- No mixed mode per time range — toggle applies globally to all ranges
- `isUp` / price change % continues to use first/last close price regardless of mode

---

## Feature 2: Watchlist — `/watchlist` Page

### Database
New table in Supabase:
```sql
CREATE TABLE watchlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('stock', 'forex')),
  added_at timestamptz DEFAULT now(),
  UNIQUE (clerk_user_id, symbol)
);
```

### API Routes
- `GET /api/watchlist` — returns `{ items: WatchlistItem[] }` for the authenticated user
- `POST /api/watchlist` — body `{ symbol, name, asset_type }` — adds to watchlist (upsert, no error if already exists)
- `DELETE /api/watchlist?symbol=AAPL` — removes symbol from watchlist

### Trade Page — Star Button
- After selecting an asset, a ★ button appears next to the asset name in the dark panel header
- Filled star (★) = on watchlist, hollow (☆) = not on watchlist
- Clicking toggles: calls POST or DELETE accordingly
- Trade page fetches current watchlist on mount to know initial star state

### `/watchlist` Page
- Protected server component (redirects to `/sign-in` if unauthenticated)
- Fetches all watchlist items from Supabase
- For each item, fetches live price via Alpha Vantage (same as `/api/quote`)
- Renders a table: Symbol | Name | Type | Live Price | Actions
- Actions: "Trade →" (links to `/trade` with the symbol pre-loaded — just a link, no pre-load needed) | "Remove" (client-side DELETE call + optimistic removal)
- Empty state: "Your watchlist is empty. Find an asset on the Trade page and click ★ to add it."

### Navbar
- Add "Watchlist" link between "Trade" and "History"

### Types
```typescript
interface WatchlistItem {
  id: string
  clerk_user_id: string
  symbol: string
  name: string
  asset_type: 'stock' | 'forex'
  added_at: string
  current_price?: number  // enriched client-side
}
```

---

## Feature 3: Bankruptcy Reset

### Trigger condition
- Reset option appears **only** when total portfolio value (cash balance + sum of all holding market values) falls below **$1,000**
- Dashboard computes this server-side (same data already fetched for P&L)

### UI
- Red banner at top of dashboard (above stat cards):
  > "⚠️ Your portfolio is nearly empty ($X remaining). Ready to start over?"
  > [Reset Portfolio] button
- Banner and button only render when condition is met

### API
- `POST /api/portfolio/reset` — authenticated, no body required
  1. Verifies total portfolio value < $1,000 (server-side guard)
  2. Deletes all rows in `holdings` for this user
  3. Sets `portfolios.cash_balance = 50000` for this user
  4. Returns `{ success: true, cash_balance: 50000 }`
- Trade history is **NOT** wiped — the record of the loss stays in `trades`

### Dashboard change
- After reset, page reloads (server component) showing fresh $50,000 balance, no holdings, no banner

---

## Out of Scope
- Limit orders (deferred — execution complexity not worth it for this assignment)
- Real-time price streaming (Alpha Vantage free tier limitation)
- Watchlist price alerts / notifications
- Watchlist sorting or filtering
