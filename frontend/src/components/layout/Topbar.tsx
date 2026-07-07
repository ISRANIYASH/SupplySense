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
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser, logout } from '@/lib/store/authSlice'
import {
  selectNotifications,
  selectUnreadCount,
  markAllNotificationsRead,
  toggleCopilot,
  setCommandPaletteOpen,
} from '@/lib/store/uiSlice'
import { selectAiAlerts } from '@/lib/store/alertsSlice'
import { getRoleLabel } from '@/lib/auth/permissions'
import { toast } from 'sonner'
import type { Notification } from '@/lib/store/uiSlice'
import type { SystemAlert } from '@/lib/store/alertsSlice'

// Build breadcrumb from pathname
function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    'supply-map': 'Supply Map',
    'demand-forecast': 'Demand Forecast',
    inventory: 'Inventory',
    procurement: 'Procurement',
    suppliers: 'Suppliers',
    risk: 'Risk Radar',
    agents: 'AI Agents',
    copilot: 'Copilot',
    optimization: 'Optimizer',
    'analytics-lab': 'Analytics Lab',
    mlops: 'MLOps Center',
    decisions: 'Decision Log',
    audit: 'Audit Trail',
    settings: 'Settings',
    admin: 'Admin Panel',
  }

  const crumbs = [{ label: 'Command Center', href: '/' }]
  if (segments.length > 0 && segments[0] !== '') {
    crumbs.push({ label: labels[segments[0]] ?? segments[0], href: `/${segments[0]}` })
  }
  return crumbs
}

function AlertIcon({ severity }: { severity: SystemAlert['severity'] }) {
  if (severity === 'critical') return <AlertCircle size={14} style={{ color: '#EF4444' }} />
  if (severity === 'warning') return <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
  if (severity === 'success') return <CheckCircle2 size={14} style={{ color: '#10B981' }} />
  return <Info size={14} style={{ color: '#3B8EE8' }} />
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
  const notifications = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const aiAlerts = useSelector(selectAiAlerts)
  const crumbs = useBreadcrumb()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

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

  const handleLogout = () => {
    dispatch(logout())
    toast.success('Signed out successfully')
    router.push('/login')
  }

  const recentAlerts = aiAlerts.slice(0, 5)

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
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: '#64748B' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
              style={{ background: '#EF4444', color: 'white' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
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
              className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50"
              style={{
                background: '#1C2537',
                border: '1px solid rgba(59,142,232,0.15)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #1E2D45' }}
              >
                <span className="text-sm font-semibold text-white">Notifications</span>
                <button
                  onClick={() => dispatch(markAllNotificationsRead())}
                  className="text-xs transition-colors"
                  style={{ color: '#3B8EE8' }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'rgba(30,45,69,0.4)' }}>
                {recentAlerts.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: '#64748B' }}>
                    No notifications
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="px-4 py-3 transition-colors"
                      style={{ background: alert.acknowledged ? 'transparent' : 'rgba(59,142,232,0.04)' }}
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertIcon severity={alert.severity} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white leading-snug">{alert.title}</p>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#64748B' }}>
                            {alert.message.slice(0, 80)}…
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: '#475569' }}>
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
