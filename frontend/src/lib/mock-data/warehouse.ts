export const warehouseRacks = Array.from({ length: 60 }).map((_, i) => ({
  id: `Rack-${Math.floor(i/10)}-${i%10}`,
  row: Math.floor(i / 10),
  col: i % 10,
  zone: i < 15 ? 'A' : i < 30 ? 'B' : i < 45 ? 'C' : 'D',
  status: Math.random() > 0.8 ? 'empty' : Math.random() > 0.2 ? 'occupied' : Math.random() > 0.5 ? 'low' : 'critical',
  occupancy: Math.floor(Math.random() * 100),
  material: 'Steel TMT'
}));

export const warehouseZones = [
  { id: 'Z-A', name: 'Receiving', occupancy: 45, capacity: 2000, skus: 120 },
  { id: 'Z-B', name: 'Storage A', occupancy: 87, capacity: 14200, skus: 312 },
  { id: 'Z-C', name: 'Storage B', occupancy: 79, capacity: 11800, skus: 288 },
  { id: 'Z-D', name: 'Dispatch', occupancy: 62, capacity: 3000, skus: 84 }
];

export const warehouseKPIs = {
  totalCapacity: 25000,
  usedCapacity: 20600,
  utilization: 82.4,
  totalSKUs: 847,
  pendingTransfers: 12
};
