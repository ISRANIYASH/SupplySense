'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Package, ShoppingCart,
  AlertTriangle, CheckCircle2, DollarSign, Users,
  MapPin, Tag, RefreshCw, Wifi,
} from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0F1E', surface: '#111827', surface2: '#1C2537', border: '#1E2D45',
  blue: '#3B8EE8', teal: '#00D4AA', warning: '#F59E0B', danger: '#EF4444',
  success: '#10B981', textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#64748B',
} as const

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Custom hook for API fetching ─────────────────────────────────────────────
function useApiData<T>(url: string, defaultVal: T) {
  const [data, setData] = useState<T>(defaultVal)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [url])

  return { data, loading, error }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(17,24,39,0.85)', border: `1px solid ${C.border}`, borderRadius: 12, backdropFilter: 'blur(12px)', ...style }}>
      {children}
    </div>
  )
}

function LiveBadge() {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: `${C.teal}18`, border: `1px solid ${C.teal}30`, borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Wifi size={10} /> LIVE DATA
    </span>
  )
}

function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, background: C.surface2, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
}

function ErrorBox() {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: C.danger }}>
      <AlertTriangle size={24} style={{ marginBottom: 8 }} />
      <p style={{ margin: 0, fontSize: 13 }}>Unable to connect to SupplySense API.<br />Make sure backend is running on port 8000.</p>
    </div>
  )
}

function KpiTile({ label, value, sub, icon: Icon, color = C.blue, loading }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string; loading?: boolean
}) {
  return (
    <GlassCard style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: C.textMuted, fontSize: 12, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          {loading
            ? <Skeleton h={28} w={120} />
            : <p style={{ color: C.textPrimary, fontSize: 24, fontWeight: 700, margin: '6px 0 0' }}>{value}</p>}
          {sub && !loading && <p style={{ color: C.textMuted, fontSize: 11, margin: '4px 0 0' }}>{sub}</p>}
        </div>
        <div style={{ padding: 10, background: `${color}18`, borderRadius: 10 }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </GlassCard>
  )
}

function ChartCard({ title, subtitle, children, badge }: {
  title: string; subtitle?: string; children: React.ReactNode;
  badge?: { label: string; color: string }
}) {
  return (
    <GlassCard style={{ padding: 24 }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>{subtitle}</p>}
        </div>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: `${badge.color}18`, border: `1px solid ${badge.color}30`, borderRadius: 6, padding: '3px 8px' }}>
            {badge.label}
          </span>
        )}
      </div>
      {children}
    </GlassCard>
  )
}

