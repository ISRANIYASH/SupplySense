// ─── Inventory Mock Data ────────────────────────────────────────────────────

export type ABCClass = 'A' | 'B' | 'C'
export type XYZClass = 'X' | 'Y' | 'Z'
export type ItemStatus = 'ok' | 'low' | 'dead' | 'excess'
export type AIAction = 'BUY' | 'WAIT' | 'TRANSFER' | 'REDUCE'

export interface InventoryKPIs {
  totalSKUs: number
  stockValue: string
  deadStock: string
  lowStockCount: number
  excessStock: string
  avgStockAge: number
}

export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  abcClass: ABCClass
  xyzClass: XYZClass
  currentStock: number
  safetyStock: number
  reorderPoint: number
  stockValue: number
  age: number
  status: ItemStatus
}

export interface AIRecommendation {
  id: string
  material: string
  action: AIAction
  confidence: number
  reasoning: string
  impact: string
}

export interface AgingBucket {
  label: string
  count: number
  value: number
  color: string
}

export interface OverrideLog {
  id: string
  timestamp: string
  user: string
  material: string
  aiSuggestion: string
  userAction: string
  reason: string
}

export const inventoryKPIs: InventoryKPIs = {
  totalSKUs: 2847,
  stockValue: '₹847.3 Cr',
  deadStock: '₹42.6 Cr',
  lowStockCount: 127,
  excessStock: '₹118.2 Cr',
  avgStockAge: 34,
}

export const inventoryItems: InventoryItem[] = [
  { id: 'INV-001', sku: 'STL-TMT-001', name: 'TMT Steel Bars 12mm', category: 'Steel', abcClass: 'A', xyzClass: 'X', currentStock: 4200, safetyStock: 1500, reorderPoint: 2000, stockValue: 12600000, age: 18, status: 'ok' },
  { id: 'INV-002', sku: 'CEM-OPC-001', name: 'OPC Cement 53 Grade', category: 'Cement', abcClass: 'A', xyzClass: 'X', currentStock: 320, safetyStock: 800, reorderPoint: 1000, stockValue: 1216000, age: 8, status: 'low' },
  { id: 'INV-003', sku: 'COP-WIR-006', name: 'Copper Wire 6mm', category: 'Copper', abcClass: 'A', xyzClass: 'Y', currentStock: 1850, safetyStock: 600, reorderPoint: 900, stockValue: 28527500, age: 22, status: 'ok' },
  { id: 'INV-004', sku: 'ALU-SHT-002', name: 'Aluminum Sheets 2mm', category: 'Aluminum', abcClass: 'B', xyzClass: 'Y', currentStock: 780, safetyStock: 400, reorderPoint: 600, stockValue: 8346000, age: 31, status: 'ok' },
  { id: 'INV-005', sku: 'PVC-PIP-025', name: 'PVC Conduit 25mm', category: 'Polymer', abcClass: 'C', xyzClass: 'Z', currentStock: 14200, safetyStock: 2000, reorderPoint: 3000, stockValue: 1278000, age: 87, status: 'excess' },
  { id: 'INV-006', sku: 'STL-PLT-012', name: 'MS Plates 12mm', category: 'Steel', abcClass: 'A', xyzClass: 'X', currentStock: 210, safetyStock: 500, reorderPoint: 700, stockValue: 2793000, age: 12, status: 'low' },
  { id: 'INV-007', sku: 'BIT-VG30-200', name: 'Bitumen VG-30', category: 'Bitumen', abcClass: 'B', xyzClass: 'Y', currentStock: 3400, safetyStock: 1200, reorderPoint: 1800, stockValue: 8840000, age: 45, status: 'excess' },
  { id: 'INV-008', sku: 'DSL-HSD-001', name: 'Diesel HSD', category: 'Fuel', abcClass: 'A', xyzClass: 'X', currentStock: 48000, safetyStock: 20000, reorderPoint: 30000, stockValue: 4301760, age: 3, status: 'ok' },
  { id: 'INV-009', sku: 'SND-RIV-002', name: 'River Sand Grade 2', category: 'Aggregate', abcClass: 'B', xyzClass: 'Z', currentStock: 0, safetyStock: 2000, reorderPoint: 3000, stockValue: 0, age: 120, status: 'dead' },
  { id: 'INV-010', sku: 'HDP-PIP-110', name: 'HDPE Pipes 110mm', category: 'Polymer', abcClass: 'B', xyzClass: 'Y', currentStock: 920, safetyStock: 300, reorderPoint: 500, stockValue: 3910400, age: 28, status: 'ok' },
  { id: 'INV-011', sku: 'STL-TMT-016', name: 'TMT Steel Bars 16mm', category: 'Steel', abcClass: 'A', xyzClass: 'X', currentStock: 3100, safetyStock: 1200, reorderPoint: 1800, stockValue: 11470000, age: 14, status: 'ok' },
  { id: 'INV-012', sku: 'CEM-PSC-001', name: 'PSC Cement 43 Grade', category: 'Cement', abcClass: 'B', xyzClass: 'Y', currentStock: 4800, safetyStock: 1000, reorderPoint: 1500, stockValue: 16320000, age: 58, status: 'excess' },
  { id: 'INV-013', sku: 'COP-CAB-016', name: 'Copper Cable 16mm²', category: 'Copper', abcClass: 'A', xyzClass: 'X', currentStock: 680, safetyStock: 400, reorderPoint: 600, stockValue: 14076000, age: 19, status: 'ok' },
  { id: 'INV-014', sku: 'ALU-ROD-010', name: 'Aluminum Rod 10mm', category: 'Aluminum', abcClass: 'C', xyzClass: 'Z', currentStock: 120, safetyStock: 100, reorderPoint: 150, stockValue: 514800, age: 145, status: 'dead' },
  { id: 'INV-015', sku: 'GLS-WOL-050', name: 'Glass Wool Insulation', category: 'Insulation', abcClass: 'C', xyzClass: 'Z', currentStock: 280, safetyStock: 150, reorderPoint: 200, stockValue: 896000, age: 92, status: 'dead' },
  { id: 'INV-016', sku: 'STL-ANL-001', name: 'Angle Steel 50x50', category: 'Steel', abcClass: 'B', xyzClass: 'Y', currentStock: 1650, safetyStock: 600, reorderPoint: 900, stockValue: 3795000, age: 27, status: 'ok' },
  { id: 'INV-017', sku: 'RBR-GSK-010', name: 'Rubber Gaskets 10"', category: 'Seals', abcClass: 'C', xyzClass: 'Z', currentStock: 0, safetyStock: 200, reorderPoint: 300, stockValue: 0, age: 0, status: 'low' },
  { id: 'INV-018', sku: 'PLY-BWR-018', name: 'Plywood BWR 18mm', category: 'Wood', abcClass: 'B', xyzClass: 'Y', currentStock: 2200, safetyStock: 500, reorderPoint: 750, stockValue: 4180000, age: 41, status: 'excess' },
  { id: 'INV-019', sku: 'PNT-EXT-020', name: 'Exterior Paint 20L', category: 'Paints', abcClass: 'C', xyzClass: 'Z', currentStock: 380, safetyStock: 200, reorderPoint: 280, stockValue: 1102000, age: 68, status: 'ok' },
  { id: 'INV-020', sku: 'STL-CHN-010', name: 'Chain Link Fencing 10m', category: 'Steel', abcClass: 'C', xyzClass: 'Z', currentStock: 1800, safetyStock: 300, reorderPoint: 500, stockValue: 2790000, age: 103, status: 'excess' },
]

