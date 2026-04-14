import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStockSeries, getForexSeries } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import type { TimeRange } from '@/lib/types'

const VALID_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX']

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const symbol = req.nextUrl.searchParams.get('symbol') ?? ''
  const type = req.nextUrl.searchParams.get('type') as 'stock' | 'forex' | null
  const range = (req.nextUrl.searchParams.get('range') ?? '1D') as TimeRange

  if (!symbol || !type) {
    return NextResponse.json({ error: 'symbol and type required' }, { status: 400 })
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'invalid range' }, { status: 400 })
  }

  try {
    if (type === 'stock') {
      const points = await getStockSeries(symbol, range)
      return NextResponse.json({ points })
    } else {
      const pair = FOREX_PAIRS.find(p => p.symbol === symbol)
      if (!pair) return NextResponse.json({ error: 'Unknown forex pair' }, { status: 400 })
      const points = await getForexSeries(pair.from, pair.to, range)
      return NextResponse.json({ points })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 502 })
  }
}
