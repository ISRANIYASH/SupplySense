// ─── KPI Mock Data ─────────────────────────────────────────────────────────

export type KPITrend = 'up' | 'down' | 'neutral'

export interface ExecutiveKPI {
  id: string
  title: string
  value: string
  delta: string
  deltaLabel: string
  prefix?: string
  suffix?: string
  sparklineData: number[]
  iconColor: string
  trend: KPITrend
}

export const executiveKPIs: ExecutiveKPI[] = [
  {
    id: 'total-inventory-value',
    title: 'Total Inventory Value',
    value: '847.3',
    delta: '+8.2%',
    deltaLabel: 'vs last month',
    prefix: '₹',
    suffix: 'Cr',
    sparklineData: [720, 735, 748, 760, 772, 790, 802, 815, 821, 830, 840, 847],
    iconColor: '#3B8EE8',
    trend: 'up',
  },
  {
    id: 'inventory-turnover',
    title: 'Inventory Turnover Ratio',
    value: '4.7',
    delta: '+0.3',
    deltaLabel: 'vs last quarter',
    suffix: 'x',
    sparklineData: [3.9, 4.0, 4.1, 4.2, 4.2, 4.3, 4.4, 4.4, 4.5, 4.6, 4.6, 4.7],
    iconColor: '#00D4AA',
    trend: 'up',
  },
  {
    id: 'service-level',
    title: 'Service Level',
    value: '96.8',
    delta: '+1.2%',
    deltaLabel: 'vs last month',
    suffix: '%',
    sparklineData: [93.1, 93.8, 94.2, 94.5, 95.0, 95.1, 95.4, 95.8, 96.0, 96.3, 96.5, 96.8],
    iconColor: '#10B981',
    trend: 'up',
  },
  {
    id: 'forecast-accuracy',
    title: 'Forecast Accuracy',
    value: '94.2',
    delta: '+2.1%',
    deltaLabel: 'vs last month',
    suffix: '%',
    sparklineData: [88.5, 89.2, 90.0, 90.8, 91.2, 91.9, 92.4, 92.8, 93.1, 93.5, 93.9, 94.2],
    iconColor: '#3B8EE8',
    trend: 'up',
  },
  {
    id: 'procurement-cost',
    title: 'Procurement Cost',
    value: '124.6',
    delta: '-3.4%',
    deltaLabel: 'vs last month',
    prefix: '₹',
    suffix: 'Cr',
    sparklineData: [138.4, 136.2, 134.8, 133.1, 131.5, 130.2, 129.4, 128.7, 127.5, 126.8, 125.4, 124.6],
    iconColor: '#F59E0B',
    trend: 'down',
  },
  {
    id: 'active-pos',
    title: 'Active POs',
    value: '247',
    delta: '+12',
    deltaLabel: 'vs last week',
    sparklineData: [198, 205, 211, 218, 220, 225, 229, 233, 237, 241, 244, 247],
    iconColor: '#00D4AA',
    trend: 'up',
  },
  {
    id: 'supplier-score',
    title: 'Supplier Score',
    value: '87.4',
    delta: '+2.3',
    deltaLabel: 'pts vs last quarter',
    sparklineData: [81.2, 82.0, 82.8, 83.4, 84.0, 84.5, 85.1, 85.8, 86.2, 86.7, 87.0, 87.4],
    iconColor: '#10B981',
    trend: 'up',
  },
  {
    id: 'carbon-score',
    title: 'Carbon Score',
    value: '72.1',
    delta: '-1.8%',
    deltaLabel: 'vs last month',
    sparklineData: [79.2, 78.4, 77.8, 77.2, 76.5, 76.0, 75.4, 74.8, 74.1, 73.5, 72.8, 72.1],
    iconColor: '#00D4AA',
    trend: 'down',
  },
  {
    id: 'ai-decisions-today',
    title: 'AI Decisions Today',
    value: '1,284',
    delta: '+342',
    deltaLabel: 'vs yesterday',
    sparklineData: [820, 870, 940, 980, 1020, 1080, 1120, 1160, 1190, 1220, 1250, 1284],
    iconColor: '#3B8EE8',
    trend: 'up',
  },
  {
    id: 'ai-savings',
    title: 'AI Savings',
    value: '18.7',
    delta: '+5.6%',
    deltaLabel: 'vs last month',
    prefix: '₹',
    suffix: 'Cr',
    sparklineData: [12.4, 13.1, 13.8, 14.5, 15.0, 15.6, 16.2, 16.8, 17.2, 17.7, 18.2, 18.7],
    iconColor: '#10B981',
    trend: 'up',
  },
  {
    id: 'pending-approvals',
    title: 'Pending Approvals',
    value: '23',
    delta: '-5',
    deltaLabel: 'vs yesterday',
    sparklineData: [45, 42, 38, 35, 32, 30, 28, 30, 27, 25, 25, 23],
    iconColor: '#F59E0B',
    trend: 'down',
  },
  {
    id: 'stockout-risk',
    title: 'Stockout Risk',
    value: '3.2',
    delta: '-0.8%',
    deltaLabel: 'vs last week',
    suffix: '%',
    sparklineData: [6.8, 6.2, 5.8, 5.4, 5.0, 4.6, 4.2, 4.0, 3.8, 3.6, 3.4, 3.2],
    iconColor: '#EF4444',
    trend: 'down',
  },
]
