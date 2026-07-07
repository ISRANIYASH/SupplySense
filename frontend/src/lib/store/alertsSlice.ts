import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success'
export type AlertCategory = 'demand' | 'inventory' | 'supplier' | 'logistics' | 'system' | 'ai' | 'procurement'

export interface SystemAlert {
  id: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  message: string
  timestamp: string
  acknowledged: boolean
  source: string
  relatedEntity?: string
  actionRequired?: boolean
  actionUrl?: string
}

interface AlertsState {
  systemAlerts: SystemAlert[]
  aiAlerts: SystemAlert[]
  criticalCount: number
  warningCount: number
}

const generateId = () => `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const mockAlerts: SystemAlert[] = [
  {
    id: generateId(),
    severity: 'warning',
    category: 'demand',
    title: 'Demand Surge Detected',
    message: 'Electronics SKU-4421 demand increased +34% WoW. Recommend increasing safety stock.',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    acknowledged: false,
    source: 'Anomaly Detector Agent',
    relatedEntity: 'SKU-4421',
    actionRequired: true,
    actionUrl: '/inventory',
  },
  {
    id: generateId(),
    severity: 'critical',
    category: 'supplier',
    title: 'Supplier Risk Elevated',
    message: 'Foxconn Ltd risk score elevated to 78/100 due to financial instability indicators.',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    acknowledged: false,
    source: 'Risk Monitor Agent',
    relatedEntity: 'Foxconn Ltd',
    actionRequired: true,
    actionUrl: '/suppliers',
  },
  {
    id: generateId(),
    severity: 'success',
    category: 'procurement',
    title: 'Auto-PO Generated',
    message: 'Procurement Agent auto-generated PO #PO-2024-8812 for 12,000 units of SKU-8812.',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    acknowledged: false,
    source: 'Procurement Agent',
    relatedEntity: 'PO-2024-8812',
    actionRequired: false,
  },
  {
    id: generateId(),
    severity: 'info',
    category: 'ai',
    title: 'Model Retrained',
    message: 'TFT Forecaster model retrained. MAPE improved from 5.0% to 3.8% (-1.2%).',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    acknowledged: false,
    source: 'MLOps Center',
    actionRequired: false,
  },
  {
    id: generateId(),
    severity: 'warning',
    category: 'logistics',
    title: 'Port Congestion Alert',
    message: 'Liverpool port reports 3-day backlog. 12 inbound shipments may be delayed.',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    acknowledged: false,
    source: 'Risk Monitor Agent',
    actionRequired: true,
    actionUrl: '/risk',
  },
  {
    id: generateId(),
    severity: 'warning',
    category: 'inventory',
    title: 'Low Stock Alert',
    message: '234 SKUs below reorder point. Automated recommendations generated.',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    acknowledged: true,
    source: 'Inventory Optimizer',
    actionRequired: true,
    actionUrl: '/inventory',
  },
]

const initialState: AlertsState = {
  systemAlerts: mockAlerts.slice(0, 3),
  aiAlerts: mockAlerts,
  criticalCount: mockAlerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length,
  warningCount: mockAlerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length,
}

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert(state, action: PayloadAction<Omit<SystemAlert, 'id' | 'acknowledged'>>) {
      const alert: SystemAlert = {
        ...action.payload,
        id: generateId(),
        acknowledged: false,
      }
      state.aiAlerts.unshift(alert)
      if (alert.severity === 'critical') state.criticalCount += 1
      if (alert.severity === 'warning') state.warningCount += 1
    },
    acknowledgeAlert(state, action: PayloadAction<string>) {
      const allAlerts = [...state.systemAlerts, ...state.aiAlerts]
      allAlerts.forEach((alert) => {
        if (alert.id === action.payload && !alert.acknowledged) {
          alert.acknowledged = true
          if (alert.severity === 'critical') state.criticalCount = Math.max(0, state.criticalCount - 1)
          if (alert.severity === 'warning') state.warningCount = Math.max(0, state.warningCount - 1)
        }
      })
    },
    acknowledgeAll(state) {
      state.aiAlerts.forEach((a) => { a.acknowledged = true })
      state.systemAlerts.forEach((a) => { a.acknowledged = true })
      state.criticalCount = 0
      state.warningCount = 0
    },
    setAlerts(state, action: PayloadAction<SystemAlert[]>) {
      state.aiAlerts = action.payload
      state.criticalCount = action.payload.filter((a) => a.severity === 'critical' && !a.acknowledged).length
      state.warningCount = action.payload.filter((a) => a.severity === 'warning' && !a.acknowledged).length
    },
  },
})

export const { addAlert, acknowledgeAlert, acknowledgeAll, setAlerts } = alertsSlice.actions

export const selectAiAlerts = (state: RootState) => state.alerts.aiAlerts
export const selectSystemAlerts = (state: RootState) => state.alerts.systemAlerts
export const selectCriticalCount = (state: RootState) => state.alerts.criticalCount
export const selectWarningCount = (state: RootState) => state.alerts.warningCount
export const selectUnacknowledgedAlerts = (state: RootState) =>
  state.alerts.aiAlerts.filter((a) => !a.acknowledged)

export default alertsSlice.reducer
