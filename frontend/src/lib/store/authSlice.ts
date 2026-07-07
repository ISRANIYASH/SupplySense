import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

export type Role =
  | 'super_admin'
  | 'admin'
  | 'procurement_manager'
  | 'warehouse_manager'
  | 'forecast_analyst'
  | 'viewer'
  | 'auditor'

export interface AuthUser {
  id: string
  email: string
  fullName?: string
  name?: string
  role: Role
  avatar?: string
  mfaEnabled?: boolean
  permissions?: string[]
  department?: string
  lastLogin?: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  permissions: string[]
  accessToken: string | null
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: [
    'dashboard:read', 'dashboard:write',
    'supply_map:read', 'supply_map:write',
    'inventory:read', 'inventory:write',
    'procurement:read', 'procurement:write',
    'suppliers:read', 'suppliers:write',
    'forecast:read', 'forecast:write',
    'risk:read', 'risk:write',
    'agents:read', 'agents:write', 'agents:trigger',
    'copilot:use',
    'optimization:read', 'optimization:write',
    'analytics:read', 'analytics:write',
    'mlops:read', 'mlops:write',
    'decisions:read', 'decisions:approve',
    'audit:read',
    'admin:read', 'admin:write',
    'models:delete',
    'cloud:configure',
  ],
  admin: [
    'dashboard:read', 'dashboard:write',
    'supply_map:read', 'supply_map:write',
    'inventory:read', 'inventory:write',
    'procurement:read', 'procurement:write',
    'suppliers:read', 'suppliers:write',
    'forecast:read', 'forecast:write',
    'risk:read', 'risk:write',
    'agents:read', 'agents:write', 'agents:trigger',
    'copilot:use',
    'optimization:read', 'optimization:write',
    'analytics:read', 'analytics:write',
    'mlops:read',
    'decisions:read', 'decisions:approve',
    'admin:read',
  ],
  procurement_manager: [
    'dashboard:read',
    'supply_map:read',
    'inventory:read',
    'procurement:read', 'procurement:write',
    'suppliers:read', 'suppliers:write',
    'risk:read',
    'copilot:use',
    'optimization:read',
    'analytics:read', 'analytics:write',
    'decisions:read', 'decisions:approve_po',
  ],
  warehouse_manager: [
    'dashboard:read',
    'supply_map:read',
    'inventory:read', 'inventory:write',
    'risk:read',
    'copilot:use',
    'optimization:read',
    'analytics:read',
    'decisions:read', 'decisions:approve_inventory',
  ],
  forecast_analyst: [
    'dashboard:read',
    'supply_map:read',
    'inventory:read',
    'procurement:read',
    'suppliers:read',
    'forecast:read', 'forecast:write',
    'risk:read', 'risk:write',
    'agents:read',
    'copilot:use',
    'optimization:read', 'optimization:write',
    'analytics:read', 'analytics:write',
    'mlops:read', 'mlops:write',
    'decisions:read',
  ],
  viewer: [
    'dashboard:read',
    'supply_map:read',
    'inventory:read',
    'procurement:read',
    'suppliers:read',
    'forecast:read',
    'risk:read',
    'agents:read',
    'copilot:use',
    'optimization:read',
    'analytics:read',
    'mlops:read',
    'decisions:read',
  ],
  auditor: [
    'dashboard:read',
    'supply_map:read',
    'inventory:read',
    'procurement:read',
    'suppliers:read',
    'forecast:read',
    'risk:read',
    'decisions:read',
    'audit:read',
  ],
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  permissions: [],
  accessToken: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      state.isAuthenticated = true
      state.permissions = ROLE_PERMISSIONS[action.payload.role] || []
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
    },
    logout(state) {
      state.user = null
      state.isAuthenticated = false
      state.permissions = []
      state.accessToken = null
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
  },
})

export const { setUser, setAccessToken, logout, setLoading } = authSlice.actions

// Selectors
export const selectUser = (state: RootState) => state.auth.user
export const selectRole = (state: RootState) => state.auth.user?.role
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectPermissions = (state: RootState) => state.auth.permissions
export const selectHasPermission = (permission: string) => (state: RootState) =>
  state.auth.permissions.includes(permission)
export const selectIsLoading = (state: RootState) => state.auth.isLoading

export default authSlice.reducer