export const aiRecommendations: AIRecommendation[] = [
  {
    id: 'REC-001',
    material: 'OPC Cement 53 Grade',
    action: 'BUY',
    confidence: 0.94,
    reasoning: 'Stock at 40% of safety stock level. 3 active site orders expected next week. Lead time 7 days. Monsoon season historically drives 28% demand spike. Pre-monsoon buying recommended.',
    impact: 'Prevents ₹4.2Cr stockout cost. Service level maintained at 97%.',
  },
  {
    id: 'REC-002',
    material: 'PVC Conduit 25mm',
    action: 'REDUCE',
    confidence: 0.88,
    reasoning: 'Current stock is 473% above reorder point. Last 90 days consumption: 480 units. At current rate, 887 days of stock remaining. Tied-up capital opportunity cost: ₹2.1L/month.',
    impact: 'Frees ₹8.2L working capital. Reduces storage cost by ₹45K/month.',
  },
  {
    id: 'REC-003',
    material: 'MS Plates 12mm',
    action: 'BUY',
    confidence: 0.91,
    reasoning: 'Critical shortage risk. 3 major fabrication projects starting next month. Supplier lead time 14 days. Steel prices forecast to rise 4.2% next quarter based on global commodity signals.',
    impact: 'Avoids project delay cost of ₹12Cr. Buy now saves ₹18L vs next quarter pricing.',
  },
  {
    id: 'REC-004',
    material: 'Bitumen VG-30',
    action: 'WAIT',
    confidence: 0.82,
    reasoning: 'Current stock sufficient for 68 days. Crude oil futures suggest 6-8% price decline in next 30 days. Monsoon pause in road works reduces near-term demand.',
    impact: 'Waiting saves estimated ₹12.4L on next procurement cycle.',
  },
  {
    id: 'REC-005',
    material: 'Copper Wire 6mm',
    action: 'TRANSFER',
    confidence: 0.86,
    reasoning: 'Rajasthan warehouse has 2,400 units excess while Gujarat site reports shortage. Inter-warehouse transfer eliminates fresh procurement need. Transfer cost ₹2.8L vs new purchase ₹38.4L.',
    impact: 'Net saving of ₹35.6L. Zero new procurement required for Q3 Gujarat demand.',
  },
  {
    id: 'REC-006',
    material: 'River Sand Grade 2',
    action: 'BUY',
    confidence: 0.97,
    reasoning: 'Zero stock detected. 4 projects have sand dependency in their critical path. Approval needed to release emergency PO. Mining royalty seasonal availability window closes in 3 weeks.',
    impact: 'Critical path risk: projects worth ₹84Cr at risk. Immediate action required.',
  },
]

