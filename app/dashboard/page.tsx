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
        ? (currentPrice - h.avg_cost) * h.quantity
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
