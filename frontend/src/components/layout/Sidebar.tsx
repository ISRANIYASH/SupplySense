'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  ShoppingCart,
  Building2,
  Truck,
  Boxes,
  TrendingDown,
  CloudRain,
  AlertTriangle,
  MessageSquare,
  SlidersHorizontal,
  Bot,
  FlaskConical,
  ListChecks,
  BarChart3,
  Bell,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { toggleSidebar, selectSidebarCollapsed } from '@/lib/store/uiSlice'
import { selectUser, logout } from '@/lib/store/authSlice'
import { usePermission } from '@/lib/auth/permissions'
import { PERMISSIONS, getRoleLabel, getRoleBadgeColor } from '@/lib/auth/permissions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface NavItem {
  href: string
  label: string
  icon: any
  badge?: string
  badgeColor?: string
  permission?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      { href: '/', label: 'Control Tower', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_READ },
      { href: '/forecast', label: 'Demand Forecast', icon: TrendingUp, permission: PERMISSIONS.FORECAST_READ },
      { href: '/inventory', label: 'Inventory Brain', icon: Package, permission: PERMISSIONS.INVENTORY_READ },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { href: '/procurement', label: 'Procurement AI', icon: ShoppingCart, permission: PERMISSIONS.PROCUREMENT_READ },
      { href: '/suppliers', label: 'Supplier Hub', icon: Building2, permission: PERMISSIONS.SUPPLIERS_READ },
      { href: '/logistics', label: 'Logistics', icon: Truck, permission: PERMISSIONS.SUPPLY_MAP_READ },
      { href: '/warehouse', label: 'Warehouse Twin', icon: Boxes, permission: PERMISSIONS.INVENTORY_READ },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/market', label: 'Market Intel', icon: TrendingDown, permission: PERMISSIONS.ANALYTICS_READ },
      { href: '/weather', label: 'Weather Intel', icon: CloudRain, permission: PERMISSIONS.RISK_READ },
      {
        href: '/risk',
        label: 'Risk Center',
        icon: AlertTriangle,
        badge: '3',
        badgeColor: '#EF4444',
        permission: PERMISSIONS.RISK_READ,
      },
    ],
  },
  {
    label: 'AI TOOLS',
    items: [
      {
        href: '/copilot',
        label: 'AI Copilot',
        icon: MessageSquare,
        badge: 'NEW',
        badgeColor: '#00D4AA',
        permission: PERMISSIONS.COPILOT_USE,
      },
      { href: '/simulator', label: 'Simulator', icon: SlidersHorizontal, permission: PERMISSIONS.ANALYTICS_READ },
      { href: '/explainability', label: 'Explainable AI', icon: Bot, permission: PERMISSIONS.ANALYTICS_READ },
    ],
  },
  {
    label: 'MLOPS',
    items: [
      { href: '/mlops', label: 'MLOps Center', icon: FlaskConical, permission: PERMISSIONS.MLOPS_READ },
      {
        href: '/decisions',
        label: 'Decision Log',
        icon: ListChecks,
        badge: '5',
        badgeColor: '#3B8EE8',
        permission: PERMISSIONS.DECISIONS_READ,
      },
      { href: '/analytics', label: 'Analytics Lab', icon: BarChart3, permission: PERMISSIONS.ANALYTICS_READ },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      {
        href: '/alerts',
        label: 'Alert Center',
        icon: Bell,
        badge: '8',
        badgeColor: '#F59E0B',
      },
      { href: '/admin', label: 'Admin Center', icon: ShieldCheck, permission: PERMISSIONS.ADMIN_READ },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const dispatch = useDispatch()
  const router = useRouter()
  const collapsed = useSelector(selectSidebarCollapsed)
  const user = useSelector(selectUser)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const canAccess = (permission?: string) => {
    if (!permission) return true
    if (!user) return false
    return user.permissions?.includes(permission as never) || false
  }

  const handleLogout = () => {
    dispatch(logout())
    toast.success('Signed out successfully')
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-screen flex flex-col overflow-hidden select-none z-40"
      style={{
        background: '#111827',
        borderRight: '1px solid #1E2D45',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center px-4 h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid #1E2D45' }}
      >
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B8EE8 0%, #00D4AA 100%)' }}
          >
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L19 7V15L11 20L3 15V7L11 2Z" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="11" cy="11" r="2.5" fill="white" />
            </svg>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="font-bold text-white text-sm leading-tight">SupplySense</div>
                <div
                  className="text-[10px] font-mono tracking-widest"
                  style={{ color: '#3B8EE8' }}
                >
                  SC-OS v2.0
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* ── Nav Groups ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => canAccess(item.permission))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label} className="px-2">
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2 py-1.5 text-[10px] font-semibold tracking-widest"
                    style={{ color: '#64748B' }}
                  >
                    {group.label}
                  </motion.div>
                )}
              </AnimatePresence>

              {visibleItems.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon

                return (
                  <div
                    key={item.href}
                    className="relative"
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150 relative overflow-hidden"
                      style={{
                        background: active ? 'rgba(59,142,232,0.1)' : 'transparent',
                        borderLeft: active ? '3px solid #3B8EE8' : '3px solid transparent',
                        color: active ? '#3B8EE8' : '#94A3B8',
                      }}
                    >
                      {!active && hoveredItem === item.href && (
                        <motion.div
                          layoutId="nav-hover"
                          className="absolute inset-0 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                          transition={{ duration: 0.15 }}
                        />
                      )}
                      <Icon
                        size={18}
                        className="flex-shrink-0 relative z-10"
                        style={{ color: active ? '#3B8EE8' : '#64748B' }}
                      />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="flex items-center justify-between flex-1 overflow-hidden"
                          >
                            <span className="text-sm font-medium whitespace-nowrap">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0"
                                style={{
                                  background: `${item.badgeColor}20`,
                                  color: item.badgeColor,
                                  border: `1px solid ${item.badgeColor}30`,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Link>

                    {/* Tooltip on collapsed */}
                    {collapsed && hoveredItem === item.href && (
                      <div
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap z-50 pointer-events-none"
                        style={{
                          background: '#1C2537',
                          border: '1px solid #1E2D45',
                          color: '#F1F5F9',
                        }}
                      >
                        {item.label}
                        {item.badge && (
                          <span className="ml-1.5 text-[10px]" style={{ color: item.badgeColor }}>
                            ({item.badge})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="mt-1 mb-2 mx-2 h-px" style={{ background: '#1E2D45', opacity: 0.5 }} />
            </div>
          )
        })}
      </nav>

      {/* ── User Profile + Collapse Button ── */}
      <div style={{ borderTop: '1px solid #1E2D45' }}>
        {/* User info */}
        <div className="p-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3B8EE8 0%, #00D4AA 100%)' }}
            >
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <div className="text-sm font-medium text-white truncate">
                    {user?.name ?? 'User'}
                  </div>
                  {user?.role && (
                    <div
                      className="text-[10px] px-1.5 py-0.5 rounded-full inline-block font-medium border"
                      style={{}}
                    >
                      <span
                        className={`text-[10px] px-1.5 rounded-full font-medium ${getRoleBadgeColor(user.role)}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!collapsed && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: '#64748B' }}
                  title="Sign out"
                >
                  <LogOut size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="w-full flex items-center justify-center py-2.5 transition-colors"
          style={{ color: '#64748B', borderTop: '1px solid #1E2D45' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  )
}
