// ─── Demand Forecast Mock Data ─────────────────────────────────────────────

export interface DemandDataPoint {
  month: string
  actual: number | null
  predicted: number
  upperBound: number
  lowerBound: number
  anomaly?: boolean
}

export interface SeasonalityPoint {
  month: string
  value: number
}

export interface ShapFeature {
  feature: string
  value: number
  impact: 'positive' | 'negative'
}

export interface ModelMetrics {
  mape: number
  mae: number
  rmse: number
  r2: number
  lastTrained: string
}

export interface ForecastMaterial {
  id: string
  name: string
  category: string
}

export const demandForecastData: DemandDataPoint[] = [
  { month: 'Jan 24', actual: 1240, predicted: 1220, upperBound: 1360, lowerBound: 1080 },
  { month: 'Feb 24', actual: 1180, predicted: 1200, upperBound: 1340, lowerBound: 1060 },
  { month: 'Mar 24', actual: 1420, predicted: 1400, upperBound: 1560, lowerBound: 1240 },
  { month: 'Apr 24', actual: 1580, predicted: 1550, upperBound: 1720, lowerBound: 1380 },
  { month: 'May 24', actual: 1720, predicted: 1700, upperBound: 1880, lowerBound: 1520, anomaly: true },
  { month: 'Jun 24', actual: 1900, predicted: 1870, upperBound: 2070, lowerBound: 1670 },
  { month: 'Jul 24', actual: 2100, predicted: 2080, upperBound: 2300, lowerBound: 1860 },
  { month: 'Aug 24', actual: 2240, predicted: 2200, upperBound: 2440, lowerBound: 1960 },
  { month: 'Sep 24', actual: 2050, predicted: 2020, upperBound: 2240, lowerBound: 1800 },
  { month: 'Oct 24', actual: 1880, predicted: 1860, upperBound: 2060, lowerBound: 1660 },
  { month: 'Nov 24', actual: 1640, predicted: 1680, upperBound: 1860, lowerBound: 1500 },
  { month: 'Dec 24', actual: 1520, predicted: 1560, upperBound: 1740, lowerBound: 1380 },
  { month: 'Jan 25', actual: null, predicted: 1380, upperBound: 1560, lowerBound: 1200 },
  { month: 'Feb 25', actual: null, predicted: 1440, upperBound: 1640, lowerBound: 1240 },
  { month: 'Mar 25', actual: null, predicted: 1620, upperBound: 1840, lowerBound: 1400 },
  { month: 'Apr 25', actual: null, predicted: 1780, upperBound: 2020, lowerBound: 1540 },
  { month: 'May 25', actual: null, predicted: 1960, upperBound: 2220, lowerBound: 1700 },
  { month: 'Jun 25', actual: null, predicted: 2140, upperBound: 2420, lowerBound: 1860 },
]

export const seasonalityData = {
  trend: [
    { month: 'Jan', value: 1280 },
    { month: 'Feb', value: 1310 },
    { month: 'Mar', value: 1380 },
    { month: 'Apr', value: 1460 },
    { month: 'May', value: 1540 },
    { month: 'Jun', value: 1620 },
    { month: 'Jul', value: 1700 },
    { month: 'Aug', value: 1780 },
    { month: 'Sep', value: 1740 },
    { month: 'Oct', value: 1640 },
    { month: 'Nov', value: 1540 },
    { month: 'Dec', value: 1430 },
  ],
  seasonal: [
    { month: 'Jan', value: -0.08 },
    { month: 'Feb', value: -0.12 },
    { month: 'Mar', value: 0.04 },
    { month: 'Apr', value: 0.14 },
    { month: 'May', value: 0.20 },
    { month: 'Jun', value: 0.28 },
    { month: 'Jul', value: 0.34 },
    { month: 'Aug', value: 0.38 },
    { month: 'Sep', value: 0.24 },
    { month: 'Oct', value: 0.10 },
    { month: 'Nov', value: -0.06 },
    { month: 'Dec', value: -0.18 },
  ],
  residual: [
    { month: 'Jan', value: 0.02 },
    { month: 'Feb', value: -0.03 },
    { month: 'Mar', value: 0.04 },
    { month: 'Apr', value: -0.01 },
    { month: 'May', value: 0.06 },
    { month: 'Jun', value: -0.02 },
    { month: 'Jul', value: 0.03 },
    { month: 'Aug', value: 0.02 },
    { month: 'Sep', value: -0.04 },
    { month: 'Oct', value: 0.01 },
    { month: 'Nov', value: 0.02 },
    { month: 'Dec', value: -0.03 },
  ],
}

export const shapFeatures: ShapFeature[] = [
  { feature: 'Monsoon Rainfall Index', value: 0.28, impact: 'positive' },
  { feature: 'Construction Activity', value: 0.22, impact: 'positive' },
  { feature: 'Previous Month Demand', value: 0.18, impact: 'positive' },
  { feature: 'Steel Price Trend', value: -0.15, impact: 'negative' },
  { feature: 'Govt Infrastructure Spend', value: 0.12, impact: 'positive' },
  { feature: 'Competitor Inventory', value: -0.10, impact: 'negative' },
  { feature: 'GDP Growth Rate', value: 0.08, impact: 'positive' },
  { feature: 'Diesel Price', value: -0.06, impact: 'negative' },
]

export const modelMetrics: ModelMetrics = {
  mape: 5.8,
  mae: 87.4,
  rmse: 112.6,
  r2: 0.942,
  lastTrained: '2025-06-18T03:00:00Z',
}

export const forecastMaterials: ForecastMaterial[] = [
  { id: 'MAT-001', name: 'TMT Steel Bars', category: 'Steel' },
  { id: 'MAT-002', name: 'OPC Cement 53 Grade', category: 'Cement' },
  { id: 'MAT-003', name: 'Copper Wire 6mm', category: 'Copper' },
  { id: 'MAT-004', name: 'HDPE Pipes 110mm', category: 'Polymer' },
  { id: 'MAT-005', name: 'Aluminum Sheets 2mm', category: 'Aluminum' },
  { id: 'MAT-006', name: 'River Sand Grade 2', category: 'Aggregate' },
  { id: 'MAT-007', name: 'Diesel HSD', category: 'Fuel' },
  { id: 'MAT-008', name: 'Bitumen VG-30', category: 'Bitumen' },
  { id: 'MAT-009', name: 'MS Plates 12mm', category: 'Steel' },
  { id: 'MAT-010', name: 'PVC Conduit 25mm', category: 'Polymer' },
]
