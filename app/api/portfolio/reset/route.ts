import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: portfolio }, { data: holdings }] = await Promise.all([
    supabase.from('portfolios').select('cash_balance').eq('clerk_user_id', userId).single(),
    supabase.from('holdings').select('*').eq('clerk_user_id', userId).gt('quantity', 0),
  ])

  if (!portfolio) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

  const holdingValues = await Promise.all(
    (holdings ?? []).map(async h => {
      let price = 0
      try {
        if (h.asset_type === 'stock') {
          price = (await getStockQuote(h.symbol)) ?? 0
        } else {
          const pair = FOREX_PAIRS.find(p => p.symbol === h.symbol)
          if (pair) price = (await getForexQuote(pair.from, pair.to)) ?? 0
        }
      } catch { /* ignore */ }
      return price * h.quantity
    })
  )

  const totalValue = portfolio.cash_balance + holdingValues.reduce((s, v) => s + v, 0)

  if (totalValue >= 1000) {
    return NextResponse.json(
      { error: 'Portfolio value must be below $1,000 to reset' },
      { status: 403 }
    )
  }

  await supabase.from('holdings').delete().eq('clerk_user_id', userId)
  await supabase.from('portfolios').update({ cash_balance: 50000 }).eq('clerk_user_id', userId)

  return NextResponse.json({ success: true, cash_balance: 50000 })
}
