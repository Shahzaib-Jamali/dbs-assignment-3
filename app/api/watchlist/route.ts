import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { symbol, name, asset_type } = await req.json()
  if (!symbol || !name || !asset_type) {
    return NextResponse.json({ error: 'symbol, name, asset_type required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('watchlist')
    .upsert({ clerk_user_id: userId, symbol, name, asset_type }, { onConflict: 'clerk_user_id,symbol' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const symbol = req.nextUrl.searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('clerk_user_id', userId)
    .eq('symbol', symbol)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
