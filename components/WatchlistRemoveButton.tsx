'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function WatchlistRemoveButton({ symbol }: { symbol: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    setLoading(true)
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
    >
      {loading ? '…' : 'Remove'}
    </button>
  )
}
