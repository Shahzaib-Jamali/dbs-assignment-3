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
