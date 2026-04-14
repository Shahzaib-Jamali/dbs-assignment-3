# Live Chart Feature — Trade Page

**Date:** 2026-04-13
**Status:** Approved

## Overview

Add a Robinhood-inspired live price chart to the trade page. When a user selects a stock or forex pair, the trade panel transforms into a dark-mode, two-column layout: a teal line chart on the left and the buy/sell form on the right.

## Visual Design

- **Background:** Full dark slate (`#0f172a`) for the trade panel only — the rest of the site (navbar, home, dashboard, history) stays light
- **Chart line:** Turquoise (`#14b8a6`) line, no fill/gradient
- **Reference line:** Dotted horizontal line at the asset's open price for the selected period
- **Hover interaction:** Vertical crosshair follows cursor; teal tooltip bubble shows price + timestamp; large price number in header updates live
- **Time ranges:** 1D · 1W · 1M · 3M · 1Y · MAX — active tab has turquoise underline
- **Up/down color:** Line and price change text turquoise when up, red (`#f87171`) when down

## Layout

Two-column inside a dark rounded card (appears after a symbol is selected):

- **Left (60%):** Symbol name + price header, line chart, time range tabs
- **Right (40%):** Dark card with Buy/Sell toggle, shares input, market price, estimated total, "Review Order" button, available cash

The existing empty-state placeholder ("Search for an asset above") remains when nothing is selected.

## Data Source

Alpha Vantage API — new `/api/chart` route:

- **Stocks:** `TIME_SERIES_INTRADAY` (1D = 5min intervals), `TIME_SERIES_DAILY` (1W/1M/3M/1Y), `TIME_SERIES_WEEKLY` (MAX)
- **Forex:** `FX_INTRADAY` (1D), `FX_DAILY` (1W/1M/3M/1Y), `FX_WEEKLY` (MAX)
- Returns array of `{ time: string, price: number }` points
- Cached on the client for the session (no re-fetch on tab switch if data is fresh < 60s)

## Chart Library

**lightweight-charts** (TradingView) — purpose-built for financial line charts, handles crosshair/tooltip natively, ~40KB, no canvas management needed.

## Components

| File | Responsibility |
|------|---------------|
| `app/api/chart/route.ts` | Fetch + normalize Alpha Vantage time series |
| `components/PriceChart.tsx` | lightweight-charts wrapper, teal theme, crosshair |
| `components/TimeRangeTabs.tsx` | 1D/1W/1M/3M/1Y/MAX tab selector |

`app/trade/page.tsx` gets a layout update — when `selected` is set, render the dark two-column panel instead of the current single-column card.

## Error & Loading States

- **Loading:** Skeleton pulse in the chart area while fetching
- **API error / rate limit:** Show "Chart unavailable" message; buy/sell form still works
- **Demo key:** Alpha Vantage demo key only supports a few symbols — chart gracefully falls back to "unavailable" for unsupported symbols

## Out of Scope

- Candlestick charts
- Volume bars
- Drawing tools
- WebSocket real-time streaming (polling only — chart refreshes when time range changes)
