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
