'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle, LineSeries } from 'lightweight-charts'
import type { ChartPoint } from '@/lib/types'

interface Props {
  points: ChartPoint[]
  isUp: boolean
}

export default function PriceChart({ points, isUp }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#475569',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        vertLine: {
          color: '#14b8a6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0d9488',
        },
        horzLine: {
          color: '#14b8a6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0d9488',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 220,
    })

    const lineColor = isUp ? '#14b8a6' : '#f87171'

    const lineSeries = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#0f172a',
      crosshairMarkerBackgroundColor: lineColor,
      lastValueVisible: false,
      priceLineVisible: true,
      priceLineColor: '#334155',
      priceLineStyle: LineStyle.Dashed,
      priceLineWidth: 1,
    })

    lineSeries.setData(
      points.map(p => ({ time: p.time as any, value: p.price }))
    )

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [points, isUp])

  return <div ref={containerRef} className="w-full" />
}
