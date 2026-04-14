# Live Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Robinhood-inspired dark-mode teal line chart to the trade page that appears when a symbol is selected, showing historical price data with a time range selector and hover crosshair.

**Architecture:** A new `/api/chart` route fetches Alpha Vantage time series data and normalizes it to `{ time, price }` points. A `PriceChart` component wraps `lightweight-charts` with the dark teal theme and crosshair. The trade page re-layouts into a two-column dark panel (chart left, form right) when a symbol is selected.

**Tech Stack:** lightweight-charts (TradingView), Alpha Vantage TIME_SERIES_* APIs, React hooks for client-side caching, Tailwind CSS

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `app/api/chart/route.ts` | Fetch + normalize Alpha Vantage time series for stocks and forex |
| Create | `components/PriceChart.tsx` | lightweight-charts line chart with dark teal theme + crosshair |
| Create | `components/TimeRangeTabs.tsx` | 1D/1W/1M/3M/1Y/MAX tab selector UI |
| Modify | `lib/alphaVantage.ts` | Add `getStockSeries` and `getForexSeries` fetch helpers |
| Modify | `lib/types.ts` | Add `ChartPoint` and `TimeRange` types |
| Modify | `app/trade/page.tsx` | Add chart state, fetch chart data on symbol select, render dark two-column layout |

---

## Task 1: Install lightweight-charts

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
cd "/Users/shahzaibjamali/Desktop/DBS/Assignment 3"
npm install lightweight-charts
```

Expected: `added 1 package` with no errors.

- [ ] **Step 2: Verify it resolves**

```bash
node -e "require('./node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs'); console.log('ok')" 2>/dev/null || ls node_modules/lightweight-charts/dist/ | head -5
```

Expected: lists files in `dist/`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install lightweight-charts"
```

---

## Task 2: Add types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `ChartPoint` and `TimeRange` to `lib/types.ts`**

Append to the end of the file:

```typescript
export interface ChartPoint {
  time: string  // ISO date string e.g. "2024-04-08" or "2024-04-08 14:30:00"
  price: number
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'MAX'
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add ChartPoint and TimeRange types"
```

---

## Task 3: Add Alpha Vantage time series helpers

**Files:**
- Modify: `lib/alphaVantage.ts`

- [ ] **Step 1: Append `getStockSeries` and `getForexSeries` to `lib/alphaVantage.ts`**

```typescript
import type { ChartPoint, TimeRange } from './types'

// Maps TimeRange to Alpha Vantage function + interval
function stockSeriesParams(range: TimeRange): { fn: string; interval?: string } {
  switch (range) {
    case '1D': return { fn: 'TIME_SERIES_INTRADAY', interval: '5min' }
    case '1W': return { fn: 'TIME_SERIES_DAILY' }
    case '1M': return { fn: 'TIME_SERIES_DAILY' }
    case '3M': return { fn: 'TIME_SERIES_DAILY' }
    case '1Y': return { fn: 'TIME_SERIES_WEEKLY' }
    case 'MAX': return { fn: 'TIME_SERIES_WEEKLY' }
  }
}

function forexSeriesParams(range: TimeRange): { fn: string; interval?: string } {
  switch (range) {
    case '1D': return { fn: 'FX_INTRADAY', interval: '5min' }
    case '1W': return { fn: 'FX_DAILY' }
    case '1M': return { fn: 'FX_DAILY' }
    case '3M': return { fn: 'FX_DAILY' }
    case '1Y': return { fn: 'FX_WEEKLY' }
    case 'MAX': return { fn: 'FX_WEEKLY' }
  }
}

// How many data points to keep per range (trim from the end)
function pointLimit(range: TimeRange): number {
  switch (range) {
    case '1D':  return 78   // ~6.5 hours × 12 per hour (5min)
    case '1W':  return 5
    case '1M':  return 22
    case '3M':  return 66
    case '1Y':  return 52   // weeks
    case 'MAX': return 260  // 5 years of weeks
  }
}

export async function getStockSeries(symbol: string, range: TimeRange): Promise<ChartPoint[]> {
  const { fn, interval } = stockSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&symbol=${symbol}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()

  // Find the time series key (varies by function)
  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []

  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: ChartPoint[] = Object.entries(series)
    .map(([time, values]) => ({ time, price: parseFloat(values['4. close']) }))
    .sort((a, b) => a.time.localeCompare(b.time))

  const limit = pointLimit(range)
  return points.slice(-limit)
}

export async function getForexSeries(from: string, to: string, range: TimeRange): Promise<ChartPoint[]> {
  const { fn, interval } = forexSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&from_symbol=${from}&to_symbol=${to}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()

  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []

  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: ChartPoint[] = Object.entries(series)
    .map(([time, values]) => ({ time, price: parseFloat(values['4. close']) }))
    .sort((a, b) => a.time.localeCompare(b.time))

  const limit = pointLimit(range)
  return points.slice(-limit)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/alphaVantage.ts
git commit -m "feat: add getStockSeries and getForexSeries helpers"
```

