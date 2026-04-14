import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Portfolio, Holding } from '@/lib/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get or create portfolio
  let { data: portfolio, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // No row found — create one
    const { data: created, error: createError } = await supabase
      .from('portfolios')
      .insert({ clerk_user_id: userId, cash_balance: 50000 })
      .select()
      .single()

    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })
    portfolio = created
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get holdings
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('*')
    .eq('clerk_user_id', userId)
    .gt('quantity', 0)

  if (holdingsError) return NextResponse.json({ error: holdingsError.message }, { status: 500 })

  return NextResponse.json({
    portfolio: portfolio as Portfolio,
    holdings: (holdings ?? []) as Holding[],
  })
}
