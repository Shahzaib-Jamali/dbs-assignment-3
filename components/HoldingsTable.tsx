import type { Holding } from '@/lib/types'

interface HoldingsTableProps {
  holdings: Holding[]
}

export default function HoldingsTable({ holdings }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400">
        No holdings yet. Head to the{' '}
        <a href="/trade" className="text-teal-600 hover:underline font-medium">Trade page</a>{' '}
        to buy your first asset.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3 text-left">Symbol</th>
            <th className="px-6 py-3 text-left">Type</th>
            <th className="px-6 py-3 text-right">Qty</th>
            <th className="px-6 py-3 text-right">Avg Buy</th>
            <th className="px-6 py-3 text-right">Current</th>
            <th className="px-6 py-3 text-right">Unrealized P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {holdings.map(h => {
            const pnl = h.current_price != null
              ? (h.current_price - h.avg_buy_price) * h.quantity
              : null
            const isPositive = pnl != null && pnl >= 0

            return (
              <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-900">{h.symbol}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    h.asset_type === 'forex'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-teal-50 text-teal-700'
                  }`}>
                    {h.asset_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-700">{Number(h.quantity).toFixed(4)}</td>
                <td className="px-6 py-4 text-right text-slate-700">${Number(h.avg_buy_price).toFixed(4)}</td>
                <td className="px-6 py-4 text-right text-slate-700">
                  {h.current_price != null ? `$${h.current_price.toFixed(4)}` : '—'}
                </td>
                <td className={`px-6 py-4 text-right font-semibold ${
                  pnl == null ? 'text-slate-400' :
                  isPositive ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {pnl != null ? `${isPositive ? '+' : ''}$${pnl.toFixed(2)}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
