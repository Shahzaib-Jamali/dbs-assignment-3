export interface Portfolio {
  id: string
  clerk_user_id: string
  cash_balance: number
  created_at: string
}

export interface Holding {
  id: string
  clerk_user_id: string
  symbol: string
  name: string
  asset_type: 'stock' | 'forex'
  quantity: number
  avg_cost: number
  created_at: string
  // Enriched client-side:
  current_price?: number
  unrealized_pnl?: number
}

export interface Trade {
  id: string
  clerk_user_id: string
  symbol: string
  name: string
  asset_type: 'stock' | 'forex'
  trade_type: 'BUY' | 'SELL'
  quantity: number
  price: number
  total: number
  created_at: string
}

export interface SearchResult {
  symbol: string
  name: string
  asset_type: 'stock' | 'forex'
  from_currency?: string  // forex only
  to_currency?: string    // forex only
}

export interface QuoteResult {
  symbol: string
  price: number
  asset_type: 'stock' | 'forex'
}

export interface ChartPoint {
  time: string  // ISO date string e.g. "2024-04-08" or "2024-04-08 14:30:00"
  price: number
}

export interface CandlePoint {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export interface WatchlistItem {
  id: string
  clerk_user_id: string
  symbol: string
  name: string
  asset_type: 'stock' | 'forex'
  added_at: string
  current_price?: number
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'MAX'
