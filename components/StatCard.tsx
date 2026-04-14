interface StatCardProps {
  label: string
  value: string
  subtext?: string
  variant?: 'default' | 'positive' | 'negative'
}

export default function StatCard({ label, value, subtext, variant = 'default' }: StatCardProps) {
  const valueColor =
    variant === 'positive' ? 'text-emerald-600' :
    variant === 'negative' ? 'text-red-500' :
    'text-slate-900'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  )
}
