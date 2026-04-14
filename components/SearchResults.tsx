import type { SearchResult } from '@/lib/types'

interface SearchResultsProps {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}

export default function SearchResults({ results, onSelect }: SearchResultsProps) {
  if (results.length === 0) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {results.map(r => (
        <button
          key={r.symbol}
          onClick={() => onSelect(r)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
        >
          <div>
            <span className="font-semibold text-slate-900">{r.symbol}</span>
            <span className="ml-2 text-sm text-slate-500">{r.name}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            r.asset_type === 'forex'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-teal-50 text-teal-700'
          }`}>
            {r.asset_type}
          </span>
        </button>
      ))}
    </div>
  )
}
