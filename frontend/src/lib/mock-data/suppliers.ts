// ─── Suppliers Mock Data ────────────────────────────────────────────────────

export type SupplierStatus = 'active' | 'at_risk' | 'blacklisted'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface RadarPoint {
  axis: string
  value: number
}

export interface PerformanceTrendPoint {
  month: string
  score: number
}

export interface Supplier {
  id: string
  name: string
  category: string
  location: string
  state: string
  score: number
  leadTime: number
  onTimeDelivery: number
  defectRate: number
  contracts: number
  status: SupplierStatus
  riskLevel: RiskLevel
  radarData: RadarPoint[]
  performanceTrend: PerformanceTrendPoint[]
}

export interface AIRankingEntry {
  id: string
  name: string
  reason: string
}

export interface AIRankings {
  bestOverall: AIRankingEntry
  cheapest: AIRankingEntry
  fastest: AIRankingEntry
  lowestRisk: AIRankingEntry
}

function makeTrend(base: number, direction: number): PerformanceTrendPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  let score = base - direction * 6
  return months.map((month) => {
    score += direction + (Math.random() - 0.5) * 2
    return { month, score: Math.min(100, Math.max(0, Math.round(score * 10) / 10)) }
  })
}

export const suppliers: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Tata Steel Ltd',
    category: 'Steel',
    location: 'Jamshedpur',
    state: 'Jharkhand',
    score: 94.2,
    leadTime: 8,
    onTimeDelivery: 97.4,
    defectRate: 0.3,
    contracts: 12,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 96 }, { axis: 'On-Time', value: 97 }, { axis: 'Price', value: 88 },
      { axis: 'Flexibility', value: 92 }, { axis: 'Communication', value: 94 },
    ],
    performanceTrend: makeTrend(94, 0.1),
  },
  {
    id: 'SUP-002',
    name: 'ACC Cement Ltd',
    category: 'Cement',
    location: 'Mumbai',
    state: 'Maharashtra',
    score: 89.6,
    leadTime: 5,
    onTimeDelivery: 94.2,
    defectRate: 0.4,
    contracts: 8,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 92 }, { axis: 'On-Time', value: 94 }, { axis: 'Price', value: 85 },
      { axis: 'Flexibility', value: 88 }, { axis: 'Communication', value: 90 },
    ],
    performanceTrend: makeTrend(89, 0.08),
  },
  {
    id: 'SUP-003',
    name: 'Hindalco Industries',
    category: 'Aluminum',
    location: 'Renukoot',
    state: 'Uttar Pradesh',
    score: 87.8,
    leadTime: 10,
    onTimeDelivery: 91.8,
    defectRate: 0.5,
    contracts: 6,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 90 }, { axis: 'On-Time', value: 92 }, { axis: 'Price', value: 84 },
      { axis: 'Flexibility', value: 86 }, { axis: 'Communication', value: 88 },
    ],
    performanceTrend: makeTrend(87, 0.05),
  },
  {
    id: 'SUP-004',
    name: 'Sterlite Technologies',
    category: 'Copper',
    location: 'Silvassa',
    state: 'Dadra & NH',
    score: 91.4,
    leadTime: 7,
    onTimeDelivery: 95.6,
    defectRate: 0.2,
    contracts: 9,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 94 }, { axis: 'On-Time', value: 96 }, { axis: 'Price', value: 86 },
      { axis: 'Flexibility', value: 90 }, { axis: 'Communication', value: 92 },
    ],
    performanceTrend: makeTrend(91, 0.12),
  },
  {
    id: 'SUP-005',
    name: 'HPCL',
    category: 'Fuel',
    location: 'Mumbai',
    state: 'Maharashtra',
    score: 96.8,
    leadTime: 2,
    onTimeDelivery: 99.1,
    defectRate: 0.1,
    contracts: 18,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 98 }, { axis: 'On-Time', value: 99 }, { axis: 'Price', value: 92 },
      { axis: 'Flexibility', value: 95 }, { axis: 'Communication', value: 98 },
    ],
    performanceTrend: makeTrend(96, 0.02),
  },
  {
    id: 'SUP-006',
    name: 'Ultratech Cement',
    category: 'Cement',
    location: 'Ahmedabad',
    state: 'Gujarat',
    score: 88.4,
    leadTime: 6,
    onTimeDelivery: 92.4,
    defectRate: 0.6,
    contracts: 7,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 91 }, { axis: 'On-Time', value: 92 }, { axis: 'Price', value: 87 },
      { axis: 'Flexibility', value: 85 }, { axis: 'Communication', value: 87 },
    ],
    performanceTrend: makeTrend(88, 0.04),
  },
  {
    id: 'SUP-007',
    name: 'SAIL',
    category: 'Steel',
    location: 'Bhilai',
    state: 'Chhattisgarh',
    score: 74.2,
    leadTime: 18,
    onTimeDelivery: 78.6,
    defectRate: 1.8,
    contracts: 4,
    status: 'at_risk',
    riskLevel: 'high',
    radarData: [
      { axis: 'Quality', value: 74 }, { axis: 'On-Time', value: 79 }, { axis: 'Price', value: 88 },
      { axis: 'Flexibility', value: 65 }, { axis: 'Communication', value: 72 },
    ],
    performanceTrend: makeTrend(78, -0.3),
  },
  {
    id: 'SUP-008',
    name: 'Indian Oil Corp',
    category: 'Bitumen',
    location: 'Delhi',
    state: 'Delhi',
    score: 82.6,
    leadTime: 9,
    onTimeDelivery: 85.4,
    defectRate: 0.8,
    contracts: 5,
    status: 'active',
    riskLevel: 'medium',
    radarData: [
      { axis: 'Quality', value: 85 }, { axis: 'On-Time', value: 85 }, { axis: 'Price', value: 83 },
      { axis: 'Flexibility', value: 80 }, { axis: 'Communication', value: 82 },
    ],
    performanceTrend: makeTrend(82, -0.05),
  },
  {
    id: 'SUP-009',
    name: 'Supreme Industries',
    category: 'Polymer',
    location: 'Pune',
    state: 'Maharashtra',
    score: 83.8,
    leadTime: 11,
    onTimeDelivery: 87.2,
    defectRate: 0.7,
    contracts: 4,
    status: 'active',
    riskLevel: 'medium',
    radarData: [
      { axis: 'Quality', value: 86 }, { axis: 'On-Time', value: 87 }, { axis: 'Price', value: 82 },
      { axis: 'Flexibility', value: 82 }, { axis: 'Communication', value: 84 },
    ],
    performanceTrend: makeTrend(83, 0.0),
  },
  {
    id: 'SUP-010',
    name: 'Jindal Steel',
    category: 'Steel',
    location: 'Raigarh',
    state: 'Chhattisgarh',
    score: 86.2,
    leadTime: 12,
    onTimeDelivery: 88.8,
    defectRate: 0.9,
    contracts: 5,
    status: 'active',
    riskLevel: 'medium',
    radarData: [
      { axis: 'Quality', value: 88 }, { axis: 'On-Time', value: 89 }, { axis: 'Price', value: 90 },
      { axis: 'Flexibility', value: 82 }, { axis: 'Communication', value: 84 },
    ],
    performanceTrend: makeTrend(86, 0.06),
  },
  {
    id: 'SUP-011',
    name: 'Finolex Cables',
    category: 'Copper',
    location: 'Pune',
    state: 'Maharashtra',
    score: 90.4,
    leadTime: 8,
    onTimeDelivery: 93.8,
    defectRate: 0.4,
    contracts: 7,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 93 }, { axis: 'On-Time', value: 94 }, { axis: 'Price', value: 85 },
      { axis: 'Flexibility', value: 90 }, { axis: 'Communication', value: 91 },
    ],
    performanceTrend: makeTrend(90, 0.1),
  },
  {
    id: 'SUP-012',
    name: 'Ambuja Cement',
    category: 'Cement',
    location: 'Ambujanagar',
    state: 'Gujarat',
    score: 85.6,
    leadTime: 7,
    onTimeDelivery: 89.4,
    defectRate: 0.7,
    contracts: 5,
    status: 'active',
    riskLevel: 'medium',
    radarData: [
      { axis: 'Quality', value: 88 }, { axis: 'On-Time', value: 89 }, { axis: 'Price', value: 84 },
      { axis: 'Flexibility', value: 84 }, { axis: 'Communication', value: 86 },
    ],
    performanceTrend: makeTrend(85, 0.03),
  },
  {
    id: 'SUP-013',
    name: 'Polyplex Corp',
    category: 'Polymer',
    location: 'Haridwar',
    state: 'Uttarakhand',
    score: 62.8,
    leadTime: 21,
    onTimeDelivery: 64.2,
    defectRate: 3.4,
    contracts: 2,
    status: 'at_risk',
    riskLevel: 'high',
    radarData: [
      { axis: 'Quality', value: 62 }, { axis: 'On-Time', value: 64 }, { axis: 'Price', value: 78 },
      { axis: 'Flexibility', value: 58 }, { axis: 'Communication', value: 56 },
    ],
    performanceTrend: makeTrend(68, -0.42),
  },
  {
    id: 'SUP-014',
    name: 'Greenply Industries',
    category: 'Wood',
    location: 'Tizit',
    state: 'Nagaland',
    score: 44.2,
    leadTime: 28,
    onTimeDelivery: 48.6,
    defectRate: 5.2,
    contracts: 1,
    status: 'blacklisted',
    riskLevel: 'high',
    radarData: [
      { axis: 'Quality', value: 44 }, { axis: 'On-Time', value: 49 }, { axis: 'Price', value: 72 },
      { axis: 'Flexibility', value: 40 }, { axis: 'Communication', value: 38 },
    ],
    performanceTrend: makeTrend(52, -0.6),
  },
  {
    id: 'SUP-015',
    name: 'Birla Copper',
    category: 'Copper',
    location: 'Taloja',
    state: 'Maharashtra',
    score: 92.0,
    leadTime: 6,
    onTimeDelivery: 96.2,
    defectRate: 0.2,
    contracts: 10,
    status: 'active',
    riskLevel: 'low',
    radarData: [
      { axis: 'Quality', value: 95 }, { axis: 'On-Time', value: 96 }, { axis: 'Price', value: 87 },
      { axis: 'Flexibility', value: 91 }, { axis: 'Communication', value: 93 },
    ],
    performanceTrend: makeTrend(92, 0.05),
  },
]

export const aiRankings: AIRankings = {
  bestOverall: {
    id: 'SUP-005',
    name: 'HPCL',
    reason: 'Score 96.8 — highest composite rating across quality, delivery, and responsiveness in Fuel category.',
  },
  cheapest: {
    id: 'SUP-010',
    name: 'Jindal Steel',
    reason: 'Offers 4.2% lower price per MT vs category average. Strong for bulk non-critical steel procurement.',
  },
  fastest: {
    id: 'SUP-005',
    name: 'HPCL',
    reason: 'Average lead time of 2 days — fastest across all 15 suppliers in the network.',
  },
  lowestRisk: {
    id: 'SUP-001',
    name: 'Tata Steel Ltd',
    reason: 'Zero disruptions in 36 months. Lowest defect rate (0.3%) with multi-site supply redundancy.',
  },
}
