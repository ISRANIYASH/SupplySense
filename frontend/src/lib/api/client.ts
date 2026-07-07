/**
 * lib/api/client.ts
 * Central API client — all fetch calls to the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
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
