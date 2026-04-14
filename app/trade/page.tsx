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
