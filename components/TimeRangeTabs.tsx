import type { TimeRange } from '@/lib/types'

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX']

interface Props {
  active: TimeRange
  onChange: (range: TimeRange) => void
}

export default function TimeRangeTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-5 border-t border-slate-700 pt-3 mt-2">
      {RANGES.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`text-xs font-semibold pb-1 transition-colors ${
            r === active
              ? 'text-teal-400 border-b-2 border-teal-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
