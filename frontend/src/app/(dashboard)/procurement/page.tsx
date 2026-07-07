'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

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
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DeliveryAnalysisItem { shipping_mode: string; avg_days: number; order_count: number; on_time_rate: number }
interface SpendItem { category: string; total_spend: number; order_count: number }
interface MonthlySpendItem { month: string; total_spend: number; order_count: number }
interface DeliveryStatusItem { name: string; value: number }

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      background: `linear-gradient(90deg, ${C.surface2} 25%, #243047 50%, ${C.surface2} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 8,
      ...style,
    }} />
  )
}

function Card({ children, title, style = {} }: {
  children: React.ReactNode; title?: string; style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.3)', ...style,
    }}>
      {title && (
        <p style={{ color: C.textPrimary, fontSize: 15, fontWeight: 700, marginBottom: 20 }}>{title}</p>
      )}
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, accent, loading }: {
  label: string; value: string; sub?: string; accent: string; loading: boolean
}) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: '24px 28px', position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <p style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{label}</p>
      {loading ? (
        <>
          <Skeleton style={{ height: 32, width: '60%', marginBottom: 8 }} />
          <Skeleton style={{ height: 14, width: '40%' }} />
        </>
      ) : (
        <>
          <p style={{ color: C.textPrimary, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{value}</p>
          {sub && <p style={{ color: C.textMuted, fontSize: 13 }}>{sub}</p>}
        </>
      )}
    </div>
  )
}

const STATUS_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B8EE8']
const SHIPPING_COLORS: Record<string, string> = {
  'Standard Class': C.blue,
  'Second Class': C.teal,
  'First Class': C.purple,
  'Same Day': C.success,
}
const TT_STYLE: React.CSSProperties = {
  background: '#1C2537', border: '1px solid #1E2D45', borderRadius: 10,
  padding: '10px 14px', color: '#F1F5F9', fontSize: 13,
}

const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(0)}`

