// ─── Market Intelligence Mock Data ─────────────────────────────────────────

export type CommodityRec = 'BUY' | 'WAIT' | 'SELL'
export type NewsSentiment = 'positive' | 'negative' | 'neutral'
export type NewsImpact = 'high' | 'medium' | 'low'
export type SyncStatus = 'synced' | 'pending' | 'error'

export interface PriceHistoryPoint {
  date: string
  price: number
}

export interface Commodity {
  id: string
  name: string
  currentPrice: number
  unit: string
  change24h: number
  change7d: number
  ath: number
  atl: number
  recommendation: CommodityRec
  priceHistory: PriceHistoryPoint[]
  color: string
}

export interface NewsItem {
  id: string
  title: string
  source: string
  time: string
  sentiment: NewsSentiment
  impact: NewsImpact
  summary: string
}

export interface ERPSystem {
  name: string
  status: SyncStatus
  lastSynced: string
}

export interface ERPSyncStatus {
  lastSync: string
  systems: ERPSystem[]
}

function generatePriceHistory(base: number, days: number, volatility: number): PriceHistoryPoint[] {
  const history: PriceHistoryPoint[] = []
  let price = base * 0.88
  const now = new Date('2025-06-19')
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const change = (Math.random() - 0.47) * base * volatility
    price = Math.max(base * 0.7, Math.min(base * 1.3, price + change))
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price),
    })
  }
  return history
}

export const commodities: Commodity[] = [
  {
    id: 'COMM-001',
    name: 'Steel (TMT Fe500D)',
    currentPrice: 58400,
    unit: '₹/MT',
    change24h: 1.2,
    change7d: 3.4,
    ath: 72000,
    atl: 42000,
    recommendation: 'BUY',
    priceHistory: generatePriceHistory(58400, 90, 0.015),
    color: '#3B8EE8',
  },
  {
    id: 'COMM-002',
    name: 'Copper (LME Grade A)',
    currentPrice: 782000,
    unit: '₹/MT',
    change24h: -2.0,
    change7d: -1.4,
    ath: 920000,
    atl: 540000,
    recommendation: 'WAIT',
    priceHistory: generatePriceHistory(782000, 90, 0.018),
    color: '#F59E0B',
  },
  {
    id: 'COMM-003',
    name: 'Cement (OPC 53 Grade)',
    currentPrice: 380,
    unit: '₹/bag',
    change24h: 0.5,
    change7d: 1.6,
    ath: 430,
    atl: 310,
    recommendation: 'BUY',
    priceHistory: generatePriceHistory(380, 90, 0.008),
    color: '#00D4AA',
  },
  {
    id: 'COMM-004',
    name: 'Diesel (HSD)',
    currentPrice: 8962,
    unit: '₹/100L',
    change24h: -0.73,
    change7d: -1.8,
    ath: 11200,
    atl: 7200,
    recommendation: 'WAIT',
    priceHistory: generatePriceHistory(8962, 90, 0.010),
    color: '#EF4444',
  },
  {
    id: 'COMM-005',
    name: 'Aluminum (LME)',
    currentPrice: 214500,
    unit: '₹/MT',
    change24h: 2.24,
    change7d: 4.1,
    ath: 268000,
    atl: 148000,
    recommendation: 'BUY',
    priceHistory: generatePriceHistory(214500, 90, 0.016),
    color: '#8B5CF6',
  },
]

