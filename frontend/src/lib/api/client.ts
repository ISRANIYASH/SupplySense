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

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const fullUrl = getApiUrl(path)
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
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

// ── Logistics ────────────────────────────────────────────────────────────────
export const fetchLogisticsKPIs         = () => apiFetch('/api/logistics/kpis')
export const fetchShippingSummary       = () => apiFetch('/api/logistics/shipping-summary')
export const fetchRegionalPerformance   = () => apiFetch('/api/logistics/regional-performance')
export const fetchDelayDistribution     = () => apiFetch('/api/logistics/delay-distribution')

// ── Warehouse ────────────────────────────────────────────────────────────────
export const fetchWarehouseKPIs         = () => apiFetch('/api/warehouse/kpis')
export const fetchWarehouseOccupancy    = () => apiFetch('/api/warehouse/occupancy-by-region')
export const fetchWarehouseStockByStore  = () => apiFetch('/api/warehouse/stock-by-store')
export const fetchWarehouseTransfers    = () => apiFetch('/api/warehouse/transfer-suggestions')
export const fetchWarehouseGrid         = () => apiFetch('/api/warehouse/grid-sample')

// ── Risk ─────────────────────────────────────────────────────────────────────
export const fetchRiskOverview          = () => apiFetch('/api/risk/overview')
export const fetchRiskMatrix            = () => apiFetch('/api/risk/matrix-data')
export const fetchCriticalAlerts        = () => apiFetch('/api/risk/critical-alerts')
export const fetchMitigationPlan        = () => apiFetch('/api/risk/mitigation-plan')

// ── Analytics ────────────────────────────────────────────────────────────────
export const fetchAnalyticsSummary      = () => apiFetch('/api/analytics/summary-stats')
export const fetchAnalyticsCorrelation  = () => apiFetch('/api/analytics/correlation-matrix')
export const fetchAnalyticsOutliers     = () => apiFetch('/api/analytics/outliers')
export const fetchAnalyticsDistribution = () => apiFetch('/api/analytics/distribution')

// ── Weather ──────────────────────────────────────────────────────────────────
export const fetchWeatherImpact         = () => apiFetch('/api/weather/impact-analysis')
export const fetchSeasonalImpact        = () => apiFetch('/api/weather/seasonal-impact')
export const fetchRegionalWeather       = () => apiFetch('/api/weather/regional-summary')
export const fetchSevereAlerts          = () => apiFetch('/api/weather/severe-alerts')

// ── Copilot ──────────────────────────────────────────────────────────────────
export const fetchCopilotStatus         = () => apiFetch('/api/copilot/status')
export const askCopilot                 = (prompt: string, context?: any) =>
  apiPost('/api/copilot/ask', { prompt, context })

// ── Simulator ────────────────────────────────────────────────────────────────
export const fetchSimulatorScenarios    = () => apiFetch('/api/simulator/scenarios')
export const runSimulation              = (params: any) =>
  apiPost('/api/simulator/simulate', params)

// ── Explainability ───────────────────────────────────────────────────────────
export const fetchShapValues            = () => apiFetch('/api/explainability/shap-values')
export const fetchModelInfo             = () => apiFetch('/api/explainability/model-info')
export const fetchDecisionTrace         = () => apiFetch('/api/explainability/decision-trace')

// ── MLOps ────────────────────────────────────────────────────────────────────
export const fetchExperimentRuns        = () => apiFetch('/api/mlops/experiment-runs')
export const fetchModelRegistry         = () => apiFetch('/api/mlops/model-registry')
export const fetchDagStatus             = () => apiFetch('/api/mlops/dag-status')

// ── Decisions / Activity History ─────────────────────────────────────────────
export const fetchDecisionsLog          = () => apiFetch('/api/decisions/log')
export const fetchDecisionsSummary      = () => apiFetch('/api/decisions/summary')

// ── Alerts ───────────────────────────────────────────────────────────────────
export const fetchActiveAlerts          = () => apiFetch('/api/alerts/active')
export const fetchAlertsSummary         = () => apiFetch('/api/alerts/summary')
export const fetchAlertsHistory         = () => apiFetch('/api/alerts/history')

// ── Admin ────────────────────────────────────────────────────────────────────
export const fetchAdminSystemHealth     = () => apiFetch('/api/admin/system-health')
export const fetchAdminTableStats       = () => apiFetch('/api/admin/table-stats')

