// ─── Risk Mock Data ─────────────────────────────────────────────────────────

export type RiskCategory = 'Supplier' | 'Weather' | 'Market' | 'Operational' | 'Geopolitical'
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM'

export interface RiskItem {
  id: string
  category: RiskCategory
  name: string
  probability: number
  impact: number
  severity: RiskSeverity
  description: string
  mitigation: string
}

export interface CriticalAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  category: RiskCategory
  time: string
  aiReasoning: string
}

export const riskItems: RiskItem[] = [
  { id: 'RSK-001', category: 'Supplier', name: 'SAIL Supply Disruption', probability: 0.72, impact: 0.85, severity: 'critical', description: 'SAIL Bhilai has reported labor unrest with 3 day rolling strikes. 4 active POs worth ₹10.5Cr at risk.', mitigation: 'Activate alternate sourcing from Tata Steel and Jindal. Increase safety stock by 20%.' },
  { id: 'RSK-002', category: 'Weather', name: 'Early Monsoon Road Blockage', probability: 0.81, impact: 0.74, severity: 'critical', description: 'IMD Red Alert for coastal Maharashtra and Karnataka. NH-48 flood risk may block logistics corridor for 3-5 days.', mitigation: 'Reroute via NH-66 inland corridor. Pre-position stock at Pune hub before June 22.' },
  { id: 'RSK-003', category: 'Market', name: 'Steel Price Spike >5%', probability: 0.64, impact: 0.68, severity: 'high', description: 'China tariff changes and domestic demand surge creating upward price pressure. 30-day futures signal 5-8% increase.', mitigation: 'Forward buy 60-day requirement at current prices. Lock commodity hedging contracts.' },
  { id: 'RSK-004', category: 'Operational', name: 'River Sand Zero Stock', probability: 0.97, impact: 0.90, severity: 'critical', description: 'Current stock is zero. 4 projects have sand in their critical path. No approved PO exists.', mitigation: 'Issue emergency PO immediately. CFO approval threshold required. Contact 3 emergency vendors.' },
  { id: 'RSK-005', category: 'Geopolitical', name: 'Copper LME Volatility', probability: 0.55, impact: 0.62, severity: 'high', description: 'Chile copper mine strike threat. LME copper could swing ±8% in next 30 days. Affects ₹28Cr copper portfolio.', mitigation: 'Hedge 40% of next quarter requirement via commodity futures. Diversify to Indian producers.' },
  { id: 'RSK-006', category: 'Supplier', name: 'Polyplex Corp Reliability Risk', probability: 0.78, impact: 0.48, severity: 'high', description: 'Polyplex has 5 consecutive late deliveries. On-time rate dropped from 82% to 64% in 90 days. Quality complaints rising.', mitigation: 'Issue supplier performance notice. Develop Supreme Industries as primary PVC vendor.' },
  { id: 'RSK-007', category: 'Weather', name: 'Cyclone Alert — Odisha Coast', probability: 0.42, impact: 0.80, severity: 'high', description: 'IMD tracking BOB depression likely to intensify into cyclone. Jamshedpur supply chain and port logistics at risk.', mitigation: 'Advance shipments from Jamshedpur by 72 hours. Stock buffer at Kolkata depot.' },
  { id: 'RSK-008', category: 'Market', name: 'Diesel Price Escalation', probability: 0.48, impact: 0.45, severity: 'medium', description: 'OPEC production cuts and INR depreciation signal 4-6% diesel price increase in Q3. Logistics cost impact estimated ₹2.8Cr.', mitigation: 'Procure bulk diesel contracts at current rate. Optimize transport routes to reduce km.' },
  { id: 'RSK-009', category: 'Operational', name: 'Mumbai Warehouse Overcapacity', probability: 0.88, impact: 0.38, severity: 'medium', description: 'Mumbai hub at 84% occupancy. Incoming POs will breach 95% threshold by June 28. Risk of inbound rejection.', mitigation: 'Transfer PVC and plywood excess to Hyderabad hub. Delay non-critical incoming shipments.' },
  { id: 'RSK-010', category: 'Supplier', name: 'Greenply Contract Termination Impact', probability: 0.92, impact: 0.30, severity: 'medium', description: 'Greenply blacklisted. Single active wood supplier now. Resilience gap for plywood category.', mitigation: 'Onboard 2 new wood suppliers: Century Ply and Kitply. Fast-track vendor qualification.' },
  { id: 'RSK-011', category: 'Geopolitical', name: 'Import Duty Change — Aluminum', probability: 0.35, impact: 0.70, severity: 'high', description: 'Budget session may introduce anti-dumping duty on imported aluminum scrap. Cost increase of 8-12% possible.', mitigation: 'Increase domestic procurement from Hindalco. Reduce reliance on imported scrap.' },
  { id: 'RSK-012', category: 'Market', name: 'Cement Price Correction', probability: 0.38, impact: 0.32, severity: 'medium', description: 'Cement companies signaling 5-8% price increase post-monsoon. Pre-monsoon buying window open.', mitigation: 'Accelerate cement procurement before July 1st monsoon price revision.' },
  { id: 'RSK-013', category: 'Operational', name: 'Forecast Model Drift', probability: 0.62, impact: 0.55, severity: 'high', description: 'MAPE for cement category degraded from 4.2% to 8.8% in 30 days. Model may be overfitting seasonal pattern.', mitigation: 'Trigger MLOps retraining pipeline. Add 2025 data to training set. Manual review pending.' },
  { id: 'RSK-014', category: 'Supplier', name: 'HPCL Supply Zone Restriction', probability: 0.22, impact: 0.65, severity: 'medium', description: 'HPCL may restrict supply to Zone-C states (MP, CG) due to tanker shortage. 38% of sites depend on HPCL diesel.', mitigation: 'Pre-position diesel at all Zone-C sites. Onboard BPCL as backup for Zone-C coverage.' },
  { id: 'RSK-015', category: 'Weather', name: 'Heatwave Supply Chain Stress', probability: 0.70, impact: 0.42, severity: 'medium', description: 'Rajasthan and UP experiencing 45°C+ heatwave. Cement hydration risk at sites. Driver safety protocols may reduce truck hours.', mitigation: 'Adjust delivery windows to 5AM-10AM. Use insulated tankers for cement transport.' },
  { id: 'RSK-016', category: 'Geopolitical', name: 'Iran-Gulf Tension Impact on Crude', probability: 0.30, impact: 0.58, severity: 'medium', description: 'Strait of Hormuz tension affecting global crude sentiment. Brent above $84 → diesel above ₹92/L possible.', mitigation: 'Hedge next 90-day diesel requirement. Lock fuel contracts before Q3 budget cycle.' },
  { id: 'RSK-017', category: 'Market', name: 'INR Depreciation Risk', probability: 0.45, impact: 0.50, severity: 'medium', description: 'INR at ₹83.4/$. Further depreciation to ₹85 would increase import costs by 1.9%. Copper and Aluminum imports affected.', mitigation: 'Forward forex contracts for Q3 import payments. Increase domestic sourcing share.' },
  { id: 'RSK-018', category: 'Operational', name: 'ERP Sync Failure — Tally', probability: 0.90, impact: 0.28, severity: 'medium', description: 'Tally Prime ERP last synced 11 hours ago. 2 warehouse sites report inventory discrepancies of 3-5%.', mitigation: 'Manual count for affected SKUs. IT ticket raised. Tally connector restart scheduled.' },
  { id: 'RSK-019', category: 'Supplier', name: 'ACC Cement Logistics Strike', probability: 0.35, impact: 0.45, severity: 'medium', description: 'ACC distribution network workers union may call 48-hour strike from June 22. 3 in-transit POs affected.', mitigation: 'Source emergency quantities from Ultratech. Build 7-day cement buffer before June 21.' },
  { id: 'RSK-020', category: 'Weather', name: 'Flooding Risk — Bihar Sites', probability: 0.55, impact: 0.36, severity: 'medium', description: 'Kosi river basin flooding risk for 2 active project sites. Stored inventory at risk. ₹8.4Cr material exposure.', mitigation: 'Elevate storage platforms at affected sites. Pre-arrange emergency transport for critical materials.' },
]