export const newsItems: NewsItem[] = [
  {
    id: 'NEWS-001',
    title: 'China Steel Export Tariffs Rise 15% — Global Price Surge Expected',
    source: 'Reuters Commodities',
    time: '2025-06-19T08:30:00Z',
    sentiment: 'negative',
    impact: 'high',
    summary: 'China announced a 15% increase in steel export tariffs effective July 1st, expected to tighten global supply and push TMT prices up by 4-7% over the next quarter. Procurement teams should consider forward buying.',
  },
  {
    id: 'NEWS-002',
    title: 'India Infra Budget Increased by ₹1.2L Cr — Cement Demand to Surge',
    source: 'Economic Times',
    time: '2025-06-18T14:00:00Z',
    sentiment: 'positive',
    impact: 'high',
    summary: 'Union Cabinet approved additional infra spending of ₹1.2 lakh crore for FY26. Analysts project 18-22% YoY growth in cement demand, particularly in road and metro rail segments.',
  },
  {
    id: 'NEWS-003',
    title: 'LME Copper Falls 2.1% on Weak China PMI Data',
    source: 'Bloomberg Markets',
    time: '2025-06-18T09:15:00Z',
    sentiment: 'negative',
    impact: 'medium',
    summary: 'LME copper prices fell 2.1% after China manufacturing PMI came in at 49.2, below the 50-point expansion threshold. Short-term weakness expected for copper-linked materials.',
  },
  {
    id: 'NEWS-004',
    title: 'Monsoon Arrives Early in Kerala — Logistics Disruption Possible',
    source: 'IMD Weather Service',
    time: '2025-06-17T12:00:00Z',
    sentiment: 'negative',
    impact: 'high',
    summary: 'IMD reports Southwest Monsoon arrived 6 days ahead of schedule in Kerala. Early monsoon progression towards Karnataka and Goa expected. Road logistics in western coastal states may face 20-30% delay rates.',
  },
  {
    id: 'NEWS-005',
    title: 'OPEC Extends Production Cuts — Diesel Price Relief Unlikely',
    source: 'Oil & Gas Journal',
    time: '2025-06-17T08:00:00Z',
    sentiment: 'negative',
    impact: 'medium',
    summary: 'OPEC+ agreed to extend production cuts by 6 months. Brent crude holding above $84/barrel. HSD diesel retail prices expected to remain elevated through Q3 2025.',
  },
  {
    id: 'NEWS-006',
    title: 'Aluminum Demand from EV Sector Hits 5-Year High',
    source: 'Metal Bulletin',
    time: '2025-06-16T10:30:00Z',
    sentiment: 'positive',
    impact: 'medium',
    summary: 'Electric vehicle manufacturers globally increased aluminum orders by 34% YoY. LME aluminum prices rose 4.1% this week. Positive signal for Indian aluminum producers and buyers holding inventory.',
  },
  {
    id: 'NEWS-007',
    title: 'Government Approves New Mining Leases — Sand Shortage Relief in Sight',
    source: 'Construction World',
    time: '2025-06-15T11:00:00Z',
    sentiment: 'positive',
    impact: 'medium',
    summary: 'Ministry of Mines approved 127 new river sand mining leases across 8 states. Supply normalization expected over 60-90 days. Short-term prices may remain elevated by 12-15%.',
  },
  {
    id: 'NEWS-008',
    title: 'Tata Steel Q1 FY26 Output Rises 8% — Domestic Supply Improves',
    source: 'Business Standard',
    time: '2025-06-14T16:00:00Z',
    sentiment: 'positive',
    impact: 'low',
    summary: 'Tata Steel India operations reported 8% higher crude steel output in Q1 FY26. Expanded Kalinganagar capacity contributing 1.2 MT annually. Positive for domestic TMT supply chain stability.',
  },
]

export const erpSyncStatus: ERPSyncStatus = {
  lastSync: '2025-06-19T09:45:00Z',
  systems: [
    { name: 'SAP S/4HANA', status: 'synced', lastSynced: '2025-06-19T09:45:00Z' },
    { name: 'Oracle SCM', status: 'synced', lastSynced: '2025-06-19T09:30:00Z' },
    { name: 'Microsoft D365', status: 'pending', lastSynced: '2025-06-19T08:00:00Z' },
    { name: 'Tally Prime', status: 'error', lastSynced: '2025-06-18T22:00:00Z' },
    { name: 'Zoho Inventory', status: 'synced', lastSynced: '2025-06-19T09:15:00Z' },
  ],
}