---

## Task 4: `/api/chart` route

**Files:**
- Create: `app/api/chart/route.ts`

- [ ] **Step 1: Create `app/api/chart/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStockSeries, getForexSeries } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import type { TimeRange } from '@/lib/types'

const VALID_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX']

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const symbol = req.nextUrl.searchParams.get('symbol') ?? ''
  const type = req.nextUrl.searchParams.get('type') as 'stock' | 'forex' | null
  const range = (req.nextUrl.searchParams.get('range') ?? '1D') as TimeRange

  if (!symbol || !type) {
    return NextResponse.json({ error: 'symbol and type required' }, { status: 400 })
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'invalid range' }, { status: 400 })
  }

  try {
    if (type === 'stock') {
      const points = await getStockSeries(symbol, range)
      return NextResponse.json({ points })
    } else {
      const pair = FOREX_PAIRS.find(p => p.symbol === symbol)
      if (!pair) return NextResponse.json({ error: 'Unknown forex pair' }, { status: 400 })
      const points = await getForexSeries(pair.from, pair.to, range)
      return NextResponse.json({ points })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Smoke-test the route locally**

Start dev server (`npm run dev`) and visit:
`http://localhost:3000/api/chart?symbol=IBM&type=stock&range=1D`

Expected: JSON with `{ points: [{ time: "...", price: ... }, ...] }` — at least a few data points (IBM works with the demo key).

- [ ] **Step 3: Commit**

```bash
git add app/api/chart/route.ts
git commit -m "feat: add /api/chart route for time series data"
```

---

## Task 5: `TimeRangeTabs` component

**Files:**
- Create: `components/TimeRangeTabs.tsx`

- [ ] **Step 1: Create `components/TimeRangeTabs.tsx`**

```typescript
import type { TimeRange } from '@/lib/types'

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX']

interface Props {
  active: TimeRange
  onChange: (range: TimeRange) => void
}

export default function TimeRangeTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-5 border-t border-slate-700 pt-3 mt-2">
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
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/TimeRangeTabs.tsx
git commit -m "feat: add TimeRangeTabs component"
```

---

## Task 6: `PriceChart` component

**Files:**
- Create: `components/PriceChart.tsx`

- [ ] **Step 1: Create `components/PriceChart.tsx`**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle } from 'lightweight-charts'
import type { ChartPoint } from '@/lib/types'

interface Props {
  points: ChartPoint[]
  isUp: boolean
}

export default function PriceChart({ points, isUp }: Props) {
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
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 220,
    })

    const lineColor = isUp ? '#14b8a6' : '#f87171'

    const lineSeries = chart.addLineSeries({
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

    lineSeries.setData(
      points.map(p => ({ time: p.time as any, value: p.price }))
    )

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
  }, [points, isUp])

  return <div ref={containerRef} className="w-full" />
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PriceChart.tsx
git commit -m "feat: add PriceChart component with lightweight-charts"
```

---

## Task 7: Wire chart into the trade page

**Files:**
- Modify: `app/trade/page.tsx`

- [ ] **Step 1: Replace `app/trade/page.tsx` with the updated version**

```typescript
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import SearchResults from '@/components/SearchResults'
import TradeForm from '@/components/TradeForm'
import TimeRangeTabs from '@/components/TimeRangeTabs'
import type { SearchResult, QuoteResult, Holding, Portfolio, ChartPoint, TimeRange } from '@/lib/types'

// Dynamically import PriceChart to avoid SSR issues with lightweight-charts
const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false })