const CATEGORY_COLORS = ['#3B8EE8', '#00D4AA', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ControlTowerPage() {
  const { data: kpis, loading: kpiLoading, error: kpiError }       = useApiData<Record<string, number | string>>(`${API}/api/dashboard/kpis`, {})
  const { data: trend, loading: trendLoading }                      = useApiData<{ date: string; total_demand: number }[]>(`${API}/api/dashboard/demand-trend`, [])
  const { data: categories, loading: catLoading }                   = useApiData<{ category_name: string; total_quantity: number; total_sales: number }[]>(`${API}/api/dashboard/top-categories`, [])
  const { data: regions, loading: regLoading }                      = useApiData<{ order_region: string; total_demand: number; risk_score: number }[]>(`${API}/api/dashboard/regional-demand`, [])

  const fmt = (n: number | undefined | null, prefix = '', suffix = '') =>
    n == null ? '—' : `${prefix}${n.toLocaleString()}${suffix}`

  const trendPoints = (trend as { date: string; total_demand: number }[]).map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    demand: r.total_demand,
  }))

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 26, fontWeight: 700, margin: 0 }}>Control Tower</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>Real-time supply chain intelligence — PostgreSQL live data</p>
        </div>
        <LiveBadge />
      </div>

      {kpiError && <ErrorBox />}

      {/* KPI Grid */}
      <motion.div
        initial="hidden" animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}
      >
        {[
          { label: 'Total Orders', value: fmt(kpis.total_orders as number), sub: 'fact_orders table', icon: ShoppingCart, color: C.blue },
          { label: 'Total SKUs', value: fmt(kpis.total_skus as number), sub: 'fact_inventory', icon: Package, color: C.teal },
          { label: 'Service Level', value: `${kpis.avg_service_level ?? '—'}%`, sub: 'On-time deliveries', icon: CheckCircle2, color: C.success },
          { label: 'Late Delivery Risk', value: `${kpis.late_delivery_risk_pct ?? '—'}%`, sub: 'avg risk score', icon: AlertTriangle, color: C.danger },
          { label: 'Total Suppliers', value: fmt(kpis.total_suppliers as number), sub: 'dim_suppliers', icon: Users, color: C.blue },
          { label: 'Avg Supplier Score', value: fmt(kpis.avg_supplier_score as number), sub: 'out of 100', icon: TrendingUp, color: C.warning },
          { label: 'Demand Units', value: fmt(kpis.total_demand_units as number), sub: 'fact_demand_daily', icon: TrendingUp, color: C.teal },
          { label: 'Avg Profit Margin', value: `${kpis.avg_profit_margin ?? '—'}%`, sub: 'order_item_profit_ratio', icon: DollarSign, color: C.success },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={itemVariants}>
            <KpiTile {...kpi} loading={kpiLoading} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Demand Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ChartCard title="Demand Trend" subtitle={`${trendPoints.length} data points from fact_demand_daily`} badge={{ label: 'REAL DATA', color: C.teal }}>
            {trendLoading ? <Skeleton h={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendPoints}>
                  <defs>
                    <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.teal} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} interval={Math.floor(trendPoints.length / 8)} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} />
                  <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="demand" name="Units Demanded" stroke={C.teal} fill="url(#dGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </motion.div>

        {/* Top Category */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard style={{ padding: 24, height: '100%' }}>
            <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Top Category</h3>
            <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 16px' }}>Highest demand category</p>
            {kpiLoading ? <Skeleton h={60} /> : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Tag size={32} color={C.blue} style={{ marginBottom: 12 }} />
                <p style={{ color: C.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>{kpis.top_category as string || '—'}</p>
                <p style={{ color: C.textMuted, fontSize: 12, margin: '6px 0 0' }}>Most demanded category</p>
              </div>
            )}
            <div style={{ marginTop: 16, padding: '12px 16px', background: C.surface2, borderRadius: 8 }}>
              <p style={{ color: C.textMuted, fontSize: 11, margin: '0 0 4px' }}>INVENTORY VALUE</p>
              {kpiLoading ? <Skeleton h={20} /> : (
                <p style={{ color: C.teal, fontSize: 18, fontWeight: 700, margin: 0 }}>
                  ${((kpis.total_inventory_value as number) / 1e6).toFixed(1)}M
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top Categories Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <ChartCard title="Top 10 Categories by Volume" subtitle="From fact_orders · real product categories">
            {catLoading ? <Skeleton h={220} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(categories as { category_name: string; total_quantity: number }[]).slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} />
                  <YAxis dataKey="category_name" type="category" tick={{ fill: C.textSecondary, fontSize: 11 }} tickLine={false} width={120} />
                  <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total_quantity" name="Units" radius={[0, 4, 4, 0]}>
                    {(categories as { category_name: string; total_quantity: number }[]).slice(0, 8).map((_: { category_name: string; total_quantity: number }, i: number) => (
                      <rect key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </motion.div>

        {/* Regional Demand */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ChartCard title="Regional Demand" subtitle="From fact_orders · real regions">
            {regLoading ? <Skeleton h={220} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
                {(regions as { order_region: string; total_demand: number; risk_score: number }[]).map((r, i) => {
                  const max = (regions as { order_region: string; total_demand: number }[])[0]?.total_demand || 1
                  const pct = (r.total_demand / max) * 100
                  return (
                    <div key={r.order_region}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: C.textSecondary, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={11} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          {r.order_region}
                        </span>
                        <span style={{ color: C.textPrimary, fontSize: 12, fontWeight: 600 }}>
                          {r.total_demand.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ height: 6, background: C.surface2, borderRadius: 3 }}>
                        <div style={{ height: 6, width: `${pct}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>
        </motion.div>
      </div>

      {/* Data source footer */}
      <div style={{ marginTop: 24, padding: '12px 16px', background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw size={13} color={C.teal} />
        <span style={{ color: C.textMuted, fontSize: 12 }}>
          Live data from PostgreSQL · 180,519 orders · 73,100 inventory records · 44,684 demand records · 35 suppliers
        </span>
      </div>
    </div>
  )
}
