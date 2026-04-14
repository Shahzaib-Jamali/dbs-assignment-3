'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import SearchResults from '@/components/SearchResults'
import TradeForm from '@/components/TradeForm'
import TimeRangeTabs from '@/components/TimeRangeTabs'
import type { SearchResult, QuoteResult, Holding, Portfolio, ChartPoint, CandlePoint, TimeRange } from '@/lib/types'

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
  const [chartPoints, setChartPoints] = useState<ChartPoint[] | CandlePoint[]>([])
  const [chartRange, setChartRange] = useState<TimeRange>('1D')
  const [chartLoading, setChartLoading] = useState(false)
  const [chartMode, setChartMode] = useState<'line' | 'candle'>('line')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chartCache = useRef<Record<string, ChartPoint[] | CandlePoint[]>>({})

  const loadPortfolio = useCallback(async () => {
    const res = await fetch('/api/portfolio')
    const data = await res.json()
    setPortfolio(data.portfolio)
    setHoldings(data.holdings)
  }, [])

  useEffect(() => { loadPortfolio() }, [loadPortfolio])

  useEffect(() => {
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(data => {
        if (data.items) setWatchlist((data.items as { symbol: string }[]).map(i => i.symbol))
      })
      .catch(() => {})
  }, [])

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

  useEffect(() => {
    if (!selected) { setQuote(null); return }
    setQuote(null)
    fetch(`/api/quote?symbol=${encodeURIComponent(selected.symbol)}&type=${selected.asset_type}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setQuote(data) })
  }, [selected])

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

  const handleSelect = (result: SearchResult) => {
    setSelected(result)
    setQuery('')
    setResults([])
    setTradeSuccess(null)
    setChartRange('1D')
    setChartPoints([])
    setChartMode('line')
  }

  const handleTrade = async (action: 'BUY' | 'SELL', quantity: number) => {
    if (!selected) return
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: selected.symbol, asset_type: selected.asset_type, action, quantity }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Trade failed')
    setTradeSuccess(`${action} ${quantity} × ${selected.symbol} @ $${data.price.toFixed(4)} — Total: $${data.total_value.toFixed(2)}`)
    await loadPortfolio()
  }

  const userHolding = holdings.find(h => h.symbol === selected?.symbol) ?? null

  const isUp = chartPoints.length >= 2
    ? chartMode === 'candle'
      ? (chartPoints[chartPoints.length - 1] as CandlePoint).close >= (chartPoints[0] as CandlePoint).close
      : (chartPoints[chartPoints.length - 1] as ChartPoint).price >= (chartPoints[0] as ChartPoint).price
    : true

  const priceChangeColor = isUp ? 'text-teal-400' : 'text-red-400'

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Trade</h1>
        <p className="text-slate-500 mt-1">Search for a stock or forex pair to buy or sell</p>
      </div>

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

      {tradeSuccess && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm font-medium text-emerald-700">
          ✓ Trade executed: {tradeSuccess}
        </div>
      )}

      {selected ? (
        <div className="rounded-2xl bg-slate-900 p-6 shadow-2xl">
          <div className="flex gap-8">
            <div className="flex-[3] min-w-0">
              <div className="mb-4">
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
                <div className="text-slate-100 text-3xl font-bold">
                  {quote ? `$${quote.price.toFixed(2)}` : '—'}
                </div>
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
              </div>

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
                  <PriceChart points={chartPoints} isUp={isUp} mode={chartMode} />
                )}
              </div>

              <TimeRangeTabs
                active={chartRange}
                onChange={setChartRange}
                mode={chartMode}
                onModeChange={setChartMode}
              />
            </div>

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
