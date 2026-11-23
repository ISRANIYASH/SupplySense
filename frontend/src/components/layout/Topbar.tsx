'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  Package,
  Layers,
  Filter,
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
  syncAlerts,
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

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return 'Just now'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [notifTab, setNotifTab] = useState<'ALL' | 'UNREAD' | 'CRITICAL' | 'LOW_STOCK'>('ALL')
  const [notifSearch, setNotifSearch] = useState('')

  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 1. Fetch alerts and unread count from real backend/database
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

  // Auto-sync polling every 15s
  useEffect(() => {
    refreshAlerts()
    const timer = setInterval(refreshAlerts, 15000)
    return () => clearInterval(timer)
  }, [refreshAlerts])

  // 2. Robust outside click & Escape key detection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // 3. Command palette shortcut
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

  // 4. Action Handlers
  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSyncing(true)
    try {
      await syncAlerts()
      await refreshAlerts()
      toast.success('Inventory scanned & alerts synchronized')
    } catch {
      toast.error('Failed to sync alerts')
    } finally {
      setIsSyncing(false)
    }
  }

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

  const handleLogout = async () => {
    try {
      localStorage.removeItem('supplysense_session')
    } catch {}
    dispatch(logout())
    toast.success('Signed out successfully')
    await signOut({ redirect: true, callbackUrl: '/login' })
  }

  // 5. Visual styling helper
  const getAlertBadge = (alert: any) => {
    const sev = String(alert.severity || '').toUpperCase()
    const type = String(alert.type || '').toUpperCase()
    const cat = String(alert.category || '').toLowerCase()

    if (type === 'CRITICAL_STOCK' || (sev === 'CRITICAL' && cat === 'inventory')) {
      return { label: 'Critical Stock', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', icon: AlertCircle }
    }
    if (type === 'LOW_STOCK' || (sev === 'HIGH' && cat === 'inventory')) {
      return { label: 'Low Stock', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: AlertTriangle }
    }
    if (type === 'REPLENISHMENT_REQUIRED' || cat === 'inventory') {
      return { label: 'Stock Replenishment', color: '#3B8EE8', bg: 'rgba(59,142,232,0.15)', border: 'rgba(59,142,232,0.3)', icon: Package }
    }
    if (cat === 'price' || type === 'MARKET_PRICE') {
      return { label: 'Market Trends', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: Zap }
    }
    if (cat === 'logistics' || type === 'DELIVERY_DELAY') {
      return { label: 'Delivery Tracking', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)', icon: AlertTriangle }
    }
    if (cat === 'procurement' || type === 'SUPPLIER_RISK') {
      return { label: 'Supplier Management', color: '#00D4AA', bg: 'rgba(0,212,170,0.15)', border: 'rgba(0,212,170,0.3)', icon: AlertCircle }
    }
    return { label: alert.category || 'System Alert', color: '#94A3B8', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', icon: Info }
  }

  // 6. Filtered alert list
  const criticalCount = liveAlerts.filter(a => a.severity === 'CRITICAL' || a.type === 'CRITICAL_STOCK').length
  const lowStockCount = liveAlerts.filter(a => a.type === 'LOW_STOCK' || a.severity === 'HIGH').length

  const filteredAlerts = liveAlerts.filter(a => {
    if (notifTab === 'UNREAD' && a.read) return false
    if (notifTab === 'CRITICAL' && a.severity !== 'CRITICAL' && a.type !== 'CRITICAL_STOCK') return false
    if (notifTab === 'LOW_STOCK' && a.type !== 'LOW_STOCK' && a.severity !== 'HIGH') return false

    if (notifSearch.trim()) {
      const q = notifSearch.toLowerCase()
      const title = String(a.title || '').toLowerCase()
      const desc = String(a.description || '').toLowerCase()
      const cat = String(a.category || '').toLowerCase()
      return title.includes(q) || desc.includes(q) || cat.includes(q)
    }
    return true
  })

  return (
    <header
      className="fixed top-0 right-0 z-40 flex items-center px-6 gap-4"
      style={{
        height: 60,
        background: 'rgba(10,15,30,0.85)',
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
              className="text-sm truncate transition-colors hover:text-white"
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

      {/* ── Notifications Bell & Panel ─────────────────────────────────── */}
      <div ref={notifRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setNotifOpen(prev => !prev)
            setUserMenuOpen(false)
          }}
          className="relative p-2 rounded-lg transition-all duration-150 hover:bg-slate-800/80 cursor-pointer focus:outline-none"
          style={{
            color: notifOpen || liveUnreadCount > 0 ? '#F1F5F9' : '#64748B',
            background: notifOpen ? 'rgba(59,142,232,0.15)' : 'transparent',
            border: notifOpen ? '1px solid rgba(59,142,232,0.3)' : '1px solid transparent',
          }}
          title="Notifications"
          aria-label="Toggle notifications panel"
        >
          <Bell size={18} className={liveUnreadCount > 0 ? 'text-blue-400' : ''} />
          {liveUnreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse"
              style={{ background: '#EF4444', color: 'white', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}
            >
              {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2.5 w-[420px] max-w-[calc(100vw-24px)] rounded-xl overflow-hidden z-[100]"
              style={{
                background: '#151D2F',
                border: '1px solid rgba(59,142,232,0.25)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 1px 1px rgba(59,142,232,0.15)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #1E2D45', background: 'rgba(10,15,30,0.85)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  {liveUnreadCount > 0 ? (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      {liveUnreadCount} unread
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">({liveAlerts.length} total)</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Scan inventory & refresh alerts"
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin text-blue-400' : ''} />
                  </button>
                  {liveUnreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs px-2 py-1 rounded transition-colors hover:bg-blue-500/10"
                      style={{ color: '#3B8EE8', fontWeight: 500 }}
                      title="Mark all notifications as read"
                    >
                      Mark all read
                    </button>
                  )}
                  {liveAlerts.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs px-2 py-1 rounded transition-colors hover:bg-rose-500/10"
                      style={{ color: '#94A3B8' }}
                      title="Clear all notifications"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Segmented Filter Tabs inside Panel */}
              <div
                className="flex items-center gap-1.5 px-3 py-2 text-xs overflow-x-auto scrollbar-none"
                style={{ borderBottom: '1px solid rgba(30,45,69,0.7)', background: 'rgba(17,24,39,0.5)' }}
              >
                {[
                  { id: 'ALL', label: `All (${liveAlerts.length})` },
                  { id: 'UNREAD', label: `Unread (${liveUnreadCount})` },
                  { id: 'CRITICAL', label: `Critical (${criticalCount})` },
                  { id: 'LOW_STOCK', label: `Low Stock (${lowStockCount})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setNotifTab(tab.id as any)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap"
                    style={{
                      background: notifTab === tab.id ? 'rgba(59,142,232,0.2)' : 'transparent',
                      color: notifTab === tab.id ? '#FFFFFF' : '#94A3B8',
                      border: notifTab === tab.id ? '1px solid rgba(59,142,232,0.4)' : '1px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search filter input */}
              {liveAlerts.length > 4 && (
                <div className="px-3 py-1.5" style={{ borderBottom: '1px solid rgba(30,45,69,0.5)', background: 'rgba(10,15,30,0.4)' }}>
                  <div className="relative flex items-center">
                    <Search size={12} className="absolute left-2.5 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={notifSearch}
                      onChange={(e) => setNotifSearch(e.target.value)}
                      placeholder="Search notifications by product, SKU..."
                      className="w-full bg-slate-900/80 text-xs text-white pl-7 pr-7 py-1 rounded-md border border-slate-700/60 focus:outline-none focus:border-blue-500/60 placeholder-slate-500"
                    />
                    {notifSearch && (
                      <button
                        onClick={() => setNotifSearch('')}
                        className="absolute right-2 text-slate-400 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Notification List — Scrollable, showing all active alerts */}
              <div
                className="max-h-[460px] overflow-y-auto divide-y"
                style={{ borderColor: 'rgba(30,45,69,0.5)' }}
              >
                {filteredAlerts.length === 0 ? (
                  <div className="py-12 text-center text-sm" style={{ color: '#64748B' }}>
                    <CheckCircle2 size={30} className="mx-auto mb-2 text-emerald-500/60" />
                    <p className="text-slate-300 font-medium text-sm">No notifications found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {notifSearch ? 'No alerts match your search query' : 'All monitored inventory thresholds are optimal'}
                    </p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const badge = getAlertBadge(alert)
                    const isUnread = !alert.read
                    const IconComponent = badge.icon
                    return (
                      <div
                        key={alert.id}
                        className="px-4 py-3 transition-colors hover:bg-slate-800/50 group"
                        style={{
                          background: isUnread ? 'rgba(59,142,232,0.06)' : 'transparent',
                          borderLeft: `3px solid ${badge.color}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                            >
                              <IconComponent size={10} />
                              {badge.label}
                            </span>
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B8EE8' }} title="Unread" />
                            )}
                          </div>
                          
                          {/* Item quick actions */}
                          <div className="flex items-center gap-1">
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkAsRead(alert.id, e)}
                                className="p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                title="Mark as read"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleResolveAlert(alert.id, e)}
                              className="p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Resolve & dismiss alert"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <p className="text-sm font-semibold text-white leading-snug mt-1.5">
                          {alert.title}
                        </p>

                        {/* Description (Stock, Reorder Level, Region) */}
                        <p className="text-xs mt-1 leading-relaxed text-slate-300 font-normal">
                          {alert.description}
                        </p>

                        {/* Footer details: Severity + Category + Relative Timestamp */}
                        <div className="flex items-center justify-between text-[10px] mt-2 text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400">
                              {alert.severity}
                            </span>
                            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400">
                              {alert.category}
                            </span>
                          </div>
                          <span title={alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}>
                            {formatRelativeTime(alert.created_at)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: '1px solid #1E2D45', background: 'rgba(10,15,30,0.85)' }}
              >
                <span className="text-[11px] text-slate-500">
                  Showing {filteredAlerts.length} of {liveAlerts.length} alerts
                </span>
                <button
                  onClick={() => { setNotifOpen(false); router.push('/alerts') }}
                  className="text-xs font-semibold flex items-center gap-1.5 transition-colors hover:text-blue-300 cursor-pointer"
                  style={{ color: '#3B8EE8' }}
                >
                  Open Alert Center <ExternalLink size={12} />
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

      {/* ── User Avatar Dropdown ────────────────────────────────────────── */}
      <div ref={userMenuRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setUserMenuOpen(prev => !prev)
            setNotifOpen(false)
          }}
          className="flex items-center gap-2 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
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
              className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-[100]"
              style={{
                background: '#151D2F',
                border: '1px solid rgba(59,142,232,0.2)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid #1E2D45', background: 'rgba(10,15,30,0.6)' }}
              >
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs truncate" style={{ color: '#64748B' }}>{user?.email}</p>
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
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-slate-800/60"
                  style={{ color: '#94A3B8' }}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #1E2D45' }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-rose-500/10"
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
