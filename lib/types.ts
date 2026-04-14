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
  asset_type: 'stock' | 'forex'
  quantity: number
  avg_buy_price: number
  updated_at: string
  // Enriched client-side:
  current_price?: number
  unrealized_pnl?: number
}

export interface Trade {
  id: string
  clerk_user_id: string
  symbol: string
  asset_type: 'stock' | 'forex'
  action: 'BUY' | 'SELL'
  quantity: number
  price_at_trade: number
  total_value: number
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