export const overallRiskScore: number = 67

export const criticalAlerts: CriticalAlert[] = [
  {
    id: 'CRIT-001',
    severity: 'CRITICAL',
    title: 'River Sand Stock Zero — 4 Projects at Risk',
    description: 'Zero inventory detected for River Sand Grade 2. Projects KRN-042, BNG-018, HYD-091, MUM-007 have sand in their critical path. Estimated project delay cost: ₹84 Crore.',
    category: 'Operational',
    time: '2025-06-19T06:00:00Z',
    aiReasoning: 'Stock depletion confirmed by 3 warehouse IoT sensors. Cross-referenced with 4 project schedules. Sand dependency detected in CPM network nodes due in the next 8 days. Emergency PO required within 24 hours to prevent critical path slippage.',
  },
  {
    id: 'CRIT-002',
    severity: 'CRITICAL',
    title: 'SAIL Strike — ₹10.5Cr PO Portfolio at Risk',
    description: 'Labor unrest at SAIL Bhilai has triggered rolling 3-day strikes. POs PO/2025/06/007 and PO/2025/05/039 total ₹10.5Cr and are now delayed 5+ days.',
    category: 'Supplier',
    time: '2025-06-19T07:30:00Z',
    aiReasoning: 'Supplier news feed analysis detected 4 strike-related articles. SAIL delivery portal shows "Force Majeure" status on 2 active POs. Alternate sourcing capacity identified at Tata Steel (900MT available) and Jindal Steel (600MT available).',
  },
  {
    id: 'CRIT-003',
    severity: 'CRITICAL',
    title: 'Monsoon Logistics Corridor Blocked — NH-48',
    description: 'IMD Red Alert for coastal Maharashtra. NH-48 flooding risk will block primary Mumbai-Bangalore logistics corridor for 3-5 days starting June 22.',
    category: 'Weather',
    time: '2025-06-18T20:00:00Z',
    aiReasoning: 'IMD API alert correlated with NH-48 route dependency analysis for 6 active shipments. SHP-001, SHP-003, SHP-009 are in transit on this corridor. Rerouting via NH-66 adds 18 hours but avoids 3-5 day blockage risk.',
  },
  {
    id: 'CRIT-004',
    severity: 'HIGH',
    title: 'Mumbai Warehouse Approaching Capacity Limit',
    description: 'Mumbai Central Hub is at 84% occupancy. 3 inbound shipments due by June 24 will push utilization to 97%. Inbound rejection risk if not resolved.',
    category: 'Operational',
    time: '2025-06-19T05:00:00Z',
    aiReasoning: 'Warehouse IoT occupancy sensor trending analysis projects 97.2% by June 24 based on confirmed inbound POs. Calculated optimal transfer: 3400 units PVC Conduit (WH-002) and 2200 sheets Plywood (WH-005) reduces WH-001 to 76%.',
  },
  {
    id: 'CRIT-005',
    severity: 'HIGH',
    title: 'Polyplex Corp SLA Breach — 5th Consecutive Delay',
    description: 'Polyplex Corp has failed to meet delivery SLA for the 5th consecutive order. On-time delivery rate dropped to 64.2%. Formal performance notice required.',
    category: 'Supplier',
    time: '2025-06-18T15:00:00Z',
    aiReasoning: 'AI supplier scoring model detects SLA breach pattern using delivery timestamp data from last 90 days. Contract terms allow service credit of ₹4.2L based on 5 breach incidents. Alternate vendor Supreme Industries has 83.8% score and available capacity.',
  },
]
