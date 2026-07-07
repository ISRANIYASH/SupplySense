// ─── Procurement Mock Data ──────────────────────────────────────────────────

export type POStatus = 'Pending' | 'Approved' | 'InTransit' | 'Delivered' | 'Cancelled'
export type ProcurementCommodityRec = 'BUY' | 'WAIT' | 'PARTIAL' | 'HEDGE'

export interface ProcurementKPIs {
  totalPOs: number
  totalSpend: string
  aiGenerated: number
  avgLeadTime: number
  onTimeDelivery: number
  savings: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplier: string
  material: string
  qty: number
  unit: string
  status: POStatus
  eta: string
  cost: number
  aiScore: number
  category: string
}

export interface SpendCategory {
  category: string
  amount: number
  color: string
}

export interface CandlestickPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface CommodityPrice {
  id: string
  name: string
  current: number
  prev: number
  change: number
  unit: string
  recommendation: ProcurementCommodityRec
  candlestickData: CandlestickPoint[]
}

export const procurementKPIs: ProcurementKPIs = {
  totalPOs: 247,
  totalSpend: '₹124.6 Cr',
  aiGenerated: 168,
  avgLeadTime: 12.4,
  onTimeDelivery: 91.2,
  savings: '₹18.7 Cr',
}

export const purchaseOrders: PurchaseOrder[] = [
  { id: 'PO-001', poNumber: 'PO/2025/06/001', supplier: 'Tata Steel Ltd', material: 'TMT Steel Bars 12mm', qty: 500, unit: 'MT', status: 'Approved', eta: '2025-06-25', cost: 29000000, aiScore: 94, category: 'Steel' },
  { id: 'PO-002', poNumber: 'PO/2025/06/002', supplier: 'ACC Cement Ltd', material: 'OPC Cement 53 Grade', qty: 1500, unit: 'MT', status: 'InTransit', eta: '2025-06-22', cost: 9000000, aiScore: 91, category: 'Cement' },
  { id: 'PO-003', poNumber: 'PO/2025/06/003', supplier: 'Hindalco Industries', material: 'Aluminum Sheets 2mm', qty: 200, unit: 'MT', status: 'Pending', eta: '2025-07-02', cost: 4300000, aiScore: 87, category: 'Aluminum' },
  { id: 'PO-004', poNumber: 'PO/2025/06/004', supplier: 'Sterlite Technologies', material: 'Copper Wire 6mm', qty: 80, unit: 'MT', status: 'Delivered', eta: '2025-06-15', cost: 12480000, aiScore: 96, category: 'Copper' },
  { id: 'PO-005', poNumber: 'PO/2025/06/005', supplier: 'HPCL', material: 'Diesel HSD', qty: 50000, unit: 'L', status: 'InTransit', eta: '2025-06-20', cost: 4481000, aiScore: 99, category: 'Fuel' },
  { id: 'PO-006', poNumber: 'PO/2025/06/006', supplier: 'Ultratech Cement', material: 'PSC Cement 43 Grade', qty: 800, unit: 'MT', status: 'Approved', eta: '2025-06-28', cost: 4000000, aiScore: 88, category: 'Cement' },
  { id: 'PO-007', poNumber: 'PO/2025/06/007', supplier: 'SAIL', material: 'MS Plates 12mm', qty: 300, unit: 'MT', status: 'Pending', eta: '2025-07-05', cost: 10500000, aiScore: 92, category: 'Steel' },
  { id: 'PO-008', poNumber: 'PO/2025/06/008', supplier: 'Finolex Cables', material: 'Copper Cable 16mm²', qty: 500, unit: 'km', status: 'Approved', eta: '2025-06-30', cost: 8500000, aiScore: 89, category: 'Copper' },
  { id: 'PO-009', poNumber: 'PO/2025/05/042', supplier: 'Indian Oil Corp', material: 'Bitumen VG-30', qty: 200, unit: 'MT', status: 'Delivered', eta: '2025-05-28', cost: 4800000, aiScore: 85, category: 'Bitumen' },
  { id: 'PO-010', poNumber: 'PO/2025/06/010', supplier: 'Ashirvad Pipes', material: 'HDPE Pipes 110mm', qty: 1200, unit: 'Units', status: 'InTransit', eta: '2025-06-24', cost: 3600000, aiScore: 90, category: 'Polymer' },
  { id: 'PO-011', poNumber: 'PO/2025/06/011', supplier: 'Tata Steel Ltd', material: 'TMT Steel Bars 16mm', qty: 400, unit: 'MT', status: 'Pending', eta: '2025-07-08', cost: 22400000, aiScore: 93, category: 'Steel' },
  { id: 'PO-012', poNumber: 'PO/2025/06/012', supplier: 'Greenply Industries', material: 'Plywood BWR 18mm', qty: 2000, unit: 'Sheets', status: 'Cancelled', eta: '2025-06-18', cost: 1600000, aiScore: 62, category: 'Wood' },
  { id: 'PO-013', poNumber: 'PO/2025/06/013', supplier: 'Voltas Ltd', material: 'Angle Steel 50x50', qty: 150, unit: 'MT', status: 'Approved', eta: '2025-07-01', cost: 3750000, aiScore: 86, category: 'Steel' },
  { id: 'PO-014', poNumber: 'PO/2025/06/014', supplier: 'Berger Paints', material: 'Exterior Paint 20L', qty: 500, unit: 'Units', status: 'Delivered', eta: '2025-06-12', cost: 1250000, aiScore: 78, category: 'Paints' },
  { id: 'PO-015', poNumber: 'PO/2025/06/015', supplier: 'Supreme Industries', material: 'PVC Conduit 25mm', qty: 5000, unit: 'Units', status: 'InTransit', eta: '2025-06-21', cost: 450000, aiScore: 71, category: 'Polymer' },
  { id: 'PO-016', poNumber: 'PO/2025/06/016', supplier: 'Ambuja Cement', material: 'OPC Cement 53 Grade', qty: 600, unit: 'MT', status: 'Pending', eta: '2025-07-10', cost: 3600000, aiScore: 84, category: 'Cement' },
  { id: 'PO-017', poNumber: 'PO/2025/06/017', supplier: 'Jindal Steel', material: 'Chain Link Fencing 10m', qty: 300, unit: 'Rolls', status: 'Approved', eta: '2025-06-29', cost: 1650000, aiScore: 80, category: 'Steel' },
  { id: 'PO-018', poNumber: 'PO/2025/06/018', supplier: 'Birla Copper', material: 'Copper Rod 8mm', qty: 40, unit: 'MT', status: 'Delivered', eta: '2025-06-10', cost: 6240000, aiScore: 95, category: 'Copper' },
  { id: 'PO-019', poNumber: 'PO/2025/06/019', supplier: 'BPCL', material: 'Diesel HSD', qty: 30000, unit: 'L', status: 'Approved', eta: '2025-06-26', cost: 2688600, aiScore: 97, category: 'Fuel' },
  { id: 'PO-020', poNumber: 'PO/2025/06/020', supplier: 'Polyplex Corp', material: 'HDPE Bags 50kg', qty: 10000, unit: 'Units', status: 'Pending', eta: '2025-07-12', cost: 800000, aiScore: 76, category: 'Polymer' },
]

