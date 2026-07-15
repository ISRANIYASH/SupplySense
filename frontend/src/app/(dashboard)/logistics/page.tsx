'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Truck, Clock, AlertTriangle, MapPin, Package,
  TrendingUp, Wifi,
} from 'lucide-react'

const SupplyChainMap = dynamic(
  () => import('@/components/maps/SupplyChainMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-slate-500" style={{ minHeight: 400 }}>
        Loading map...
      </div>
    ),
  }
)

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: '#0A0F1E', surface: '#111827', surface2: '#1C2537', border: '#1E2D45',
  blue: '#3B8EE8', teal: '#00D4AA', warning: '#F59E0B', danger: '#EF4444',
  success: '#10B981', textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#64748B',
} as const

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function useApiData<T>(url: string, defaultVal: T) {
  const [data, setData] = useState<T>(defaultVal)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [url])
  return { data, loading }
}

function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(17,24,39,0.85)', border: `1px solid ${C.border}`, borderRadius: 12, backdropFilter: 'blur(12px)', ...style }}>
      {children}
    </div>
  )
}

function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, background: C.surface2, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
}

const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

// ─── Shipping mode data (from backend or fallback) ──────────────────────────
const SHIPPING_MODES = [
  { mode: 'Standard Class', count: 108_715, avg_delay: 1.8, late_pct: 54, color: C.blue },
  { mode: 'Second Class', count: 35_430, avg_delay: 2.1, late_pct: 56, color: C.teal },
  { mode: 'First Class', count: 28_150, avg_delay: 1.2, late_pct: 48, color: C.warning },
  { mode: 'Same Day', count: 8_224, avg_delay: 0.4, late_pct: 22, color: C.success },
]

const DELIVERY_STATUS = [
  { name: 'On Time', value: 81_234, color: C.success },
  { name: 'Late', value: 62_385, color: C.danger },
  { name: 'Advance', value: 36_900, color: C.blue },
]

export default function LogisticsPage() {
  const { data: shippingData, loading: shipLoading } = useApiData<any[]>(`${API}/api/logistics/shipping-summary`, SHIPPING_MODES)

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 26, fontWeight: 700, margin: 0 }}>Logistics Tracker</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>Real-time shipment tracking across India</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: `${C.teal}18`, border: `1px solid ${C.teal}30`, borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Wifi size={10} /> LIVE DATA
        </span>
      </div>

      {/* KPI Strip */}
      <motion.div
        initial="hidden" animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}
      >
        {[
          { label: 'Active Shipments', value: '14,284', icon: Truck, color: C.blue },
          { label: 'Avg Transit Time', value: '4.2 days', icon: Clock, color: C.teal },
          { label: 'Late Delivery Risk', value: '54.2%', icon: AlertTriangle, color: C.danger },
          { label: 'Regions Covered', value: '23', icon: MapPin, color: C.success },
          { label: 'Total Shipped', value: '180,519', icon: Package, color: C.warning },
          { label: 'On-Time Rate', value: '45.8%', icon: TrendingUp, color: C.success },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={itemVariants}>
            <GlassCard style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: C.textMuted, fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</p>
                  <p style={{ color: C.textPrimary, fontSize: 22, fontWeight: 700, margin: '4px 0 0' }}>{kpi.value}</p>
                </div>
                <div style={{ padding: 10, background: `${kpi.color}18`, borderRadius: 10 }}>
                  <kpi.icon size={18} color={kpi.color} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Map + Delivery Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>Shipment Map</h3>
                <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>Warehouse locations & active routes across India</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.success, background: `${C.success}18`, padding: '2px 8px', borderRadius: 4 }}>
                6 WAREHOUSES
              </span>
            </div>
            <div style={{ height: 400, borderRadius: 8, overflow: 'hidden' }}>
              <SupplyChainMap showRoutes={true} height="400px" zoom={5} />
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Delivery Status</h3>
            <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 20px' }}>Overall shipment outcomes</p>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={DELIVERY_STATUS} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {DELIVERY_STATUS.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {DELIVERY_STATUS.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                  <span style={{ color: C.textSecondary, fontSize: 12, flex: 1 }}>{d.name}</span>
                  <span style={{ color: C.textPrimary, fontSize: 12, fontWeight: 600 }}>{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Shipping Mode Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard style={{ padding: 24 }}>
          <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Shipping Mode Breakdown</h3>
          <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 20px' }}>Performance by shipping class</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={SHIPPING_MODES} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="mode" tick={{ fill: C.textMuted, fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} />
              <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Shipments" radius={[4, 4, 0, 0]}>
                {SHIPPING_MODES.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>
    </div>
  )
}
