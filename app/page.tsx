import Link from 'next/link'
import { Show } from '@clerk/nextjs'

const features = [
  {
    icon: '📈',
    title: 'Real Market Prices',
    description: 'Live stock and forex quotes powered by Alpha Vantage — no fake data.',
  },
  {
    icon: '💰',
    title: '$50K Starting Balance',
    description: 'Every account starts with $50,000 in virtual cash to practice with.',
  },
  {
    icon: '📊',
    title: 'Track Your P&L',
    description: 'Monitor unrealized gains and losses across your full portfolio in real time.',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="inline-block rounded-full bg-teal-100 px-4 py-1 text-sm font-semibold text-teal-700 mb-6">
            Paper Trading · Zero Risk
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Trade stocks &amp; forex
            <span className="text-teal-600"> without the risk</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-600 mb-10">
            Practice investing with $50,000 in virtual cash. Search real assets, execute simulated trades,
            and track your portfolio — no money on the line.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="rounded-xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-teal-700 transition-all hover:shadow-teal-200 hover:shadow-xl"
              >
                Start Trading Free
              </Link>
              <Link
                href="/sign-in"
                className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Log In
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-teal-700 transition-all"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/trade"
                className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Start Trading
              </Link>
            </Show>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-4">
            Everything you need to practice
          </h2>
          <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
            Build trading skills and test strategies with real market data — completely risk-free.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map(f => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-8 shadow-sm hover:shadow-md hover:border-teal-100 transition-all"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-teal-700">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to start practicing?
          </h2>
          <p className="text-teal-100 mb-8 text-lg">
            Create a free account and get $50,000 in virtual cash instantly.
          </p>
          <Show when="signed-out">
            <Link
              href="/sign-up"
              className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-teal-700 hover:bg-teal-50 transition-colors shadow-lg"
            >
              Create Free Account
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/trade"
              className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-teal-700 hover:bg-teal-50 transition-colors shadow-lg"
            >
              Make Your First Trade
            </Link>
          </Show>
        </div>
      </section>
    </main>
  )
}
