import type { TimeRange } from '@/lib/types'

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX']

interface Props {
  active: TimeRange
  onChange: (range: TimeRange) => void
  mode: 'line' | 'candle'
  onModeChange: (mode: 'line' | 'candle') => void
}

export default function TimeRangeTabs({ active, onChange, mode, onModeChange }: Props) {
  return (
    <div className="flex items-center gap-5 border-t border-slate-700 pt-3 mt-2">
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
      <div className="flex-1" />
      <div className="flex gap-1">
        <button
          onClick={() => onModeChange('line')}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            mode === 'line'
              ? 'bg-teal-600 text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Line
        </button>
        <button
          onClick={() => onModeChange('candle')}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            mode === 'candle'
              ? 'bg-teal-600 text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Candle
        </button>
      </div>
    </div>
  )
}
