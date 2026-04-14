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
