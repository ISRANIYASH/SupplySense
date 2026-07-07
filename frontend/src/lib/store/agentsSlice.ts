import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

export type AgentStatus = 'running' | 'idle' | 'completed' | 'alert' | 'paused'

export interface AgentInfo {
  id: string
  name: string
  description: string
  status: AgentStatus
  lastAction: string
  lastActionTimestamp: string
  actionsToday: number
  accuracyRate: number
  pendingDecisions: number
  uptime: number
  modelVersion: string
}

export interface PendingDecision {
  id: string
  agentId: string
  agentName: string
  recommendation: string
  confidence: number
  timestamp: string
  context: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'approved' | 'rejected' | 'deferred'
  approver?: string
  approvedAt?: string
  rejectionReason?: string
}

interface AgentsState {
  agents: AgentInfo[]
  pendingDecisions: PendingDecision[]
  activityFeed: Array<{
    id: string
    agentId: string
    agentName: string
    action: string
    timestamp: string
    outcome: string
    color: string
  }>
  lastUpdated: string | null
}

const initialAgents: AgentInfo[] = [
  {
    id: 'demand-forecaster',
    name: 'Demand Forecaster',
    description: 'TFT-based multi-horizon demand prediction',
    status: 'running',
    lastAction: 'Retrained TFT model on 90-day window',
    lastActionTimestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    actionsToday: 47,
    accuracyRate: 96.2,
    pendingDecisions: 0,
    uptime: 99.8,
    modelVersion: 'TFT-v2.3',
  },
  {
    id: 'inventory-optimizer',
    name: 'Inventory Optimizer',
    description: 'Dynamic safety stock & reorder point optimization',
    status: 'running',
    lastAction: 'Generated 23 reorder recommendations for Warehouse A',
    lastActionTimestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    actionsToday: 23,
    accuracyRate: 94.1,
    pendingDecisions: 5,
    uptime: 99.5,
    modelVersion: 'IO-v1.8',
  },
  {
    id: 'procurement-agent',
    name: 'Procurement Agent',
    description: 'Autonomous PO generation & supplier selection',
    status: 'completed',
    lastAction: 'Auto-generated PO #PO-2024-8812 for 12,000 units',
    lastActionTimestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    actionsToday: 8,
    accuracyRate: 91.7,
    pendingDecisions: 3,
    uptime: 98.9,
    modelVersion: 'PA-v2.1',
  },
  {
    id: 'risk-monitor',
    name: 'Risk Monitor',
    description: 'Real-time supply chain risk detection & scoring',
    status: 'alert',
    lastAction: 'Elevated risk score for Foxconn Ltd (78/100)',
    lastActionTimestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    actionsToday: 156,
    accuracyRate: 89.3,
    pendingDecisions: 2,
    uptime: 99.9,
    modelVersion: 'RM-v3.1',
  },
  {
    id: 'supplier-scorer',
    name: 'Supplier Scorer',
    description: 'Multi-dimensional supplier performance evaluation',
    status: 'idle',
    lastAction: 'Scored 847 suppliers across 12 dimensions',
    lastActionTimestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    actionsToday: 3,
    accuracyRate: 93.8,
    pendingDecisions: 0,
    uptime: 97.2,
    modelVersion: 'SS-v2.0',
  },
  {
    id: 'route-optimizer',
    name: 'Route Optimizer',
    description: 'Last-mile & inter-DC shipment route optimization',
    status: 'running',
    lastAction: 'Optimized 34 delivery routes — saved 12% cost',
    lastActionTimestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    actionsToday: 34,
    accuracyRate: 92.4,
    pendingDecisions: 1,
    uptime: 98.1,
    modelVersion: 'RO-v1.5',
  },
  {
    id: 'anomaly-detector',
    name: 'Anomaly Detector',
    description: 'Statistical process control & demand anomaly detection',
    status: 'running',
    lastAction: 'Detected demand surge: Electronics SKU-4421 +34% WoW',
    lastActionTimestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    actionsToday: 89,
    accuracyRate: 97.1,
    pendingDecisions: 0,
    uptime: 99.7,
    modelVersion: 'AD-v2.4',
  },
  {
    id: 'copilot-agent',
    name: 'AI Copilot',
    description: 'GPT-4o powered natural language SC insights',
    status: 'idle',
    lastAction: 'Answered 12 user queries on inventory status',
    lastActionTimestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    actionsToday: 12,
    accuracyRate: 95.6,
    pendingDecisions: 0,
    uptime: 99.4,
    modelVersion: 'GPT-4o',
  },
]

const initialState: AgentsState = {
  agents: initialAgents,
  pendingDecisions: [],
  activityFeed: [],
  lastUpdated: null,
}

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    updateAgentStatus(
      state,
      action: PayloadAction<{ id: string; status: AgentStatus; lastAction?: string }>
    ) {
      const agent = state.agents.find((a) => a.id === action.payload.id)
      if (agent) {
        agent.status = action.payload.status
        if (action.payload.lastAction) {
          agent.lastAction = action.payload.lastAction
          agent.lastActionTimestamp = new Date().toISOString()
        }
      }
    },
    setAgents(state, action: PayloadAction<AgentInfo[]>) {
      state.agents = action.payload
      state.lastUpdated = new Date().toISOString()
    },
    addPendingDecision(state, action: PayloadAction<PendingDecision>) {
      state.pendingDecisions.unshift(action.payload)
    },
    approveDecision(
      state,
      action: PayloadAction<{ id: string; approver: string }>
    ) {
      const decision = state.pendingDecisions.find((d) => d.id === action.payload.id)
      if (decision) {
        decision.status = 'approved'
        decision.approver = action.payload.approver
        decision.approvedAt = new Date().toISOString()
      }
    },
    rejectDecision(
      state,
      action: PayloadAction<{ id: string; reason: string; approver: string }>
    ) {
      const decision = state.pendingDecisions.find((d) => d.id === action.payload.id)
      if (decision) {
        decision.status = 'rejected'
        decision.approver = action.payload.approver
        decision.rejectionReason = action.payload.reason
      }
    },
    addActivityEntry(
      state,
      action: PayloadAction<{
        agentId: string
        agentName: string
        action: string
        outcome: string
        color: string
      }>
    ) {
      state.activityFeed.unshift({
        id: `activity-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...action.payload,
      })
      if (state.activityFeed.length > 100) {
        state.activityFeed = state.activityFeed.slice(0, 100)
      }
    },
    setPendingDecisions(state, action: PayloadAction<PendingDecision[]>) {
      state.pendingDecisions = action.payload
    },
  },
})

export const {
  updateAgentStatus,
  setAgents,
  addPendingDecision,
  approveDecision,
  rejectDecision,
  addActivityEntry,
  setPendingDecisions,
} = agentsSlice.actions

export const selectAgents = (state: RootState) => state.agents.agents
export const selectPendingDecisions = (state: RootState) =>
  state.agents.pendingDecisions.filter((d) => d.status === 'pending')
export const selectActivityFeed = (state: RootState) => state.agents.activityFeed
export const selectAgentById = (id: string) => (state: RootState) =>
  state.agents.agents.find((a) => a.id === id)

export default agentsSlice.reducer