export const spendByCategory: SpendCategory[] = [
  { category: 'Steel', amount: 670000000, color: '#3B8EE8' },
  { category: 'Cement', amount: 165000000, color: '#00D4AA' },
  { category: 'Copper', amount: 198000000, color: '#F59E0B' },
  { category: 'Fuel', amount: 112000000, color: '#EF4444' },
  { category: 'Aluminum', amount: 89000000, color: '#8B5CF6' },
  { category: 'Polymer', amount: 54000000, color: '#EC4899' },
  { category: 'Bitumen', amount: 48000000, color: '#F97316' },
  { category: 'Others', amount: 110000000, color: '#64748B' },
]

function generateCandlestick(base: number, days: number): CandlestickPoint[] {
  const data: CandlestickPoint[] = []
  let price = base
  const now = new Date('2025-06-19')
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const change = (Math.random() - 0.48) * base * 0.02
    const open = price
    const close = price + change
    const high = Math.max(open, close) + Math.random() * base * 0.008
    const low = Math.min(open, close) - Math.random() * base * 0.008
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
    })
    price = close
  }
  return data
}

export const commodityPrices: CommodityPrice[] = [
  {
    id: 'CMDTY-001',
    name: 'TMT Steel (Fe500D)',
    current: 58400,
    prev: 57200,
    change: 2.1,
    unit: '₹/MT',
    recommendation: 'BUY',
    candlestickData: generateCandlestick(57200, 30),
  },
  {
    id: 'CMDTY-002',
    name: 'Copper (LME)',
    current: 782000,
    prev: 798000,
    change: -2.0,
    unit: '₹/MT',
    recommendation: 'WAIT',
    candlestickData: generateCandlestick(798000, 30),
  },
  {
    id: 'CMDTY-003',
    name: 'OPC Cement 53G',
    current: 380,
    prev: 374,
    change: 1.6,
    unit: '₹/bag',
    recommendation: 'PARTIAL',
    candlestickData: generateCandlestick(374, 30),
  },
  {
    id: 'CMDTY-004',
    name: 'Diesel HSD',
    current: 8962,
    prev: 9028,
    change: -0.73,
    unit: '₹/100L',
    recommendation: 'HEDGE',
    candlestickData: generateCandlestick(9028, 30),
  },
  {
    id: 'CMDTY-005',
    name: 'Aluminum (LME)',
    current: 214500,
    prev: 209800,
    change: 2.24,
    unit: '₹/MT',
    recommendation: 'BUY',
    candlestickData: generateCandlestick(209800, 30),
  },
]
