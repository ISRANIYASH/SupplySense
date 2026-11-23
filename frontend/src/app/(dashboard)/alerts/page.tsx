'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchActiveAlerts,
  fetchAlertsSummary,
  markAlertAsRead,
  markAllAlertsRead,
  resolveAlert,
  clearAllAlerts,
  syncAlerts,
} from '@/lib/api/client'
import { toast } from 'sonner'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  RefreshCw,
  Filter,
  Package,
} from 'lucide-react'

const C = {
  bg: '#0A0F1E',
  surface: '#111827',
  surface2: '#1C2537',
  border: '#1E2D45',
  blue: '#3B8EE8',
  teal: '#00D4AA',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
  purple: '#8B5CF6',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
} as const

function GlassCard({
  children,
  style = {},
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: 'rgba(17,24,39,0.85)',
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: string }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        background: C.surface2,
        borderRadius: 6,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

function LiveBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.teal,
        background: `${C.teal}18`,
        border: `1px solid ${C.teal}30`,
        borderRadius: 6,
        padding: '4px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      LIVE ALERTS
    </span>
  )
}

function KpiTile({
  label,
  value,
  sub,
  color = C.blue,
  loading,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
  loading?: boolean
}) {
  return (
    <GlassCard style={{ padding: 20 }}>
      <p
        style={{
          color: C.textMuted,
          fontSize: 11,
          margin: '0 0 6px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      {loading ? (
        <Skeleton h={28} w="120px" />
      ) : (
        <p style={{ color, fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>
          {value}
        </p>
      )}
      {sub && <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{sub}</p>}
    </GlassCard>
  )
}

type FilterCategory = 'ALL' | 'CRITICAL_STOCK' | 'LOW_STOCK' | 'REPLENISHMENT_REQUIRED' | 'OTHER'

export default function AlertsPage() {
  const [data, setData] = useState<any>(null)
  const [summary, setSummary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL')

  const loadAlerts = useCallback(async () => {
    try {
      const [d, s]: any = await Promise.all([
        fetchActiveAlerts(),
        fetchAlertsSummary(),
      ])
      setData(d)
      setSummary(Array.isArray(s) ? s : [])
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
    const timer = setInterval(loadAlerts, 20000)
    return () => clearInterval(timer)
  }, [loadAlerts])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncAlerts()
      await loadAlerts()
      toast.success('Inventory thresholds scanned & synchronized')
    } catch {
      toast.error('Failed to synchronize alerts')
    } finally {
      setSyncing(false)
    }
  }

  const handleMarkRead = async (id: number) => {
    try {
      await markAlertAsRead(id)
      setData((prev: any) => ({
        ...prev,
        alerts: prev.alerts.map((a: any) => (a.id === id ? { ...a, read: true } : a)),
        unread_count: Math.max(0, (prev.unread_count || 1) - 1),
      }))
      toast.success('Alert marked as read')
    } catch {
      toast.error('Failed to mark alert as read')
    }
  }

  const handleResolve = async (id: number) => {
    try {
      await resolveAlert(id)
      setData((prev: any) => ({
        ...prev,
        alerts: prev.alerts.filter((a: any) => a.id !== id),
        total: Math.max(0, (prev.total || 1) - 1),
        unread_count: Math.max(0, (prev.unread_count || 1) - 1),
      }))
      toast.success('Alert resolved and removed')
    } catch {
      toast.error('Failed to resolve alert')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead()
      setData((prev: any) => ({
        ...prev,
        alerts: prev.alerts.map((a: any) => ({ ...a, read: true })),
        unread_count: 0,
      }))
      toast.success('All active alerts marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllAlerts()
      setData((prev: any) => ({ ...prev, alerts: [], total: 0, unread_count: 0 }))
      toast.success('All active alerts cleared')
    } catch {
      toast.error('Failed to clear alerts')
    }
  }

  const getCount = (sev: string) =>
    summary?.find((s: any) => s.severity === sev)?.count || 0

  const getAlertBadge = (alert: any) => {
    const sev = String(alert.severity || '').toUpperCase()
    const type = String(alert.type || '').toUpperCase()
    if (type === 'CRITICAL_STOCK' || (sev === 'CRITICAL' && alert.category === 'inventory')) {
      return { label: 'Critical Stock', color: C.danger, bg: `${C.danger}18`, border: `${C.danger}40` }
    }
    if (type === 'LOW_STOCK' || (sev === 'HIGH' && alert.category === 'inventory')) {
      return { label: 'Low Stock', color: C.warning, bg: `${C.warning}18`, border: `${C.warning}40` }
    }
    if (type === 'REPLENISHMENT_REQUIRED' || alert.category === 'inventory') {
      return { label: 'Stock Replenishment Required', color: C.blue, bg: `${C.blue}18`, border: `${C.blue}40` }
    }
    return { label: alert.category || alert.type || 'Alert', color: C.textMuted, bg: `${C.surface2}`, border: C.border }
  }

  const filteredAlerts = (data?.alerts || []).filter((alert: any) => {
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'CRITICAL_STOCK') {
      return alert.type === 'CRITICAL_STOCK' || alert.severity === 'CRITICAL'
    }
    if (activeFilter === 'LOW_STOCK') {
      return alert.type === 'LOW_STOCK' || alert.severity === 'HIGH'
    }
    if (activeFilter === 'REPLENISHMENT_REQUIRED') {
      return alert.type === 'REPLENISHMENT_REQUIRED' || alert.severity === 'MEDIUM'
    }
    if (activeFilter === 'OTHER') {
      return !['CRITICAL_STOCK', 'LOW_STOCK', 'REPLENISHMENT_REQUIRED'].includes(alert.type)
    }
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '28px 32px', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 26, fontWeight: 700, margin: 0 }}>Alert Center</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>
            Real-time inventory alerts, stock replenishment thresholds, and automated operations monitoring
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '8px 14px',
              color: C.textSecondary,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Scanning...' : 'Sync Inventory'}
          </button>
          <LiveBadge />
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiTile loading={loading} label="Critical Alerts" value={getCount('CRITICAL')} color={C.danger} sub="Requires immediate action" />
        <KpiTile loading={loading} label="High Alerts" value={getCount('HIGH')} color={C.warning} sub="Below safety stock" />
        <KpiTile loading={loading} label="Medium Alerts" value={getCount('MEDIUM')} color={C.blue} sub="At or below reorder level" />
        <KpiTile loading={loading} label="Unread Count" value={data?.unread_count ?? 0} color={C.teal} sub="Pending review" />
      </div>

      {/* Main Alert Container */}
      <GlassCard style={{ padding: 24 }}>
        {/* Action & Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          {/* Segmented Filter Tabs */}
          <div style={{ display: 'flex', background: C.surface2, borderRadius: 8, padding: 4, border: `1px solid ${C.border}`, gap: 4 }}>
            {[
              { id: 'ALL', label: 'All Alerts' },
              { id: 'CRITICAL_STOCK', label: 'Critical Stock' },
              { id: 'LOW_STOCK', label: 'Low Stock' },
              { id: 'REPLENISHMENT_REQUIRED', label: 'Stock Replenishment' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as FilterCategory)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  borderRadius: 6,
                  fontWeight: activeFilter === tab.id ? 600 : 400,
                  background: activeFilter === tab.id ? C.blue : 'transparent',
                  color: activeFilter === tab.id ? '#FFFFFF' : C.textMuted,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(data?.unread_count ?? 0) > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'rgba(59,142,232,0.1)',
                  border: '1px solid rgba(59,142,232,0.3)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: C.blue,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Mark All Read
              </button>
            )}
            {(data?.alerts?.length ?? 0) > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: C.danger,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Clear All Resolved
              </button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        {loading ? (
          <Skeleton h={220} />
        ) : filteredAlerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredAlerts.map((a: any) => {
              const badge = getAlertBadge(a)
              const isUnread = !a.read
              return (
                <div
                  key={a.id}
                  style={{
                    background: isUnread ? 'rgba(28,37,55,0.7)' : C.surface2,
                    borderLeft: `4px solid ${badge.color}`,
                    border: `1px solid ${C.border}`,
                    borderLeftColor: badge.color,
                    padding: 16,
                    borderRadius: 8,
                    transition: 'background 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15 }}>
                        {a.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {badge.label}
                      </span>
                      {isUnread && (
                        <span
                          style={{
                            fontSize: 10,
                            background: `${C.blue}25`,
                            color: C.blue,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          UNREAD
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isUnread && (
                        <button
                          onClick={() => handleMarkRead(a.id)}
                          title="Mark as read"
                          style={{
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.25)',
                            color: C.success,
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Check size={12} /> Read
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(a.id)}
                        title="Resolve & Dismiss alert"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          color: C.danger,
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <X size={12} /> Clear
                      </button>
                    </div>
                  </div>

                  {/* Description: Product details, SKU, Region, Current Stock vs Reorder Level */}
                  <div style={{ color: C.textSecondary, fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>
                    {a.description}
                  </div>

                  {/* Metadata Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: C.textMuted }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ background: C.surface, padding: '2px 6px', borderRadius: 4 }}>
                        Severity: {a.severity}
                      </span>
                      <span style={{ background: C.surface, padding: '2px 6px', borderRadius: 4 }}>
                        Category: {a.category}
                      </span>
                    </div>
                    <span>{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ color: C.textMuted, fontSize: 14, textAlign: 'center', padding: 48 }}>
            <CheckCircle2 size={32} color={C.teal} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
            <p style={{ margin: 0, fontWeight: 500, color: C.textSecondary }}>No active alerts in this category.</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>All inventory thresholds and system parameters are normal.</p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