export default function ProcurementPage() {
  const [deliveryAnalysis, setDeliveryAnalysis] = useState<DeliveryAnalysisItem[]>([])
  const [spendByCategory, setSpendByCategory] = useState<SpendItem[]>([])
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpendItem[]>([])
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        const [r1, r2, r3, r4] = await Promise.all([
          fetch(`${API}/api/procurement/delivery-analysis`),
          fetch(`${API}/api/procurement/spend-by-category`),
          fetch(`${API}/api/procurement/monthly-spend`),
          fetch(`${API}/api/procurement/delivery-status`),
        ])
        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok)
          throw new Error('One or more procurement endpoints returned an error.')
        const [da, sc, ms, ds] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()])
        setDeliveryAnalysis(da)
        setSpendByCategory(sc)
        setMonthlySpend(ms)
        setDeliveryStatus(ds)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch procurement data.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Computed KPIs from data
  const totalSpend = spendByCategory.reduce((s, c) => s + c.total_spend, 0)
  const totalOrders = deliveryAnalysis.reduce((s, d) => s + d.order_count, 0)
  const avgOnTime = deliveryAnalysis.length > 0
    ? deliveryAnalysis.reduce((s, d) => s + d.on_time_rate, 0) / deliveryAnalysis.length
    : 0
  const avgDeliveryDays = deliveryAnalysis.length > 0
    ? deliveryAnalysis.reduce((s, d) => s + d.avg_days, 0) / deliveryAnalysis.length
    : 0

  // Format monthly spend for chart (show last 12)
  const monthlyChartData = monthlySpend.slice(-12).map(m => ({
    ...m,
    spend_k: +(m.total_spend / 1000).toFixed(1),
  }))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 40px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0F1E; }
        ::-webkit-scrollbar-thumb { background: #1E2D45; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Procurement Analytics</h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>Shipping performance, spend analysis, and delivery trends</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: 20, padding: '6px 14px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
          <span style={{ color: C.success, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>LIVE DATA</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <p style={{ color: C.danger, fontWeight: 700, fontSize: 15 }}>API Connection Error</p>
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
              {error} — Ensure FastAPI backend is running at {API}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        <KpiCard label="Total Spend" value={loading ? '—' : fmtMoney(totalSpend)} sub="Across all categories" accent={C.blue} loading={loading && !error} />
        <KpiCard label="Total Orders" value={loading ? '—' : totalOrders.toLocaleString()} sub="Across all shipping modes" accent={C.teal} loading={loading && !error} />
        <KpiCard label="On-Time Rate" value={loading ? '—' : `${avgOnTime.toFixed(1)}%`} sub="Average across modes" accent={C.success} loading={loading && !error} />
        <KpiCard label="Avg Delivery Days" value={loading ? '—' : `${avgDeliveryDays.toFixed(1)}d`} sub="Average lead time" accent={C.warning} loading={loading && !error} />
      </div>

      {/* Row 1: Monthly Trend + Delivery Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <Card title="Monthly Spend Trend ($ Thousands)">
          {loading && !error ? (
            <Skeleton style={{ height: 280 }} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: C.textMuted, fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  angle={-35} textAnchor="end" height={50}
                />
                <YAxis
                  tick={{ fill: C.textMuted, fontSize: 12 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}K`}
                />
                <Tooltip
                  contentStyle={TT_STYLE}
                  formatter={(v: number) => [`$${v}K`, 'Spend']}
                />
                <Line
                  type="monotone"
                  dataKey="spend_k"
                  name="Spend"
                  stroke={C.blue}
                  strokeWidth={2.5}
                  dot={{ fill: C.blue, r: 3 }}
                  activeDot={{ r: 6, fill: C.teal }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Delivery Status">
          {loading && !error ? (
            <Skeleton style={{ height: 280 }} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={deliveryStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={95} innerRadius={55}
                  paddingAngle={3}
                >
                  {deliveryStatus.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 2: Spend by Category + Shipping Mode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <Card title="Spend by Product Category">
          {loading && !error ? (
            <Skeleton style={{ height: 320 }} />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={spendByCategory.slice(0, 12)}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 120, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: C.textMuted, fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => fmtMoney(v)}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fill: C.textSecondary, fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={TT_STYLE}
                  formatter={(v: number) => [fmtMoney(v), 'Spend']}
                />
                <Bar dataKey="total_spend" name="Total Spend" fill={C.teal} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Shipping Mode Performance">
          {loading && !error ? (
            <Skeleton style={{ height: 320 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
              {deliveryAnalysis.map((item, i) => {
                const color = SHIPPING_COLORS[item.shipping_mode] || C.blue
                const pct = item.on_time_rate
                return (
                  <div key={i} style={{
                    background: C.surface2, borderRadius: 12,
                    padding: '16px 20px', border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <p style={{ color: C.textPrimary, fontWeight: 700, fontSize: 14 }}>{item.shipping_mode}</p>
                        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                          {item.order_count.toLocaleString()} orders · {item.avg_days.toFixed(1)} avg days
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color, fontSize: 20, fontWeight: 800 }}>{pct.toFixed(1)}%</p>
                        <p style={{ color: C.textMuted, fontSize: 11 }}>on-time</p>
                      </div>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: color,
                        borderRadius: 999,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Orders Table by Category */}
      <Card title="Category Spend Details">
        {loading && !error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(6)].map((_, i) => <Skeleton key={i} style={{ height: 44 }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Category', 'Total Spend', 'Order Count', 'Avg Order Value'].map(h => (
                    <th key={h} style={{
                      color: C.textMuted, fontWeight: 600, padding: '10px 14px',
                      textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spendByCategory.map((item, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 14px', color: C.textPrimary, fontWeight: 600 }}>{item.category}</td>
                    <td style={{ padding: '12px 14px', color: C.teal, fontWeight: 700 }}>{fmtMoney(item.total_spend)}</td>
                    <td style={{ padding: '12px 14px', color: C.textSecondary }}>{item.order_count.toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', color: C.textMuted }}>
                      {fmtMoney(item.total_spend / (item.order_count || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
