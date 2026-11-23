'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  Zap,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  LogOut,
  User,
  Settings,
  RefreshCw,
  Check,
  X,
  ExternalLink,
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser, logout } from '@/lib/store/authSlice'
import { signOut } from 'next-auth/react'
import {
  toggleCopilot,
  setCommandPaletteOpen,
} from '@/lib/store/uiSlice'
import { getRoleLabel } from '@/lib/auth/permissions'
import { toast } from 'sonner'
import {
  fetchActiveAlerts,
  markAlertAsRead,
  markAllAlertsRead,
  resolveAlert,
  clearAllAlerts,
} from '@/lib/api/client'

// Build breadcrumb from pathname
function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    'supply-map': 'Delivery Tracking',
    'demand-forecast': 'Demand Prediction',
    forecast: 'Demand Prediction',
    inventory: 'Inventory Management',
    procurement: 'Purchase Management',
    suppliers: 'Supplier Management',
    logistics: 'Delivery Tracking',
    warehouse: 'Warehouse Management',
    market: 'Market Trends',
    weather: 'Weather Updates',
    risk: 'Risk Alerts',
    agents: 'AI Assistant',
    copilot: 'AI Assistant',
    simulator: 'What-if Analysis',
    explainability: 'Prediction Explanation',
    mlops: 'Model Performance',
    decisions: 'Activity History',
    analytics: 'Reports & Analytics',
    'analytics-lab': 'Reports & Analytics',
    alerts: 'Alert Center',
    audit: 'Activity History',
    settings: 'Settings',
    admin: 'Admin Center',
  }

  const crumbs = [{ label: 'Dashboard', href: '/' }]
  if (segments.length > 0 && segments[0] !== '') {
    crumbs.push({ label: labels[segments[0]] ?? segments[0], href: `/${segments[0]}` })
  }
  return crumbs
}

function LiveClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-sm font-medium" style={{ color: '#94A3B8' }}>
      {time}
    </span>
  )
}

