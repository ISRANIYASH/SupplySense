'use client'

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
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
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Summary {
  total_skus: number
  total_inventory_value: number
  low_stock_items: number
  out_of_stock_items: number
  avg_days_of_stock: number
  inventory_turnover: number
}

interface StockStatusItem { name: string; value: number }
interface AbcItem { category: string; skus: number; value: number }
interface LowStockItem {
  product_name: string
  product_category: string
  current_stock: number
  reorder_point: number
  days_of_stock: number
  supplier_name: string
}
interface SeasonItem { month: string; value: number }

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

function KpiCard({ label, value, sub, accent, loading }: {
  label: string; value: string; sub?: string; accent: string; loading: boolean
}) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '24px 28px',
      position: 'relative',
      overflow: 'hidden',
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

function Card({ children, title, style = {} }: { children: React.ReactNode; title?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      ...style,
    }}>
      {title && <p style={{ color: C.textPrimary, fontSize: 15, fontWeight: 700, marginBottom: 20 }}>{title}</p>}
      {children}
    </div>
  )
}

const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B8EE8', '#00D4AA']
const TT_STYLE: React.CSSProperties = {
  background: '#1C2537',
  border: '1px solid #1E2D45',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#F1F5F9',
  fontSize: 13,
}

export default function InventoryPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [stockStatus, setStockStatus] = useState<StockStatusItem[]>([])
  const [abcData, setAbcData] = useState<AbcItem[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [seasonality, setSeasonality] = useState<SeasonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        const [r1, r2, r3, r4, r5] = await Promise.all([
          fetch(`${API}/api/inventory/summary`),
          fetch(`${API}/api/inventory/stock-status-distribution`),
          fetch(`${API}/api/inventory/abc-analysis`),
          fetch(`${API}/api/inventory/low-stock-items`),
          fetch(`${API}/api/inventory/seasonality-trend`),
        ])
        if (!r1.ok || !r2.ok || !r3.ok || !r4.ok || !r5.ok)
          throw new Error('One or more API endpoints returned an error.')
        const [s, ss, abc, ls, sea] = await Promise.all([
          r1.json(), r2.json(), r3.json(), r4.json(), r5.json(),
        ])
        setSummary(s)
        setStockStatus(ss)
        setAbcData(abc)
        setLowStock(ls)
        setSeasonality(sea)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`

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
          <h1 style={{ color: C.textPrimary, fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Inventory Intelligence</h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>Real-time stock levels, ABC analysis, and demand signals</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: 20, padding: '6px 14px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
          <span style={{ color: C.success, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>LIVE DATA</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.35)',
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <KpiCard label="Total SKUs" value={summary ? summary.total_skus.toLocaleString() : '—'} sub="Active products" accent={C.blue} loading={loading && !error} />
        <KpiCard label="Inventory Value" value={summary ? fmt(summary.total_inventory_value) : '—'} sub="At cost" accent={C.teal} loading={loading && !error} />
        <KpiCard label="Low Stock Items" value={summary ? summary.low_stock_items.toString() : '—'} sub="Below reorder point" accent={C.warning} loading={loading && !error} />
        <KpiCard label="Out of Stock" value={summary ? summary.out_of_stock_items.toString() : '—'} sub="Immediate action needed" accent={C.danger} loading={loading && !error} />
        <KpiCard label="Avg Days of Stock" value={summary ? `${summary.avg_days_of_stock.toFixed(1)}d` : '—'} sub="Coverage remaining" accent={C.success} loading={loading && !error} />
        <KpiCard label="Inventory Turnover" value={summary ? `${summary.inventory_turnover.toFixed(2)}x` : '—'} sub="Annualized rate" accent={C.blue} loading={loading && !error} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <Card title="Stock Status Distribution">
          {loading && !error ? (
            <Skeleton style={{ height: 260 }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stockStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={95} innerRadius={55}
                  paddingAngle={3}
                >
                  {stockStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="ABC Analysis — SKUs vs Value %">
          {loading && !error ? (
            <Skeleton style={{ height: 260 }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={abcData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="category" tick={{ fill: C.textMuted, fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 13 }} />
                <Bar dataKey="skus" name="SKUs" fill={C.blue} radius={[6, 6, 0, 0]} />
                <Bar dataKey="value" name="Value %" fill={C.teal} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Seasonality */}
      <Card title="Seasonality Trend — Monthly Inventory Index" style={{ marginBottom: 24 }}>
        {loading && !error ? (
          <Skeleton style={{ height: 220 }} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={seasonality} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="value" name="Index" radius={[6, 6, 0, 0]}>
                {seasonality.map((item, i) => (
                  <Cell key={i} fill={item.value >= 1 ? C.teal : C.warning} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Low Stock Table */}
      <Card title="⚠️ Low Stock Alerts">
        {loading && !error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} style={{ height: 44 }} />)}
          </div>
        ) : lowStock.length === 0 ? (
          <p style={{ color: C.textMuted, textAlign: 'center', padding: 32 }}>No low stock items found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Product', 'Category', 'Current Stock', 'Reorder Point', 'Days of Stock', 'Supplier'].map(h => (
                    <th key={h} style={{
                      color: C.textMuted, fontWeight: 600, padding: '10px 14px',
                      textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item, i) => {
                  const critical = item.days_of_stock < 7
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', color: C.textPrimary, fontWeight: 500 }}>{item.product_name}</td>
                      <td style={{ padding: '12px 14px', color: C.textMuted }}>{item.product_category}</td>
                      <td style={{ padding: '12px 14px', color: critical ? C.danger : C.warning, fontWeight: 700 }}>
                        {item.current_stock.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', color: C.textSecondary }}>{item.reorder_point.toLocaleString()}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: critical ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: critical ? C.danger : C.warning,
                          borderRadius: 6, padding: '3px 10px', fontWeight: 600, fontSize: 12,
                        }}>
                          {item.days_of_stock.toFixed(0)}d
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: C.textMuted }}>{item.supplier_name}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