export default function TradePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [chartRange, setChartRange] = useState<TimeRange>('1D')
  const [chartLoading, setChartLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Cache: key = `${symbol}-${range}` → ChartPoint[]
  const chartCache = useRef<Record<string, ChartPoint[]>>({})

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

  // Fetch chart data when symbol or range changes
  useEffect(() => {
    if (!selected) { setChartPoints([]); return }
    const cacheKey = `${selected.symbol}-${chartRange}`
    if (chartCache.current[cacheKey]) {
      setChartPoints(chartCache.current[cacheKey])
      return
    }
    setChartLoading(true)
    fetch(`/api/chart?symbol=${encodeURIComponent(selected.symbol)}&type=${selected.asset_type}&range=${chartRange}`)
      .then(r => r.json())
      .then(data => {
        const points = data.points ?? []
        chartCache.current[cacheKey] = points
        setChartPoints(points)
      })
      .catch(() => setChartPoints([]))
      .finally(() => setChartLoading(false))
  }, [selected, chartRange])

  const handleSelect = (result: SearchResult) => {
    setSelected(result)
    setQuery('')
    setResults([])
    setTradeSuccess(null)
    setChartRange('1D')
    setChartPoints([])
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

  // Determine if price is up (first vs last point)
  const isUp = chartPoints.length >= 2
    ? chartPoints[chartPoints.length - 1].price >= chartPoints[0].price
    : true

  const priceChangeColor = isUp ? 'text-teal-400' : 'text-red-400'

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Trade</h1>
        <p className="text-slate-500 mt-1">Search for a stock or forex pair to buy or sell</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
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

      {selected ? (
        /* Dark two-column trading panel */
        <div className="rounded-2xl bg-slate-900 p-6 shadow-2xl">
          <div className="flex gap-8">

            {/* LEFT: Chart (60%) */}
            <div className="flex-[3] min-w-0">
              {/* Symbol header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-400 text-sm">{selected.name}</span>
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                    {selected.asset_type === 'forex' ? 'Forex' : 'Stock'}
                  </span>
                </div>
                <div className="text-slate-100 text-3xl font-bold">
                  {quote ? `$${quote.price.toFixed(2)}` : '—'}
                </div>
                {chartPoints.length >= 2 && (
                  <div className={`text-sm mt-1 ${priceChangeColor}`}>
                    {isUp ? '▲' : '▼'}{' '}
                    {Math.abs(
                      ((chartPoints[chartPoints.length - 1].price - chartPoints[0].price) / chartPoints[0].price) * 100
                    ).toFixed(2)}% this period
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="relative min-h-[220px]">
                {chartLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!chartLoading && chartPoints.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
                    Chart unavailable
                  </div>
                )}
                {!chartLoading && chartPoints.length > 0 && (
                  <PriceChart points={chartPoints} isUp={isUp} />
                )}
              </div>

              {/* Time range tabs */}
              <TimeRangeTabs active={chartRange} onChange={setChartRange} />
            </div>

            {/* RIGHT: Buy/Sell form (40%) */}
            <div className="flex-[2] min-w-0">
              <TradeForm
                selected={selected}
                quote={quote}
                userHolding={userHolding}
                cashBalance={portfolio?.cash_balance ?? 0}
                onTrade={handleTrade}
                dark
              />
            </div>
          </div>
        </div>
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

- [ ] **Step 2: Commit**

```bash
git add app/trade/page.tsx
git commit -m "feat: wire chart and two-column layout into trade page"
```

---

## Task 8: Update TradeForm for dark mode

**Files:**
- Modify: `components/TradeForm.tsx`

- [ ] **Step 1: Read the current `components/TradeForm.tsx`** to understand its structure before editing.

- [ ] **Step 2: Add `dark?: boolean` prop and apply dark styles conditionally**

At the top of the component's props interface, add:
```typescript
dark?: boolean
```

Wrap the outer container and all inner elements with conditional dark classes. The pattern is:

- Outer card: remove `bg-white border border-slate-200` → instead use `dark ? '' : 'bg-white border border-slate-200 rounded-2xl shadow-sm p-6'`
- Labels: `dark ? 'text-slate-400' : 'text-slate-600'`
- Inputs: `dark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'`
- BUY button: `dark ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'`
- SELL button: `dark ? 'bg-red-900/40 border border-red-500 text-red-400 hover:bg-red-900/60' : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'`
- Text/values: `dark ? 'text-slate-100' : 'text-slate-900'`
- Secondary text: `dark ? 'text-slate-500' : 'text-slate-500'`

Apply these to every element in TradeForm. Read the file first to get exact class names.

- [ ] **Step 3: Verify visually** — run `npm run dev`, select AAPL, confirm the form looks correct in dark mode.

- [ ] **Step 4: Commit**

```bash
git add components/TradeForm.tsx
git commit -m "feat: add dark mode support to TradeForm"
```

---

## Task 9: Deploy

- [ ] **Step 1: Run a production build to catch type errors**

```bash
cd "/Users/shahzaibjamali/Desktop/DBS/Assignment 3"
npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 2: Fix any build errors** before deploying.

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel deploy --prod 2>&1 | tail -20
```

Expected: `Production: https://paper-trade-*.vercel.app` with status READY.