export const agingBuckets: AgingBucket[] = [
  { label: '0–30 days', count: 824, value: 312400000, color: '#10B981' },
  { label: '31–60 days', count: 1142, value: 298700000, color: '#3B8EE8' },
  { label: '61–90 days', count: 486, value: 142300000, color: '#F59E0B' },
  { label: '91–180 days', count: 284, value: 68400000, color: '#EF4444' },
  { label: '180+ days', count: 111, value: 25500000, color: '#7C3AED' },
]

export const overrideLog: OverrideLog[] = [
  { id: 'OVR-001', timestamp: '2025-06-19T09:12:00Z', user: 'Priya Sharma', material: 'TMT Steel Bars 12mm', aiSuggestion: 'WAIT', userAction: 'BUY', reason: 'Spot price lock-in opportunity from Tata Steel. Valid only today.' },
  { id: 'OVR-002', timestamp: '2025-06-18T14:30:00Z', user: 'Rahul Verma', material: 'OPC Cement 53 Grade', aiSuggestion: 'BUY 2000 MT', userAction: 'BUY 1500 MT', reason: 'Budget constraint this quarter. Partial buy approved.' },
  { id: 'OVR-003', timestamp: '2025-06-18T11:05:00Z', user: 'Anita Patel', material: 'PVC Conduit 25mm', aiSuggestion: 'REDUCE - liquidate 8000 units', userAction: 'REDUCE - liquidate 4000 units', reason: 'Partial liquidation only. Keeping buffer for Bhopal project contingency.' },
  { id: 'OVR-004', timestamp: '2025-06-17T16:42:00Z', user: 'Deepak Kumar', material: 'Bitumen VG-30', aiSuggestion: 'WAIT', userAction: 'BUY 500 MT', reason: 'State highway contract signed unexpectedly. Immediate need confirmed.' },
  { id: 'OVR-005', timestamp: '2025-06-17T10:18:00Z', user: 'Suresh Iyer', material: 'Copper Cable 16mm²', aiSuggestion: 'BUY 800 units', userAction: 'BUY 1200 units', reason: 'MCB grid expansion confirmed by client. Demand revised upward by 50%.' },
  { id: 'OVR-006', timestamp: '2025-06-16T13:55:00Z', user: 'Meera Nair', material: 'Diesel HSD', aiSuggestion: 'BUY - fill tanks', userAction: 'WAIT', reason: 'Petrol bunk deal being negotiated. Better bulk rate expected tomorrow.' },
  { id: 'OVR-007', timestamp: '2025-06-15T09:30:00Z', user: 'Rajesh Mehta', material: 'MS Plates 12mm', aiSuggestion: 'BUY 400 MT', userAction: 'BUY 400 MT', reason: 'Agreed with AI recommendation. PO raised.' },
  { id: 'OVR-008', timestamp: '2025-06-14T15:22:00Z', user: 'Kavita Singh', material: 'Aluminum Sheets 2mm', aiSuggestion: 'REDUCE - 300 units', userAction: 'WAIT', reason: 'Potential aerospace client visit next week. Keeping stock as demo inventory.' },
  { id: 'OVR-009', timestamp: '2025-06-13T11:40:00Z', user: 'Arun Gupta', material: 'River Sand Grade 2', aiSuggestion: 'BUY emergency', userAction: 'BUY emergency', reason: 'Accepted AI critical alert. Emergency PO approved by CFO.' },
  { id: 'OVR-010', timestamp: '2025-06-12T08:15:00Z', user: 'Sana Khan', material: 'Plywood BWR 18mm', aiSuggestion: 'REDUCE excess stock', userAction: 'TRANSFER to Mumbai', reason: 'Mumbai site has active use for excess stock. Transfer more economical than liquidation.' },
]
