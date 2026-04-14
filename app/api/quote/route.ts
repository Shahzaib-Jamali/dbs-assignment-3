import { NextRequest, NextResponse } from 'next/server'
import { getStockQuote, getForexQuote } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import type { QuoteResult } from '@/lib/types'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? ''
  const type = req.nextUrl.searchParams.get('type') as 'stock' | 'forex' | null

  if (!symbol || !type) {
    return NextResponse.json({ error: 'symbol and type required' }, { status: 400 })
  }

  let price: number | null = null

  if (type === 'stock') {
    price = await getStockQuote(symbol)
  } else {
    const pair = FOREX_PAIRS.find(p => p.symbol === symbol)
    if (!pair) return NextResponse.json({ error: 'Unknown forex pair' }, { status: 400 })
    price = await getForexQuote(pair.from, pair.to)
  }

  if (price === null) {
    return NextResponse.json({ error: 'Could not fetch price' }, { status: 502 })
  }

  const result: QuoteResult = { symbol, price, asset_type: type }
  return NextResponse.json(result)
}
