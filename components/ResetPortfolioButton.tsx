'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ResetPortfolioButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    setLoading(true)
    const res = await fetch('/api/portfolio/reset', { method: 'POST' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? 'Reset failed')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Resetting…' : 'Reset Portfolio'}
    </button>
  )
}
