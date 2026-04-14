import { createClient } from '@supabase/supabase-js'

// Service role key — NEVER import this file in client components
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
