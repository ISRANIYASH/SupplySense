// ─── Logistics Mock Data ────────────────────────────────────────────────────

export type ShipmentStatus = 'in_transit' | 'delayed' | 'delivered' | 'at_risk'

export interface Shipment {
  id: string
  poNumber: string
  supplier: string
  origin: string
  destination: string
  status: ShipmentStatus
  progress: number
  eta: string
  daysDelay: number
  material: string
  qty: number
  lat: number
  lng: number
}

export interface LogisticsKPIs {
  avgTransitTime: number
  delayRisk: number
  fuelCost: string
  activeShipments: number
}

export interface DeliveryTrendPoint {
  month: string
  onTime: number
  delayed: number
}

export interface WarehouseLocation {
  id: string
  name: string
  lat: number
  lng: number
  state: string
  occupancy: number
}

export const shipments: Shipment[] = [
  { id: 'SHP-001', poNumber: 'PO/2025/06/001', supplier: 'Tata Steel Ltd', origin: 'Jamshedpur', destination: 'Mumbai', status: 'in_transit', progress: 68, eta: '2025-06-25', daysDelay: 0, material: 'TMT Steel Bars 12mm', qty: 500, lat: 21.8, lng: 82.4 },
  { id: 'SHP-002', poNumber: 'PO/2025/06/002', supplier: 'ACC Cement Ltd', origin: 'Mumbai', destination: 'Delhi', status: 'delayed', progress: 42, eta: '2025-06-22', daysDelay: 3, material: 'OPC Cement 53 Grade', qty: 1500, lat: 23.1, lng: 77.8 },
  { id: 'SHP-003', poNumber: 'PO/2025/06/005', supplier: 'HPCL', origin: 'Navi Mumbai', destination: 'Pune', status: 'in_transit', progress: 82, eta: '2025-06-20', daysDelay: 0, material: 'Diesel HSD', qty: 50000, lat: 18.8, lng: 73.2 },
  { id: 'SHP-004', poNumber: 'PO/2025/06/008', supplier: 'Finolex Cables', origin: 'Pune', destination: 'Hyderabad', status: 'at_risk', progress: 31, eta: '2025-06-30', daysDelay: 2, material: 'Copper Cable 16mm²', qty: 500, lat: 17.2, lng: 76.8 },
  { id: 'SHP-005', poNumber: 'PO/2025/06/010', supplier: 'Ashirvad Pipes', origin: 'Bangalore', destination: 'Chennai', status: 'in_transit', progress: 55, eta: '2025-06-24', daysDelay: 0, material: 'HDPE Pipes 110mm', qty: 1200, lat: 13.8, lng: 78.4 },
  { id: 'SHP-006', poNumber: 'PO/2025/06/004', supplier: 'Sterlite Technologies', origin: 'Silvassa', destination: 'Surat', status: 'delivered', progress: 100, eta: '2025-06-15', daysDelay: 0, material: 'Copper Wire 6mm', qty: 80, lat: 21.2, lng: 72.8 },
  { id: 'SHP-007', poNumber: 'PO/2025/06/009', supplier: 'Indian Oil Corp', origin: 'Mathura', destination: 'Agra', status: 'delivered', progress: 100, eta: '2025-05-28', daysDelay: 1, material: 'Bitumen VG-30', qty: 200, lat: 27.2, lng: 77.9 },
  { id: 'SHP-008', poNumber: 'PO/2025/06/007', supplier: 'SAIL', origin: 'Bhilai', destination: 'Nagpur', status: 'at_risk', progress: 22, eta: '2025-07-05', daysDelay: 5, material: 'MS Plates 12mm', qty: 300, lat: 21.0, lng: 79.8 },
  { id: 'SHP-009', poNumber: 'PO/2025/06/006', supplier: 'Ultratech Cement', origin: 'Ahmedabad', destination: 'Rajkot', status: 'in_transit', progress: 74, eta: '2025-06-28', daysDelay: 0, material: 'PSC Cement 43 Grade', qty: 800, lat: 22.4, lng: 71.8 },
  { id: 'SHP-010', poNumber: 'PO/2025/06/013', supplier: 'Voltas Ltd', origin: 'Ahmedabad', destination: 'Vadodara', status: 'in_transit', progress: 61, eta: '2025-07-01', daysDelay: 0, material: 'Angle Steel 50x50', qty: 150, lat: 22.6, lng: 73.0 },
  { id: 'SHP-011', poNumber: 'PO/2025/06/011', supplier: 'Tata Steel Ltd', origin: 'Jamshedpur', destination: 'Kolkata', status: 'in_transit', progress: 45, eta: '2025-07-08', daysDelay: 0, material: 'TMT Steel Bars 16mm', qty: 400, lat: 23.8, lng: 86.2 },
  { id: 'SHP-012', poNumber: 'PO/2025/06/018', supplier: 'Birla Copper', origin: 'Taloja', destination: 'Nashik', status: 'delivered', progress: 100, eta: '2025-06-10', daysDelay: 0, material: 'Copper Rod 8mm', qty: 40, lat: 19.9, lng: 73.8 },
  { id: 'SHP-013', poNumber: 'PO/2025/06/019', supplier: 'BPCL', origin: 'Kochi', destination: 'Coimbatore', status: 'delayed', progress: 38, eta: '2025-06-26', daysDelay: 2, material: 'Diesel HSD', qty: 30000, lat: 10.8, lng: 77.2 },
  { id: 'SHP-014', poNumber: 'PO/2025/06/015', supplier: 'Supreme Industries', origin: 'Pune', destination: 'Bhopal', status: 'in_transit', progress: 72, eta: '2025-06-21', daysDelay: 0, material: 'PVC Conduit 25mm', qty: 5000, lat: 20.8, lng: 75.6 },
  { id: 'SHP-015', poNumber: 'PO/2025/06/017', supplier: 'Jindal Steel', origin: 'Raigarh', destination: 'Raipur', status: 'in_transit', progress: 88, eta: '2025-06-29', daysDelay: 0, material: 'Chain Link Fencing 10m', qty: 300, lat: 21.9, lng: 82.8 },
]

