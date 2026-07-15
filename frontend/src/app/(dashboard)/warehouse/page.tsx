'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  Warehouse, Box, ArrowLeftRight, AlertTriangle, Wifi,
} from 'lucide-react'

const SupplyChainMap = dynamic(
  () => import('@/components/maps/SupplyChainMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-slate-500" style={{ minHeight: 300 }}>
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

function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(17,24,39,0.85)', border: `1px solid ${C.border}`, borderRadius: 12, backdropFilter: 'blur(12px)', ...style }}>
      {children}
    </div>
  )
}

const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

// Warehouse zone data
const ZONES = [
  { zone: 'Receiving', occupancy: 72, capacity: 500, skus: 84, color: C.blue },
  { zone: 'Storage A', occupancy: 91, capacity: 2000, skus: 312, color: C.success },
  { zone: 'Storage B', occupancy: 45, capacity: 1500, skus: 198, color: C.teal },
  { zone: 'Dispatch', occupancy: 63, capacity: 800, skus: 56, color: C.warning },
]

// Rack heatmap data (6 rows x 10 cols)
const RACK_ROWS = 6
const RACK_COLS = 10
function getRackColor(occ: number) {
  if (occ > 90) return C.danger
  if (occ > 70) return C.warning
  if (occ > 40) return C.success
  if (occ > 0) return C.blue
  return C.surface2
}

const RACK_DATA = Array.from({ length: RACK_ROWS * RACK_COLS }, (_, i) => {
  const seed = ((i * 7 + 13) * 31) % 100
  return { id: `R${Math.floor(i / RACK_COLS) + 1}-C${(i % RACK_COLS) + 1}`, occupancy: seed }
})

export default function WarehousePage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 26, fontWeight: 700, margin: 0 }}>Warehouse Digital Twin</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>Live warehouse layout, zone utilization & rack heatmap</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: `${C.teal}18`, border: `1px solid ${C.teal}30`, borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Wifi size={10} /> LIVE DATA
        </span>
      </div>

      {/* KPIs */}
      <motion.div
        initial="hidden" animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}
      >
        {[
          { label: 'Total Capacity', value: '4,800', icon: Warehouse, color: C.blue },
          { label: 'Utilization', value: '68%', icon: Box, color: C.teal },
          { label: 'Active SKUs', value: '650', icon: Box, color: C.success },
          { label: 'Pending Transfers', value: '23', icon: ArrowLeftRight, color: C.warning },
          { label: 'Critical Zones', value: '1', icon: AlertTriangle, color: C.danger },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={itemVariants}>
            <GlassCard style={{ padding: 20 }}>
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

      {/* Map + Zone Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>Warehouse Locations</h3>
              <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>6 warehouses across India</p>
            </div>
            <div style={{ height: 340, borderRadius: 8, overflow: 'hidden' }}>
              <SupplyChainMap showRoutes={false} height="340px" zoom={5} />
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard style={{ padding: 24, height: '100%' }}>
            <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Zone Utilization</h3>
            <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 20px' }}>Current occupancy by warehouse zone</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ZONES} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} unit="%" />
                <YAxis dataKey="zone" type="category" tick={{ fill: C.textSecondary, fontSize: 12 }} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="occupancy" name="Occupancy" radius={[0, 4, 4, 0]}>
                  {ZONES.map((z, i) => (
                    <Cell key={i} fill={z.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      </div>

      {/* Rack Heatmap */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard style={{ padding: 24 }}>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>Rack Occupancy Heatmap</h3>
              <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>60 rack positions across 4 zones</p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: C.textMuted }}>
              {[
                { label: 'Empty', color: C.surface2 },
                { label: 'Low', color: C.blue },
                { label: 'Normal', color: C.success },
                { label: 'High', color: C.warning },
                { label: 'Critical', color: C.danger },
              ].map((l) => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${RACK_COLS}, 1fr)`, gap: 4 }}>
            {RACK_DATA.map((rack) => (
              <div
                key={rack.id}
                style={{
                  aspectRatio: '1',
                  background: getRackColor(rack.occupancy),
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  color: rack.occupancy > 40 ? 'white' : C.textMuted,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
                title={`${rack.id}: ${rack.occupancy}% occupied`}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {rack.occupancy}%
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
