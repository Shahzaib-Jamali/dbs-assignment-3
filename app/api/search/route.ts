import { NextRequest, NextResponse } from 'next/server'
import { searchSymbols } from '@/lib/alphaVantage'
import { FOREX_PAIRS } from '@/lib/forex'
import type { SearchResult } from '@/lib/types'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? ''
  if (!q || q.length < 1) return NextResponse.json([])

  // Match forex pairs
  const forexMatches: SearchResult[] = FOREX_PAIRS
    .filter(p =>
      p.symbol.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.from.toLowerCase().includes(q) ||
      p.to.toLowerCase().includes(q)
    )
    .map(p => ({
      symbol: p.symbol,
      name: p.name,
      asset_type: 'forex',
      from_currency: p.from,
      to_currency: p.to,
    }))

  // Search stocks via Alpha Vantage
  let stockMatches: SearchResult[] = []
  try {
    const avResults = await searchSymbols(q)
    stockMatches = avResults
      .filter(r => r.type === 'Equity')
      .map(r => ({
        symbol: r.symbol,
        name: r.name,
        asset_type: 'stock',
      }))
  } catch {
    // AV search failed — return forex only
  }

  const combined: SearchResult[] = [...forexMatches, ...stockMatches]
  return NextResponse.json(combined)
}
