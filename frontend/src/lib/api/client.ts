/**
 * lib/api/client.ts
 * Central API client — all fetch calls to the FastAPI backend.
 */

import { getApiBaseUrl, getApiUrl, isApiConfigured, formatApiErrorMessage } from './config'

export { getApiBaseUrl, getApiUrl, isApiConfigured, formatApiErrorMessage }

export async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const fullUrl = getApiUrl(path)

  let urlObj: URL
  if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
    urlObj = new URL(fullUrl)
  } else if (typeof window !== 'undefined') {
    urlObj = new URL(fullUrl, window.location.origin)
  } else {
    urlObj = new URL(fullUrl, 'http://localhost:8000')
  }

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') urlObj.searchParams.set(k, v)
    })
  }

  const res = await fetch(urlObj.toString(), { cache: 'no-store' })
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new Error(`API error ${res.status} (${path}): ${errorBody || res.statusText}`)
  }
  return res.json()
}

// ── Health ──────────────────────────────────────────────────────────────────
export const fetchHealth = () => apiFetch('/api/health')

// ── Dashboard ───────────────────────────────────────────────────────────────
export const fetchKPIs            = () => apiFetch('/api/dashboard/kpis')
export const fetchDemandTrend     = () => apiFetch('/api/dashboard/demand-trend')
export const fetchTopCategories   = () => apiFetch('/api/dashboard/top-categories')
export const fetchRegionalDemand  = () => apiFetch('/api/dashboard/regional-demand')

// ── Forecast ─────────────────────────────────────────────────────────────────
export const fetchDemandSeries = (category?: string, region?: string, limit = 60) =>
  apiFetch('/api/forecast/demand-series', {
    ...(category ? { category } : {}),
    ...(region   ? { region   } : {}),
    limit: String(limit),
  })
export const fetchForecastCategories  = () => apiFetch<string[]>('/api/forecast/categories')
export const fetchForecastRegions     = () => apiFetch<string[]>('/api/forecast/regions')
export const fetchModelMetrics        = () => apiFetch('/api/forecast/model-metrics')
export const fetchModelComparison     = () => apiFetch('/api/forecast/model-comparison')
export const fetchTftPredict          = (category: string, region: string) =>
  apiFetch('/api/forecast/tft-predict', { category, region })

// ── Inventory ────────────────────────────────────────────────────────────────
export const fetchInventorySummary      = () => apiFetch('/api/inventory/summary')
export const fetchStockStatusDist       = () => apiFetch('/api/inventory/stock-status-distribution')
export const fetchAbcAnalysis           = () => apiFetch('/api/inventory/abc-analysis')
export const fetchLowStockItems         = () => apiFetch('/api/inventory/low-stock-items')
export const fetchSeasonalityTrend      = () => apiFetch('/api/inventory/seasonality-trend')

// ── Suppliers ────────────────────────────────────────────────────────────────
export const fetchAllSuppliers          = () => apiFetch('/api/suppliers/all')
export const fetchTopSuppliers          = () => apiFetch('/api/suppliers/top')
export const fetchSupplierRiskDist      = () => apiFetch('/api/suppliers/risk-distribution')
export const fetchSupplierScoreBreakdown = () => apiFetch('/api/suppliers/score-breakdown')

// ── Market ───────────────────────────────────────────────────────────────────
export const fetchMarketPrices          = () => apiFetch('/api/market/commodity-prices')
export const fetchPriceHistory          = () => apiFetch('/api/market/price-history')
export const fetchMarketAnalysis        = () => apiFetch('/api/market/analysis')
export const fetchLiveSummary           = () => apiFetch('/api/market/live-summary')
export const fetchMarketAlerts          = () => apiFetch('/api/market/alerts')

// ── Procurement ──────────────────────────────────────────────────────────────
export const fetchDeliveryAnalysis      = () => apiFetch('/api/procurement/delivery-analysis')
export const fetchSpendByCategory       = () => apiFetch('/api/procurement/spend-by-category')
export const fetchMonthlySpend          = () => apiFetch('/api/procurement/monthly-spend')
export const fetchDeliveryStatus        = () => apiFetch('/api/procurement/delivery-status')
