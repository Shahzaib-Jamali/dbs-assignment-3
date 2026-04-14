import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TradeHistoryTable from '@/components/TradeHistoryTable'
import type { Trade } from '@/lib/types'

export default async function HistoryPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-red-500">Failed to load trade history.</p>
      </main>
    )
  }

  const trades = (data ?? []) as Trade[]
  const totalVolume = trades.reduce((sum, t) => sum + Number(t.total_value), 0)

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trade History</h1>
          <p className="text-slate-500 mt-1">
            {trades.length} trade{trades.length !== 1 ? 's' : ''} ·{' '}
            ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} total volume
          </p>
        </div>
      </div>
      <TradeHistoryTable trades={trades} />
    </main>
  )
}