export const logisticsKPIs: LogisticsKPIs = {
  avgTransitTime: 8.4,
  delayRisk: 18.6,
  fuelCost: '₹4.48 Cr',
  activeShipments: 10,
}

export const deliveryTrend: DeliveryTrendPoint[] = [
  { month: 'Jul 24', onTime: 82, delayed: 18 },
  { month: 'Aug 24', onTime: 84, delayed: 16 },
  { month: 'Sep 24', onTime: 80, delayed: 20 },
  { month: 'Oct 24', onTime: 86, delayed: 14 },
  { month: 'Nov 24', onTime: 88, delayed: 12 },
  { month: 'Dec 24', onTime: 85, delayed: 15 },
  { month: 'Jan 25', onTime: 87, delayed: 13 },
  { month: 'Feb 25', onTime: 89, delayed: 11 },
  { month: 'Mar 25', onTime: 91, delayed: 9 },
  { month: 'Apr 25', onTime: 90, delayed: 10 },
  { month: 'May 25', onTime: 92, delayed: 8 },
  { month: 'Jun 25', onTime: 91, delayed: 9 },
]

export const warehouseLocations: WarehouseLocation[] = [
  { id: 'WH-001', name: 'Mumbai Central Hub', lat: 19.076, lng: 72.877, state: 'Maharashtra', occupancy: 84 },
  { id: 'WH-002', name: 'Delhi NCR Depot', lat: 28.704, lng: 77.102, state: 'Delhi', occupancy: 72 },
  { id: 'WH-003', name: 'Bangalore South WH', lat: 12.971, lng: 77.594, state: 'Karnataka', occupancy: 61 },
  { id: 'WH-004', name: 'Kolkata East WH', lat: 22.572, lng: 88.363, state: 'West Bengal', occupancy: 55 },
  { id: 'WH-005', name: 'Hyderabad Hub', lat: 17.385, lng: 78.487, state: 'Telangana', occupancy: 78 },
]
