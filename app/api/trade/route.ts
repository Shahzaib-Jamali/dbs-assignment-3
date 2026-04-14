import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { symbol, asset_type, action, quantity } = body as {
    symbol: string
    asset_type: 'stock' | 'forex'
    action: 'BUY' | 'SELL'
    quantity: number
  }

  if (!symbol || !asset_type || !action || !quantity || quantity <= 0) {
    return NextResponse.json({ error: 'Invalid trade parameters' }, { status: 400 })
  }

  // Fetch live price
  let price: number | null = null
  if (asset_type === 'stock') {
    price = await getStockQuote(symbol)
  } else {
    const pair = FOREX_PAIRS.find(p => p.symbol === symbol)
    if (!pair) return NextResponse.json({ error: 'Unknown forex pair' }, { status: 400 })
    price = await getForexQuote(pair.from, pair.to)
  }

  if (price === null) return NextResponse.json({ error: 'Could not fetch price' }, { status: 502 })

  const total_value = parseFloat((price * quantity).toFixed(2))

  // Fetch current portfolio
  const { data: portfolio, error: pErr } = await supabase
    .from('portfolios')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  if (pErr || !portfolio) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

  if (action === 'BUY') {
    if (portfolio.cash_balance < total_value) {
      return NextResponse.json({ error: 'Insufficient cash balance' }, { status: 400 })
    }

    // Deduct cash
    const { error: balErr } = await supabase
      .from('portfolios')
      .update({ cash_balance: portfolio.cash_balance - total_value })
      .eq('clerk_user_id', userId)

    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 })

    // Upsert holding (weighted average on new buy)
    const { data: existing } = await supabase
      .from('holdings')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('symbol', symbol)
      .single()

    if (existing && existing.quantity > 0) {
      const newQty = existing.quantity + quantity
      const newAvg = ((existing.avg_cost * existing.quantity) + (price * quantity)) / newQty
      await supabase
        .from('holdings')
        .update({ quantity: newQty, avg_cost: newAvg })
        .eq('clerk_user_id', userId)
        .eq('symbol', symbol)
    } else {
      await supabase
        .from('holdings')
        .upsert({
          clerk_user_id: userId,
          symbol,
          name: symbol,
          asset_type,
          quantity,
          avg_cost: price,
        }, { onConflict: 'clerk_user_id,symbol' })
    }
  }

  if (action === 'SELL') {
    const { data: holding } = await supabase
      .from('holdings')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('symbol', symbol)
      .single()

    if (!holding || holding.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient holdings to sell' }, { status: 400 })
    }

    // Add cash back
    const { error: balErr } = await supabase
      .from('portfolios')
      .update({ cash_balance: portfolio.cash_balance + total_value })
      .eq('clerk_user_id', userId)

    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 })

    // Reduce holding
    const newQty = holding.quantity - quantity
    if (newQty === 0) {
      await supabase
        .from('holdings')
        .delete()
        .eq('clerk_user_id', userId)
        .eq('symbol', symbol)
    } else {
      await supabase
        .from('holdings')
        .update({ quantity: newQty })
        .eq('clerk_user_id', userId)
        .eq('symbol', symbol)
    }
  }

  // Log the trade
  const { error: tradeErr } = await supabase
    .from('trades')
    .insert({
      clerk_user_id: userId,
      symbol,
      name: symbol,
      asset_type,
      trade_type: action,
      quantity,
      price,
      total: total_value,
    })

  if (tradeErr) return NextResponse.json({ error: tradeErr.message }, { status: 500 })

  return NextResponse.json({ success: true, price, total_value })
}
