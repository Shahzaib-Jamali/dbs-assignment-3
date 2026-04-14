# Webull Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add candlestick chart toggle, a /watchlist page with star-button on the trade page, and a bankruptcy reset banner to the paper trading platform.

**Architecture:** Three independent features bolt onto the existing Next.js 16 / Supabase / Alpha Vantage stack with minimal cross-feature coupling. Feature 1 (chart toggle) modifies only chart-related files. Feature 2 (watchlist) adds a new Supabase table, three API routes, a new page, and a star button on the trade page. Feature 3 (reset) adds one API route and a conditional banner on the dashboard.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase (service role), lightweight-charts v5 (CandlestickSeries), Clerk v7 (auth())

---

## File Map

### Feature 1 — Chart Toggle

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `lib/types.ts` | Add `CandlePoint` type |
| Modify | `lib/alphaVantage.ts` | Add `getStockCandleSeries` + `getForexCandleSeries` |
| Modify | `app/api/chart/route.ts` | Accept `mode` query param, return candle points |
| Modify | `components/PriceChart.tsx` | Accept `mode` prop, render `CandlestickSeries` when candle |
| Modify | `components/TimeRangeTabs.tsx` | Add toggle buttons on right side |
| Modify | `app/trade/page.tsx` | Add `chartMode` state, update cache key, pass mode |

### Feature 2 — Watchlist

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `lib/types.ts` | Add `WatchlistItem` type |
| Create | `app/api/watchlist/route.ts` | GET / POST / DELETE watchlist items |
| Modify | `app/trade/page.tsx` | ★ button in panel header, fetch watchlist on mount |
| Create | `app/watchlist/page.tsx` | Server component — table with live prices |
| Modify | `components/Navbar.tsx` | Add Watchlist nav link |

### Feature 3 — Bankruptcy Reset

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `app/api/portfolio/reset/route.ts` | POST — verify < $1,000, wipe holdings, reset cash |
| Modify | `app/dashboard/page.tsx` | Show red banner + reset button when totalValue < $1,000 |

---

## Task 1: Add CandlePoint type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `CandlePoint` interface after `ChartPoint`**

Open `lib/types.ts`. After the `ChartPoint` interface, add:

```typescript
export interface CandlePoint {
  time: string   // same format as ChartPoint.time
  open: number
  high: number
  low: number
  close: number
}
```

The file should now end with:

```typescript
export interface ChartPoint {
  time: string
  price: number
}

export interface CandlePoint {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'MAX'
```

- [ ] **Step 2: Verify build still passes**

```bash
cd "/Users/shahzaibjamali/Desktop/DBS/Assignment 3"
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors. Ignore any Alpha Vantage API errors — those are runtime.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add CandlePoint type"
```

---

## Task 2: Add candle series helpers to alphaVantage.ts

**Files:**
- Modify: `lib/alphaVantage.ts`

- [ ] **Step 1: Add `getStockCandleSeries` at the bottom of `lib/alphaVantage.ts`**

```typescript
export async function getStockCandleSeries(symbol: string, range: TimeRange): Promise<CandlePoint[]> {
  const { fn, interval } = stockSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&symbol=${symbol}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []
  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: CandlePoint[] = Object.entries(series)
    .map(([time, v]) => ({
      time,
      open:  parseFloat(v['1. open']),
      high:  parseFloat(v['2. high']),
      low:   parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return points.slice(-pointLimit(range))
}
```

- [ ] **Step 2: Add `getForexCandleSeries` immediately after**

```typescript
export async function getForexCandleSeries(from: string, to: string, range: TimeRange): Promise<CandlePoint[]> {
  const { fn, interval } = forexSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&from_symbol=${from}&to_symbol=${to}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []
  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: CandlePoint[] = Object.entries(series)
    .map(([time, v]) => ({
      time,
      open:  parseFloat(v['1. open']),
      high:  parseFloat(v['2. high']),
      low:   parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return points.slice(-pointLimit(range))
}
```

- [ ] **Step 3: Add `CandlePoint` to the import at the top of the file**

