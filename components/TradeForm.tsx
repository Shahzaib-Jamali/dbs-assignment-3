'use client'

import { useState } from 'react'
import type { SearchResult, QuoteResult, Holding } from '@/lib/types'

interface TradeFormProps {
  selected: SearchResult
  quote: QuoteResult | null
  userHolding: Holding | null
  cashBalance: number
  onTrade: (action: 'BUY' | 'SELL', quantity: number) => Promise<void>
  dark?: boolean
}

export default function TradeForm({ selected, quote, userHolding, cashBalance, onTrade, dark }: TradeFormProps) {
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
    <div className={dark ? 'p-6' : 'rounded-2xl border border-slate-100 bg-white p-6 shadow-sm'}>
      {/* Asset info */}
      <div className="mb-5">
        <h3 className={`text-lg font-bold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{selected.symbol}</h3>
        <p className="text-sm text-slate-500">{selected.name}</p>
        {quote ? (
          <p className="text-3xl font-bold text-teal-500 mt-2">
            ${quote.price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          </p>
        ) : (
          <p className="text-slate-400 mt-2 animate-pulse">Fetching price…</p>
        )}
      </div>

      {/* Holding info */}
      {userHolding && userHolding.quantity > 0 && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${dark ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
          <span className={`font-medium ${dark ? 'text-teal-400' : 'text-teal-700'}`}>You hold:</span>{' '}
          <span className={`font-bold ${dark ? 'text-teal-300' : 'text-teal-900'}`}>{Number(userHolding.quantity).toFixed(4)} units</span>
        </div>
      )}

      {/* Quantity input */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-700'}`}>Quantity</label>
        <input
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="e.g. 10"
          className={`w-full rounded-xl border px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            dark
              ? 'bg-slate-800 border-slate-700 text-slate-100'
              : 'border-slate-200 text-slate-900'
          }`}
        />
      </div>

      {/* Estimated cost */}
      {qty > 0 && price > 0 && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <span className="text-slate-500">Estimated {qty > 0 ? 'cost' : 'value'}:</span>{' '}
          <span className={`font-bold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
            ${estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {error && (
        <p className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${dark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          disabled={!canBuy || loading}
          onClick={() => handleTrade('BUY')}
          className={`flex-1 rounded-xl py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
            dark
              ? 'bg-teal-500 hover:bg-teal-400 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {loading ? 'Processing…' : 'Buy'}
        </button>
        <button
          disabled={!canSell || loading}
          onClick={() => handleTrade('SELL')}
          className={`flex-1 rounded-xl py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
            dark
              ? 'bg-red-900/40 border border-red-500 text-red-400 hover:bg-red-900/60'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
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
