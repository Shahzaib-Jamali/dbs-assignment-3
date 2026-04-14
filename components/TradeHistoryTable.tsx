import type { Trade } from '@/lib/types'

interface TradeHistoryTableProps {
  trades: Trade[]
}

export default function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400">
        No trades yet. Make your first trade on the{' '}
        <a href="/trade" className="text-teal-600 hover:underline font-medium">Trade page</a>.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3 text-left">Date</th>
            <th className="px-6 py-3 text-left">Symbol</th>
            <th className="px-6 py-3 text-left">Type</th>
            <th className="px-6 py-3 text-left">Action</th>
            <th className="px-6 py-3 text-right">Qty</th>
            <th className="px-6 py-3 text-right">Price</th>
            <th className="px-6 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {trades.map(t => (
            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-slate-500">
                {new Date(t.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td className="px-6 py-4 font-semibold text-slate-900">{t.symbol}</td>
              <td className="px-6 py-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.asset_type === 'forex'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-teal-50 text-teal-700'
                }`}>
                  {t.asset_type}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                  t.action === 'BUY'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {t.action}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-slate-700">{Number(t.quantity).toFixed(4)}</td>
              <td className="px-6 py-4 text-right text-slate-700">${Number(t.price_at_trade).toFixed(4)}</td>
              <td className="px-6 py-4 text-right font-semibold text-slate-900">
                ${Number(t.total_value).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