The current first line is:
```typescript
import type { ChartPoint, TimeRange } from './types'
```

Change it to:
```typescript
import type { ChartPoint, CandlePoint, TimeRange } from './types'
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add lib/alphaVantage.ts
git commit -m "feat: add candle series helpers for stocks and forex"
```

---

## Task 3: Update /api/chart to support candle mode

**Files:**
- Modify: `app/api/chart/route.ts`

- [ ] **Step 1: Replace the full file contents**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getStockSeries, getForexSeries,
  getStockCandleSeries, getForexCandleSeries,
} from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import type { TimeRange } from '@/lib/types'

const VALID_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX']

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const symbol = req.nextUrl.searchParams.get('symbol') ?? ''
  const type   = req.nextUrl.searchParams.get('type') as 'stock' | 'forex' | null
  const range  = (req.nextUrl.searchParams.get('range') ?? '1D') as TimeRange
  const mode   = req.nextUrl.searchParams.get('mode') ?? 'line'   // 'line' | 'candle'

  if (!symbol || !type) {
    return NextResponse.json({ error: 'symbol and type required' }, { status: 400 })
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'invalid range' }, { status: 400 })
  }

  try {
    if (type === 'stock') {
      const points = mode === 'candle'
        ? await getStockCandleSeries(symbol, range)
        : await getStockSeries(symbol, range)
      return NextResponse.json({ points })
    } else {
      const pair = FOREX_PAIRS.find(p => p.symbol === symbol)
      if (!pair) return NextResponse.json({ error: 'Unknown forex pair' }, { status: 400 })
      const points = mode === 'candle'
        ? await getForexCandleSeries(pair.from, pair.to, range)
        : await getForexSeries(pair.from, pair.to, range)
      return NextResponse.json({ points })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chart/route.ts
git commit -m "feat: add mode param to /api/chart for candlestick data"
```

---

## Task 4: Update PriceChart to render candlesticks

**Files:**
- Modify: `components/PriceChart.tsx`

- [ ] **Step 1: Replace the full file contents**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle, LineSeries, CandlestickSeries } from 'lightweight-charts'
import type { ChartPoint, CandlePoint } from '@/lib/types'

interface Props {
  points: ChartPoint[] | CandlePoint[]
  isUp: boolean
  mode: 'line' | 'candle'
}

export default function PriceChart({ points, isUp, mode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#475569',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        vertLine: {
          color: '#14b8a6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0d9488',
        },
        horzLine: {
          color: '#14b8a6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0d9488',
        },
      },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 220,
    })

    if (mode === 'candle') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor:       '#10b981',
        downColor:     '#ef4444',
        borderUpColor:   '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor:   '#10b981',
        wickDownColor: '#ef4444',
      })
      series.setData(
        (points as CandlePoint[]).map(p => ({
          time:  p.time as any,
          open:  p.open,
          high:  p.high,
          low:   p.low,
          close: p.close,
        }))
      )
    } else {
      const lineColor = isUp ? '#14b8a6' : '#f87171'
      const series = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#0f172a',
        crosshairMarkerBackgroundColor: lineColor,
        lastValueVisible: false,
        priceLineVisible: true,
        priceLineColor: '#334155',
        priceLineStyle: LineStyle.Dashed,
        priceLineWidth: 1,
      })
      series.setData(
        (points as ChartPoint[]).map(p => ({ time: p.time as any, value: p.price }))
      )
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [points, isUp, mode])

  return <div ref={containerRef} className="w-full" />
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/PriceChart.tsx
git commit -m "feat: add candlestick mode to PriceChart"
```

---

## Task 5: Add toggle to TimeRangeTabs + wire into TradePage

**Files:**
- Modify: `components/TimeRangeTabs.tsx`
- Modify: `app/trade/page.tsx`

- [ ] **Step 1: Replace `components/TimeRangeTabs.tsx`**

```typescript
import type { TimeRange } from '@/lib/types'

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX']

interface Props {
  active: TimeRange
  onChange: (range: TimeRange) => void
  mode: 'line' | 'candle'
  onModeChange: (mode: 'line' | 'candle') => void
}

export default function TimeRangeTabs({ active, onChange, mode, onModeChange }: Props) {
  return (
    <div className="flex items-center gap-5 border-t border-slate-700 pt-3 mt-2">
      {/* Range tabs */}
      {RANGES.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`text-xs font-semibold pb-1 transition-colors ${
            r === active
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {r}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Chart type toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => onModeChange('line')}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            mode === 'line'
              ? 'bg-teal-600 text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Line
        </button>
        <button
          onClick={() => onModeChange('candle')}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            mode === 'candle'
              ? 'bg-teal-600 text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Candle
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `app/trade/page.tsx`**

Add `chartMode` state and update the chart fetch to include mode in the cache key. Apply these changes to `app/trade/page.tsx`:

**2a.** Change the import line at the top (add `CandlePoint`):
```typescript
import type { SearchResult, QuoteResult, Holding, Portfolio, ChartPoint, CandlePoint, TimeRange } from '@/lib/types'
```

**2b.** Add `chartMode` state after the `chartLoading` state declaration (around line 24):
```typescript
const [chartMode, setChartMode] = useState<'line' | 'candle'>('line')
```

**2c.** Change the chart cache key in the `useEffect` (currently `${selected.symbol}-${chartRange}`) and the fetch URL:
```typescript
useEffect(() => {
  if (!selected) { setChartPoints([]); return }
  const cacheKey = `${selected.symbol}-${chartRange}-${chartMode}`
  if (chartCache.current[cacheKey]) {
    setChartPoints(chartCache.current[cacheKey])
    return
  }
  setChartLoading(true)
  fetch(`/api/chart?symbol=${encodeURIComponent(selected.symbol)}&type=${selected.asset_type}&range=${chartRange}&mode=${chartMode}`)
    .then(r => r.json())
    .then(data => {
      const points = data.points ?? []
      chartCache.current[cacheKey] = points
      setChartPoints(points)
    })
    .catch(() => setChartPoints([]))
    .finally(() => setChartLoading(false))
}, [selected, chartRange, chartMode])
```

**2d.** Change the `chartPoints` state type to handle both:
```typescript
const [chartPoints, setChartPoints] = useState<ChartPoint[] | CandlePoint[]>([])
```

**2e.** Update the `isUp` computation — candle points use `.close`, line points use `.price`. Replace the existing `isUp` lines with:
```typescript
const isUp = chartPoints.length >= 2
  ? chartMode === 'candle'
    ? (chartPoints[chartPoints.length - 1] as CandlePoint).close >= (chartPoints[0] as CandlePoint).close
    : (chartPoints[chartPoints.length - 1] as ChartPoint).price >= (chartPoints[0] as ChartPoint).price
  : true
```

**2f.** Update the price change percentage display — it currently uses `.price`. Replace that block (around line 165):
```typescript
{chartPoints.length >= 2 && (
  <div className={`text-sm mt-1 ${priceChangeColor}`}>
    {isUp ? '▲' : '▼'}{' '}
    {(() => {
      if (chartMode === 'candle') {
        const first = (chartPoints[0] as CandlePoint).close
        const last  = (chartPoints[chartPoints.length - 1] as CandlePoint).close
        return Math.abs(((last - first) / first) * 100).toFixed(2)
      }
      const first = (chartPoints[0] as ChartPoint).price
      const last  = (chartPoints[chartPoints.length - 1] as ChartPoint).price
      return Math.abs(((last - first) / first) * 100).toFixed(2)
    })()}% this period
  </div>
)}
```

**2g.** Pass `mode` to `PriceChart` and pass `mode`/`onModeChange` to `TimeRangeTabs`:
```typescript
{!chartLoading && chartPoints.length > 0 && (
  <PriceChart points={chartPoints} isUp={isUp} mode={chartMode} />
)}
```

```typescript
<TimeRangeTabs
  active={chartRange}
  onChange={setChartRange}
  mode={chartMode}
  onModeChange={setChartMode}
/>
```

**2h.** Reset `chartMode` to `'line'` in `handleSelect` (after the other resets):
```typescript
const handleSelect = (result: SearchResult) => {
  setSelected(result)
  setQuery('')
  setResults([])
  setTradeSuccess(null)
  setChartRange('1D')
  setChartPoints([])
  setChartMode('line')
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -30
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/TimeRangeTabs.tsx app/trade/page.tsx
git commit -m "feat: add line/candle chart toggle to trade page"
```

---

## Task 6: Create watchlist table in Supabase

**Files:** (Supabase dashboard / MCP)

- [ ] **Step 1: Run the following SQL in Supabase**

Use the Supabase MCP tool `mcp__supabase__execute_sql` or go to the Supabase dashboard → SQL editor and run:

```sql
CREATE TABLE IF NOT EXISTS watchlist (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id  text NOT NULL,
  symbol         text NOT NULL,
  name           text NOT NULL,
  asset_type     text NOT NULL CHECK (asset_type IN ('stock', 'forex')),
  added_at       timestamptz DEFAULT now(),
  UNIQUE (clerk_user_id, symbol)
);
```

- [ ] **Step 2: Verify the table exists**

Run in Supabase SQL editor:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'watchlist' ORDER BY ordinal_position;
```

Expected: 6 rows — id, clerk_user_id, symbol, name, asset_type, added_at.

---

## Task 7: Add WatchlistItem type + /api/watchlist route

**Files:**
- Modify: `lib/types.ts`
- Create: `app/api/watchlist/route.ts`

- [ ] **Step 1: Add `WatchlistItem` to `lib/types.ts`**

Add before the closing of the file:

```typescript
export interface WatchlistItem {
  id: string
  clerk_user_id: string
  symbol: string
  name: string
  asset_type: 'stock' | 'forex'
  added_at: string
  current_price?: number
}
```

- [ ] **Step 2: Create `app/api/watchlist/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { symbol, name, asset_type } = await req.json()
  if (!symbol || !name || !asset_type) {
    return NextResponse.json({ error: 'symbol, name, asset_type required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('watchlist')
    .upsert({ clerk_user_id: userId, symbol, name, asset_type }, { onConflict: 'clerk_user_id,symbol' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const symbol = req.nextUrl.searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('clerk_user_id', userId)
    .eq('symbol', symbol)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts app/api/watchlist/route.ts
git commit -m "feat: add WatchlistItem type and /api/watchlist GET/POST/DELETE"
```

---

## Task 8: Add ★ button to trade page

**Files:**
- Modify: `app/trade/page.tsx`

The star button appears in the dark panel header (next to the asset name) when an asset is selected. A filled star means the asset is on the watchlist; hollow means it is not.

- [ ] **Step 1: Add watchlist state and fetch to `app/trade/page.tsx`**

Add these state variables after the existing state declarations:

```typescript
const [watchlist, setWatchlist] = useState<string[]>([])  // array of symbols
```

Add this effect after the `loadPortfolio` effect:

```typescript
useEffect(() => {
  fetch('/api/watchlist')
    .then(r => r.json())
    .then(data => {
      if (data.items) {
        setWatchlist((data.items as { symbol: string }[]).map(i => i.symbol))
      }
    })
    .catch(() => {})
}, [])
```

- [ ] **Step 2: Add the toggle handler**

Add this function before `handleSelect`:

```typescript
const handleWatchlistToggle = async () => {
  if (!selected) return
  const isWatched = watchlist.includes(selected.symbol)
  if (isWatched) {
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(selected.symbol)}`, { method: 'DELETE' })
    setWatchlist(prev => prev.filter(s => s !== selected.symbol))
  } else {
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: selected.symbol, name: selected.name, asset_type: selected.asset_type }),
    })
    setWatchlist(prev => [...prev, selected.symbol])
  }
}
```

- [ ] **Step 3: Add the star button in the panel header**

In the JSX, find the asset name area (around line 155 in the original file). It currently looks like:

```tsx
<div className="flex items-center gap-2 mb-1">
  <span className="text-slate-400 text-sm">{selected.name}</span>
  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
    {selected.asset_type === 'forex' ? 'Forex' : 'Stock'}
  </span>
</div>
```

Replace it with:

```tsx
<div className="flex items-center gap-2 mb-1">
  <span className="text-slate-400 text-sm">{selected.name}</span>
  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
    {selected.asset_type === 'forex' ? 'Forex' : 'Stock'}
  </span>
  <button
    onClick={handleWatchlistToggle}
    className="text-lg leading-none transition-colors hover:text-yellow-400"
    title={watchlist.includes(selected.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
  >
    {watchlist.includes(selected.symbol) ? '★' : '☆'}
  </button>
</div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add app/trade/page.tsx
git commit -m "feat: add star button to trade page for watchlist toggle"
```

---

## Task 9: Create /watchlist page

**Files:**
- Create: `app/watchlist/page.tsx`

This is a protected server component. It fetches watchlist items from Supabase and enriches each with live price from Alpha Vantage.

- [ ] **Step 1: Create `app/watchlist/page.tsx`**

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import Link from 'next/link'
import type { WatchlistItem } from '@/lib/types'

export default async function WatchlistPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data } = await supabase
    .from('watchlist')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('added_at', { ascending: false })

  const items: WatchlistItem[] = data ?? []

  // Enrich with live prices
  const enriched: WatchlistItem[] = await Promise.all(
    items.map(async item => {
      let price: number | null = null
      try {
        if (item.asset_type === 'stock') {
          price = await getStockQuote(item.symbol)
        } else {
          const pair = FOREX_PAIRS.find(p => p.symbol === item.symbol)
          if (pair) price = await getForexQuote(pair.from, pair.to)
        }
      } catch { /* ignore */ }
      return { ...item, current_price: price ?? undefined }
    })
  )

  const formatUSD = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Watchlist</h1>
        <p className="text-slate-500 mt-1">Assets you are watching</p>
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
          <p className="text-lg font-medium">Your watchlist is empty.</p>
          <p className="text-sm mt-2">
            Find an asset on the{' '}
            <Link href="/trade" className="text-teal-600 hover:underline">Trade page</Link>
            {' '}and click ★ to add it.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Symbol</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Live Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.symbol}</td>
                  <td className="px-6 py-4 text-slate-600">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs rounded-full bg-slate-100 text-slate-500 px-2 py-0.5">
                      {item.asset_type === 'forex' ? 'Forex' : 'Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {item.current_price != null
                      ? formatUSD(item.current_price)
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href="/trade"
                      className="text-teal-600 hover:text-teal-700 font-medium mr-4"
                    >
                      Trade →
                    </Link>
                    <WatchlistRemoveButton symbol={item.symbol} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

// Client component for the remove button (needs onClick)
import WatchlistRemoveButton from '@/components/WatchlistRemoveButton'
```

Wait — mixing server imports with a client component import at the bottom is messy. Rewrite to put the import at the top:

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import Link from 'next/link'
import WatchlistRemoveButton from '@/components/WatchlistRemoveButton'
import type { WatchlistItem } from '@/lib/types'

export default async function WatchlistPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data } = await supabase
    .from('watchlist')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('added_at', { ascending: false })

  const items: WatchlistItem[] = data ?? []

  const enriched: WatchlistItem[] = await Promise.all(
    items.map(async item => {
      let price: number | null = null
      try {
        if (item.asset_type === 'stock') {
          price = await getStockQuote(item.symbol)
        } else {
          const pair = FOREX_PAIRS.find(p => p.symbol === item.symbol)
          if (pair) price = await getForexQuote(pair.from, pair.to)
        }
      } catch { /* ignore */ }
      return { ...item, current_price: price ?? undefined }
    })
  )

  const formatUSD = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Watchlist</h1>
        <p className="text-slate-500 mt-1">Assets you are watching</p>
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
          <p className="text-lg font-medium">Your watchlist is empty.</p>
          <p className="text-sm mt-2">
            Find an asset on the{' '}
            <Link href="/trade" className="text-teal-600 hover:underline">Trade page</Link>
            {' '}and click ★ to add it.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Symbol</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Live Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.symbol}</td>
                  <td className="px-6 py-4 text-slate-600">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs rounded-full bg-slate-100 text-slate-500 px-2 py-0.5">
                      {item.asset_type === 'forex' ? 'Forex' : 'Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {item.current_price != null
                      ? formatUSD(item.current_price)
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href="/trade"
                      className="text-teal-600 hover:text-teal-700 font-medium mr-4"
                    >
                      Trade →
                    </Link>
                    <WatchlistRemoveButton symbol={item.symbol} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Create `components/WatchlistRemoveButton.tsx`**

This client component handles the optimistic remove:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function WatchlistRemoveButton({ symbol }: { symbol: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    setLoading(true)
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
    >
      {loading ? '…' : 'Remove'}
    </button>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/watchlist/page.tsx components/WatchlistRemoveButton.tsx
git commit -m "feat: add /watchlist server page with live prices and remove button"
```

---

## Task 10: Add Watchlist link to Navbar

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Add Watchlist to the `navLinks` array**

Find this array in `components/Navbar.tsx`:

```typescript
const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trade',     label: 'Trade' },
  { href: '/history',  label: 'History' },
]
```

Replace it with:

```typescript
const navLinks = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/trade',      label: 'Trade' },
  { href: '/watchlist',  label: 'Watchlist' },
  { href: '/history',    label: 'History' },
]
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/Navbar.tsx
git commit -m "feat: add Watchlist link to navbar"
```

---

## Task 11: Create /api/portfolio/reset route

**Files:**
- Create: `app/api/portfolio/reset/route.ts`

- [ ] **Step 1: Create `app/api/portfolio/reset/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Compute total portfolio value server-side to guard against client spoofing
  const [{ data: portfolio }, { data: holdings }] = await Promise.all([
    supabase.from('portfolios').select('cash_balance').eq('clerk_user_id', userId).single(),
    supabase.from('holdings').select('*').eq('clerk_user_id', userId).gt('quantity', 0),
  ])

  if (!portfolio) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

  const holdingValues = await Promise.all(
    (holdings ?? []).map(async h => {
      let price = 0
      try {
        if (h.asset_type === 'stock') {
          price = (await getStockQuote(h.symbol)) ?? 0
        } else {
          const pair = FOREX_PAIRS.find(p => p.symbol === h.symbol)
          if (pair) price = (await getForexQuote(pair.from, pair.to)) ?? 0
        }
      } catch { /* ignore */ }
      return price * h.quantity
    })
  )

  const totalValue = portfolio.cash_balance + holdingValues.reduce((s, v) => s + v, 0)

  if (totalValue >= 1000) {
    return NextResponse.json(
      { error: 'Portfolio value must be below $1,000 to reset' },
      { status: 403 }
    )
  }

  // Wipe holdings and reset cash
  await supabase.from('holdings').delete().eq('clerk_user_id', userId)
  await supabase
    .from('portfolios')
    .update({ cash_balance: 50000 })
    .eq('clerk_user_id', userId)

  return NextResponse.json({ success: true, cash_balance: 50000 })
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/portfolio/reset/route.ts
git commit -m "feat: add /api/portfolio/reset route"
```

---

## Task 12: Add bankruptcy banner to dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Create `components/ResetPortfolioButton.tsx`** (client component for the reset action)

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ResetPortfolioButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    setLoading(true)
    const res = await fetch('/api/portfolio/reset', { method: 'POST' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? 'Reset failed')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Resetting…' : 'Reset Portfolio'}
    </button>
  )
}
```

- [ ] **Step 2: Add the import to `app/dashboard/page.tsx`**

Add this import at the top of `app/dashboard/page.tsx` (after existing imports):

```typescript
import ResetPortfolioButton from '@/components/ResetPortfolioButton'
```

- [ ] **Step 3: Add the bankruptcy banner to the dashboard JSX**

In `app/dashboard/page.tsx`, find the `return (` block. The first thing inside `<main>` is the `{/* Header */}` section. Add the banner above it (after the opening `<main>` tag):

```tsx
{/* Bankruptcy banner */}
{totalValue < 1000 && (
  <div className="mb-6 flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-5 py-4">
    <p className="text-sm font-medium text-red-700">
      ⚠️ Your portfolio is nearly empty ({formatUSD(totalValue)} remaining). Ready to start over?
    </p>
    <ResetPortfolioButton />
  </div>
)}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add components/ResetPortfolioButton.tsx app/dashboard/page.tsx
git commit -m "feat: add bankruptcy reset banner to dashboard"
```

---

## Task 13: Deploy to production

- [ ] **Step 1: Push all commits to remote**

```bash
git push origin master
```

- [ ] **Step 2: Deploy to Vercel**

```bash
vercel --prod
```

Or use the `vercel:deploy` skill with the `prod` argument.

- [ ] **Step 3: Smoke test on production**

1. Navigate to the live site
2. Sign in
3. Go to Trade → search AAPL → verify Line/Candle toggle appears in the time range bar
4. Click Candle → verify candlestick chart renders
5. Click ★ on a selected asset → verify star fills
6. Navigate to /watchlist → verify the symbol appears with a live price
7. Click Remove → verify the item disappears
8. Go to Dashboard → (the bankruptcy banner only shows when portfolio value < $1,000; you won't see it unless you've lost nearly everything — this is expected)

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| `TimeRangeTabs` gets toggle on right side | Task 5 |
| Active mode highlighted in teal | Task 5 (bg-teal-600 on active) |
| Toggle state lives in TradePage, passed as `mode` prop | Task 5 |
| Chart cache key includes mode | Task 5 (cacheKey uses chartMode) |
| New `CandlePoint` type | Task 1 |
| `/api/chart` gains optional `mode` query param | Task 3 |
| `PriceChart` gains `mode` prop, uses `CandlestickSeries` | Task 4 |
| Candle colors: up=#10b981, down=#ef4444 | Task 4 |
| `watchlist` table in Supabase | Task 6 |
| `GET /api/watchlist` | Task 7 |
| `POST /api/watchlist` (upsert) | Task 7 |
| `DELETE /api/watchlist?symbol=` | Task 7 |
| ★ button on trade page | Task 8 |
| Filled star = on watchlist | Task 8 |
| Trade page fetches watchlist on mount | Task 8 |
| `/watchlist` protected server component | Task 9 |
| Table: Symbol, Name, Type, Live Price, Actions | Task 9 |
| Empty state message | Task 9 |
| "Trade →" link in actions | Task 9 |
| "Remove" button with optimistic removal | Task 9 |
| Navbar Watchlist link between Trade and History | Task 10 |
| `POST /api/portfolio/reset` route | Task 11 |
| Server-side guard: value < $1,000 | Task 11 |
| Deletes all holdings, resets cash to $50,000 | Task 11 |
| Trade history NOT wiped | Task 11 (only deletes from holdings) |
| Red banner on dashboard when totalValue < $1,000 | Task 12 |
| Banner shows remaining value | Task 12 |
| Banner only when condition met | Task 12 (conditional render) |
| After reset, page reloads showing fresh $50,000 | Task 12 (router.refresh()) |

All spec requirements are covered.

### Placeholder scan

No TBD, TODO, or incomplete steps found.

### Type consistency

- `CandlePoint` defined in Task 1, imported in Tasks 2, 4, 5
- `WatchlistItem` defined in Task 7, used in Tasks 8, 9
- `mode: 'line' | 'candle'` prop: added to `TimeRangeTabs` in Task 5, `PriceChart` in Task 4, state in Task 5
- `getStockCandleSeries` / `getForexCandleSeries` defined in Task 2, imported in Task 3
- `ResetPortfolioButton` created in Task 12 step 1, imported in Task 12 step 2
- `WatchlistRemoveButton` created in Task 9 step 2, imported in Task 9 step 1