export function Topbar() {
  const dispatch = useDispatch()
  const router = useRouter()
  const user = useSelector(selectUser)
  const crumbs = useBreadcrumb()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [liveAlerts, setLiveAlerts] = useState<any[]>([])
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(0)

  const refreshAlerts = useCallback(async () => {
    try {
      const res: any = await fetchActiveAlerts()
      if (res && Array.isArray(res.alerts)) {
        setLiveAlerts(res.alerts)
        setLiveUnreadCount(
          typeof res.unread_count === 'number'
            ? res.unread_count
            : res.alerts.filter((a: any) => !a.read).length
        )
      }
    } catch {}
  }, [])

  useEffect(() => {
    refreshAlerts()
    const timer = setInterval(refreshAlerts, 15000)
    return () => clearInterval(timer)
  }, [refreshAlerts])

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await markAlertAsRead(id)
      setLiveAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
      setLiveUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Notification marked as read')
    } catch {
      toast.error('Failed to update notification')
    }
  }

  const handleResolveAlert = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await resolveAlert(id)
      setLiveAlerts(prev => prev.filter(a => a.id !== id))
      setLiveUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Alert resolved and dismissed')
    } catch {
      toast.error('Failed to resolve alert')
    }
  }

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await markAllAlertsRead()
      setLiveAlerts(prev => prev.map(a => ({ ...a, read: true })))
      setLiveUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await clearAllAlerts()
      setLiveAlerts([])
      setLiveUnreadCount(0)
      toast.success('All active alerts cleared')
    } catch {
      toast.error('Failed to clear alerts')
    }
  }

  const getAlertBadge = (alert: any) => {
    const sev = String(alert.severity || '').toUpperCase()
    const type = String(alert.type || '').toUpperCase()
    if (type === 'CRITICAL_STOCK' || sev === 'CRITICAL') {
      return { label: 'Critical Stock', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' }
    }
    if (type === 'LOW_STOCK' || sev === 'HIGH') {
      return { label: 'Low Stock', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' }
    }
    if (type === 'REPLENISHMENT_REQUIRED' || sev === 'MEDIUM') {
      return { label: 'Stock Replenishment Required', color: '#3B8EE8', bg: 'rgba(59,142,232,0.15)', border: 'rgba(59,142,232,0.3)' }
    }
    return { label: alert.category || 'System Alert', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handle = () => {
      setNotifOpen(false)
      setUserMenuOpen(false)
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [])

  const openCommandPalette = useCallback(() => {
    dispatch(setCommandPaletteOpen(true))
  }, [dispatch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openCommandPalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openCommandPalette])

  const handleLogout = async () => {
    try {
      localStorage.removeItem('supplysense_session')
    } catch {}
    dispatch(logout())
    toast.success('Signed out successfully')
    await signOut({ redirect: true, callbackUrl: '/login' })
  }

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center px-6 gap-4"
      style={{
        height: 60,
        background: 'rgba(10,15,30,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(30,45,69,0.6)',
        left: 'var(--sidebar-offset, 240px)',
        transition: 'left 0.25s ease-in-out',
      }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 flex-1 min-w-0">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <ChevronRight size={14} style={{ color: '#1E2D45' }} className="flex-shrink-0" />}
            <button
              onClick={() => router.push(crumb.href)}
              className="text-sm truncate transition-colors"
              style={{
                color: i === crumbs.length - 1 ? '#F1F5F9' : '#64748B',
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
              }}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* Search trigger */}
      <button
        onClick={openCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 hover:border-blue-500/40"
        style={{
          background: 'rgba(28,37,55,0.6)',
          border: '1px solid rgba(30,45,69,0.8)',
          color: '#64748B',
          minWidth: 200,
        }}
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search… </span>
        <kbd
          className="text-[10px] px-1.5 py-0.5 rounded font-mono"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #1E2D45' }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Live clock */}
      <LiveClock />

      {/* System health */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #10B981' }} />
        <span className="text-xs hidden xl:block" style={{ color: '#64748B' }}>
          All systems operational
        </span>
      </div>

      {/* Notifications */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
          className="relative p-2 rounded-lg transition-colors hover:bg-slate-800/60"
          style={{ color: liveUnreadCount > 0 ? '#F1F5F9' : '#64748B' }}
          title="Notifications"
        >
          <Bell size={18} />
          {liveUnreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse"
              style={{ background: '#EF4444', color: 'white' }}
            >
              {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-96 rounded-xl overflow-hidden z-50 shadow-2xl"
              style={{
                background: '#1C2537',
                border: '1px solid rgba(59,142,232,0.2)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #1E2D45', background: 'rgba(17,24,39,0.7)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  {liveUnreadCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}
                    >
                      {liveUnreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {liveUnreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: '#3B8EE8' }}
                      title="Mark all notifications as read"
                    >
                      Mark all read
                    </button>
                  )}
                  {liveAlerts.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: '#94A3B8' }}
                      title="Clear all notifications"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: 'rgba(30,45,69,0.5)' }}>
                {liveAlerts.length === 0 ? (
                  <div className="py-10 text-center text-sm" style={{ color: '#64748B' }}>
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500/60" />
                    No active notifications
                    <p className="text-xs text-slate-500 mt-1">All inventory levels are currently healthy</p>
                  </div>
                ) : (
                  liveAlerts.slice(0, 8).map((alert) => {
                    const badge = getAlertBadge(alert)
                    const isUnread = !alert.read
                    return (
                      <div
                        key={alert.id}
                        className="px-4 py-3 transition-colors hover:bg-slate-800/40"
                        style={{ background: isUnread ? 'rgba(59,142,232,0.06)' : 'transparent' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded"
                              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                            >
                              {badge.label}
                            </span>
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B8EE8' }} />
                            )}
                          </div>
                          
                          {/* Item actions */}
                          <div className="flex items-center gap-1">
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkAsRead(alert.id, e)}
                                className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-emerald-400 transition-colors"
                                title="Mark as read"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleResolveAlert(alert.id, e)}
                              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Resolve & dismiss alert"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <p className="text-sm font-medium text-white leading-snug mt-1.5">
                          {alert.title}
                        </p>

                        {/* Description (Stock, Reorder Level, Region) */}
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: '#94A3B8' }}>
                          {alert.description}
                        </p>

                        {/* Timestamp */}
                        <p className="text-[10px] mt-1.5" style={{ color: '#64748B' }}>
                          {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-2.5 text-center"
                style={{ borderTop: '1px solid #1E2D45', background: 'rgba(17,24,39,0.7)' }}
              >
                <button
                  onClick={() => { setNotifOpen(false); router.push('/alerts') }}
                  className="text-xs font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors hover:text-blue-400"
                  style={{ color: '#3B8EE8' }}
                >
                  View all in Alert Center <ExternalLink size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Copilot button */}
      <button
        onClick={() => dispatch(toggleCopilot())}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: 'rgba(59,142,232,0.1)',
          border: '1px solid rgba(59,142,232,0.25)',
          color: '#3B8EE8',
        }}
      >
        <Zap size={14} />
        <span className="hidden xl:block">Copilot</span>
      </button>

      {/* User avatar dropdown */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
          className="flex items-center gap-2 p-1 rounded-lg transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #3B8EE8 0%, #00D4AA 100%)' }}
          >
            {user?.name?.charAt(0) ?? 'U'}
          </div>
        </button>

        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50"
              style={{
                background: '#1C2537',
                border: '1px solid rgba(59,142,232,0.15)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid #1E2D45' }}
              >
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs" style={{ color: '#64748B' }}>{user?.email}</p>
                {user?.role && (
                  <p className="text-xs mt-0.5" style={{ color: '#3B8EE8' }}>
                    {getRoleLabel(user.role)}
                  </p>
                )}
              </div>
              {[
                { icon: User, label: 'Profile', action: () => router.push('/settings') },
                { icon: Settings, label: 'Settings', action: () => router.push('/settings') },
                { icon: RefreshCw, label: 'Switch Role', action: () => router.push('/admin') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setUserMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left"
                  style={{ color: '#94A3B8' }}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #1E2D45' }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left"
                  style={{ color: '#EF4444' }}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
