'use client'
import { useSelector } from 'react-redux'
import { selectPermissions } from '@/lib/store/authSlice'

// ─── Role Definitions ──────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PROCUREMENT_MANAGER: 'procurement_manager',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  FORECAST_ANALYST: 'forecast_analyst',
  VIEWER: 'viewer',
  AUDITOR: 'auditor',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// ─── Permission Definitions ────────────────────────────────────────────────
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: 'dashboard:read',
  DASHBOARD_WRITE: 'dashboard:write',
  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  // Procurement
  PROCUREMENT_READ: 'procurement:read',
  PROCUREMENT_WRITE: 'procurement:write',
  // Suppliers
  SUPPLIERS_READ: 'suppliers:read',
  SUPPLIERS_WRITE: 'suppliers:write',
  // Forecast
  FORECAST_READ: 'forecast:read',
  FORECAST_WRITE: 'forecast:write',
  // Risk
  RISK_READ: 'risk:read',
  RISK_WRITE: 'risk:write',
  // Agents
  AGENTS_READ: 'agents:read',
  AGENTS_WRITE: 'agents:write',
  AGENTS_TRIGGER: 'agents:trigger',
  // Copilot
  COPILOT_USE: 'copilot:use',
  // Optimization
  OPTIMIZATION_READ: 'optimization:read',
  OPTIMIZATION_WRITE: 'optimization:write',
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_WRITE: 'analytics:write',
  // MLOps
  MLOPS_READ: 'mlops:read',
  MLOPS_WRITE: 'mlops:write',
  // Decisions
  DECISIONS_READ: 'decisions:read',
  DECISIONS_APPROVE: 'decisions:approve',
  // Audit
  AUDIT_READ: 'audit:read',
  // Admin
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
  // Models
  MODELS_DELETE: 'models:delete',
  // Cloud
  CLOUD_CONFIGURE: 'cloud:configure',
  // Supply Map
  SUPPLY_MAP_READ: 'supply_map:read',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// ─── Role → Permission Mapping ─────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: Object.values(PERMISSIONS) as Permission[],

  admin: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.PROCUREMENT_READ,
    PERMISSIONS.PROCUREMENT_WRITE,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.SUPPLIERS_WRITE,
    PERMISSIONS.FORECAST_READ,
    PERMISSIONS.FORECAST_WRITE,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.RISK_WRITE,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.AGENTS_WRITE,
    PERMISSIONS.AGENTS_TRIGGER,
    PERMISSIONS.COPILOT_USE,
    PERMISSIONS.OPTIMIZATION_READ,
    PERMISSIONS.OPTIMIZATION_WRITE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_WRITE,
    PERMISSIONS.MLOPS_READ,
    PERMISSIONS.MLOPS_WRITE,
    PERMISSIONS.DECISIONS_READ,
    PERMISSIONS.DECISIONS_APPROVE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ADMIN_READ,
    PERMISSIONS.ADMIN_WRITE,
    PERMISSIONS.SUPPLY_MAP_READ,
  ],

  procurement_manager: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PROCUREMENT_READ,
    PERMISSIONS.PROCUREMENT_WRITE,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.SUPPLIERS_WRITE,
    PERMISSIONS.FORECAST_READ,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.COPILOT_USE,
    PERMISSIONS.OPTIMIZATION_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.DECISIONS_READ,
    PERMISSIONS.DECISIONS_APPROVE,
    PERMISSIONS.SUPPLY_MAP_READ,
  ],

  warehouse_manager: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.PROCUREMENT_READ,
    PERMISSIONS.FORECAST_READ,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.COPILOT_USE,
    PERMISSIONS.OPTIMIZATION_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.DECISIONS_READ,
    PERMISSIONS.SUPPLY_MAP_READ,
  ],

  forecast_analyst: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.FORECAST_READ,
    PERMISSIONS.FORECAST_WRITE,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.COPILOT_USE,
    PERMISSIONS.OPTIMIZATION_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_WRITE,
    PERMISSIONS.MLOPS_READ,
    PERMISSIONS.SUPPLY_MAP_READ,
  ],

  viewer: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PROCUREMENT_READ,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.FORECAST_READ,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SUPPLY_MAP_READ,
  ],

  auditor: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PROCUREMENT_READ,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.FORECAST_READ,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.DECISIONS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SUPPLY_MAP_READ,
  ],
}

// ─── Helper Functions ─────────────────────────────────────────────────────
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    procurement_manager: 'Procurement Manager',
    warehouse_manager: 'Warehouse Manager',
    forecast_analyst: 'Forecast Analyst',
    viewer: 'Viewer',
    auditor: 'Auditor',
  }
  return labels[role] ?? role
}

export function getRoleBadgeColor(role: Role): string {
  const colors: Record<Role, string> = {
    super_admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    procurement_manager: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    warehouse_manager: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    forecast_analyst: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    viewer: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    auditor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  }
  return colors[role] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
}

// ─── React Hook ────────────────────────────────────────────────────────────
export function usePermission(permission: Permission): boolean {
  const permissions = useSelector(selectPermissions)
  return permissions.includes(permission)
}

export function usePermissions(permissions: Permission[]): boolean[] {
  const userPermissions = useSelector(selectPermissions)
  return permissions.map((p) => userPermissions.includes(p))
}

export function useAnyPermission(permissions: Permission[]): boolean {
  const userPermissions = useSelector(selectPermissions)
  return permissions.some((p) => userPermissions.includes(p))
}
