import type { ChartPoint, CandlePoint, TimeRange } from './types'

const AV_BASE = 'https://www.alphavantage.co/query'
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY!

export async function searchSymbols(query: string): Promise<{
  symbol: string; name: string; type: string
}[]> {
  const url = `${AV_BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const matches = data['bestMatches'] ?? []
  return matches.slice(0, 8).map((m: Record<string, string>) => ({
    symbol: m['1. symbol'],
    name: m['2. name'],
    type: m['3. type'],
  }))
}

export async function getStockQuote(symbol: string): Promise<number | null> {
  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()
  const quote = data['Global Quote']
  if (!quote || !quote['05. price']) return null
  return parseFloat(quote['05. price'])
}

export async function getForexQuote(from: string, to: string): Promise<number | null> {
  const url = `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()
  const rate = data['Realtime Currency Exchange Rate']
  if (!rate || !rate['5. Exchange Rate']) return null
  return parseFloat(rate['5. Exchange Rate'])
}

function stockSeriesParams(range: TimeRange): { fn: string; interval?: string } {
  switch (range) {
    case '1D': return { fn: 'TIME_SERIES_INTRADAY', interval: '5min' }
    case '1W': return { fn: 'TIME_SERIES_DAILY' }
    case '1M': return { fn: 'TIME_SERIES_DAILY' }
    case '3M': return { fn: 'TIME_SERIES_DAILY' }
    case '1Y': return { fn: 'TIME_SERIES_WEEKLY' }
    case 'MAX': return { fn: 'TIME_SERIES_WEEKLY' }
  }
}

function forexSeriesParams(range: TimeRange): { fn: string; interval?: string } {
  switch (range) {
    case '1D': return { fn: 'FX_INTRADAY', interval: '5min' }
    case '1W': return { fn: 'FX_DAILY' }
    case '1M': return { fn: 'FX_DAILY' }
    case '3M': return { fn: 'FX_DAILY' }
    case '1Y': return { fn: 'FX_WEEKLY' }
    case 'MAX': return { fn: 'FX_WEEKLY' }
  }
}

function pointLimit(range: TimeRange): number {
  switch (range) {
    case '1D':  return 78
    case '1W':  return 5
    case '1M':  return 22
    case '3M':  return 66
    case '1Y':  return 52
    case 'MAX': return 260
  }
}

export async function getStockSeries(symbol: string, range: TimeRange): Promise<ChartPoint[]> {
  const { fn, interval } = stockSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&symbol=${symbol}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []
  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: ChartPoint[] = Object.entries(series)
    .map(([time, values]) => ({ time, price: parseFloat(values['4. close']) }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return points.slice(-pointLimit(range))
}

export async function getForexSeries(from: string, to: string, range: TimeRange): Promise<ChartPoint[]> {
  const { fn, interval } = forexSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&from_symbol=${from}&to_symbol=${to}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []
  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: ChartPoint[] = Object.entries(series)
    .map(([time, values]) => ({ time, price: parseFloat(values['4. close']) }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return points.slice(-pointLimit(range))
}

export async function getStockCandleSeries(symbol: string, range: TimeRange): Promise<CandlePoint[]> {
  const { fn, interval } = stockSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&symbol=${symbol}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []
  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: CandlePoint[] = Object.entries(series)
    .map(([time, v]) => ({
      time,
      open:  parseFloat(v['1. open']),
      high:  parseFloat(v['2. high']),
      low:   parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return points.slice(-pointLimit(range))
}

export async function getForexCandleSeries(from: string, to: string, range: TimeRange): Promise<CandlePoint[]> {
  const { fn, interval } = forexSeriesParams(range)
  const intervalParam = interval ? `&interval=${interval}` : ''
  const outputSize = (range === '1D' || range === '1W') ? 'compact' : 'full'
  const url = `${AV_BASE}?function=${fn}&from_symbol=${from}&to_symbol=${to}${intervalParam}&outputsize=${outputSize}&apikey=${API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  const seriesKey = Object.keys(data).find(k => k.startsWith('Time Series'))
  if (!seriesKey) return []
  const series = data[seriesKey] as Record<string, Record<string, string>>
  const points: CandlePoint[] = Object.entries(series)
    .map(([time, v]) => ({
      time,
      open:  parseFloat(v['1. open']),
      high:  parseFloat(v['2. high']),
      low:   parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return points.slice(-pointLimit(range))
}
