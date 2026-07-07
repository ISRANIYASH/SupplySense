export const alerts = [
  { id: 'ALT-101', type: 'Stock Critical Low', severity: 'CRITICAL', title: 'Stock Critical Low', description: 'Steel TMT <10% safety stock', time: '15 min ago', read: false, resolved: false, category: 'Stock' },
  { id: 'ALT-102', type: 'Cyclone Alert', severity: 'CRITICAL', title: 'Cyclone Alert', description: '3 supplier sites threatened', time: '1h ago', read: false, resolved: false, category: 'Weather' },
  { id: 'ALT-103', type: 'Demand Spike', severity: 'CRITICAL', title: 'Demand Spike', description: 'Steel +45% in 48h', time: '2h ago', read: false, resolved: false, category: 'Demand' },
  { id: 'ALT-104', type: 'Supplier Delay', severity: 'HIGH', title: 'Supplier Delay', description: 'Tata Steel 4-day delay', time: '3h ago', read: false, resolved: false, category: 'Supplier' },
  { id: 'ALT-105', type: 'Price Spike', severity: 'HIGH', title: 'Price Spike', description: 'Copper +8.4% today', time: '4h ago', read: false, resolved: false, category: 'Price' },
  { id: 'ALT-106', type: 'Model Drift', severity: 'HIGH', title: 'Model Drift', description: 'MAPE exceeded 7% threshold', time: '5h ago', read: true, resolved: false, category: 'Model' },
  { id: 'ALT-107', type: 'PO Pending', severity: 'HIGH', title: 'PO Pending', description: '5 POs awaiting approval >48h', time: '6h ago', read: false, resolved: false, category: 'PO' },
  { id: 'ALT-108', type: 'Budget Overrun', severity: 'HIGH', title: 'Budget Overrun', description: 'Q2 at 94% budget with 12 days left', time: '8h ago', read: false, resolved: false, category: 'Budget' },
  { id: 'ALT-109', type: 'Low Stock Warning', severity: 'MEDIUM', title: 'Low Stock Warning', description: 'Cement at 35%', time: '12h ago', read: true, resolved: false, category: 'Stock' },
  { id: 'ALT-110', type: 'Forecast Anomaly', severity: 'MEDIUM', title: 'Forecast Anomaly', description: 'Unusual demand pattern', time: '1d ago', read: true, resolved: false, category: 'Demand' }
];

export const alertThresholds = {
  'Steel TMT': { stockLow: 20, demandSpike: 30, priceChange: 10 },
  'Cement': { stockLow: 25, demandSpike: 25, priceChange: 15 }
};
