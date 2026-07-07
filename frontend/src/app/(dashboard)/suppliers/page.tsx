'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
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

interface Supplier {
  supplier_name: string
  supplier_overall_score: number
  quality_score: number
  delivery_score: number
  price_competitiveness: number
  relationship_score: number
  risk_level?: string
}

interface RiskItem { name: string; value: number }
interface ScoreItem { dimension: string; avg_score: number }

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

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? C.success : score >= 50 ? C.warning : C.danger
  const bg = score >= 75 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'
  return (
    <span style={{
      background: bg, color, borderRadius: 6, padding: '3px 10px',
      fontWeight: 700, fontSize: 12, display: 'inline-block',
    }}>
      {score.toFixed(1)}
    </span>
  )
}

const RISK_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B8EE8']
const TT_STYLE: React.CSSProperties = {
  background: '#1C2537', border: '1px solid #1E2D45', borderRadius: 10,
  padding: '10px 14px', color: '#F1F5F9', fontSize: 13,
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [riskData, setRiskData] = useState<RiskItem[]>([])
  const [scoreData, setScoreData] = useState<ScoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortBy, setSortBy] = useState<keyof Supplier>('supplier_overall_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        const [r1, r2, r3] = await Promise.all([
          fetch(`${API}/api/suppliers/all`),
          fetch(`${API}/api/suppliers/risk-distribution`),
          fetch(`${API}/api/suppliers/score-breakdown`),
        ])
        if (!r1.ok || !r2.ok || !r3.ok)
          throw new Error('One or more supplier endpoints returned an error.')
        const [s, rd, sb] = await Promise.all([r1.json(), r2.json(), r3.json()])
        setSuppliers(s)
        setRiskData(rd)
        setScoreData(sb)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch supplier data.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleSort = (col: keyof Supplier) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const filtered = suppliers
    .filter(s => s.supplier_name.toLowerCase().includes(search.toLowerCase()))
    .filter(s => riskFilter === 'all' || (s.risk_level || '').toLowerCase() === riskFilter)
    .sort((a, b) => {
      const av = a[sortBy]
      const bv = b[sortBy]
      const mult = sortDir === 'asc' ? 1 : -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult
      return String(av).localeCompare(String(bv)) * mult
    })

  const riskLevels = ['all', ...Array.from(new Set(suppliers.map(s => (s.risk_level || '').toLowerCase()).filter(Boolean)))]

  const scoreColumns: { key: keyof Supplier; label: string }[] = [
    { key: 'supplier_overall_score', label: 'Overall Score' },
    { key: 'quality_score', label: 'Quality' },
    { key: 'delivery_score', label: 'Delivery' },
    { key: 'price_competitiveness', label: 'Price' },
    { key: 'relationship_score', label: 'Relationship' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 40px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0F1E; }
        ::-webkit-scrollbar-thumb { background: #1E2D45; border-radius: 3px; }
        input::placeholder { color: #64748B; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Supplier Intelligence</h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            {loading ? 'Loading supplier data…' : `${suppliers.length} suppliers — performance scores and risk analysis`}
          </p>
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

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <Card title="Risk Distribution">
          {loading && !error ? (
            <Skeleton style={{ height: 240 }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90} innerRadius={50}
                  paddingAngle={3}
                >
                  {riskData.map((_, i) => (
                    <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Average Score by Dimension">
          {loading && !error ? (
            <Skeleton style={{ height: 240 }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreData} layout="vertical" margin={{ top: 8, right: 16, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dimension" tick={{ fill: C.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="avg_score" name="Avg Score" fill={C.blue} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Search + Filter */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 16 }}>🔍</span>
            <input
              type="text"
              placeholder="Search suppliers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '10px 14px 10px 40px', color: C.textPrimary,
                fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {riskLevels.map(r => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                style={{
                  background: riskFilter === r ? C.blue : C.surface2,
                  border: `1px solid ${riskFilter === r ? C.blue : C.border}`,
                  borderRadius: 8, padding: '8px 16px', color: riskFilter === r ? '#fff' : C.textMuted,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {r === 'all' ? 'All Risks' : r}
              </button>
            ))}
          </div>
          <p style={{ color: C.textMuted, fontSize: 13 }}>
            {filtered.length} of {suppliers.length} suppliers
          </p>
        </div>
      </Card>

      {/* Supplier Table */}
      <Card>
        {loading && !error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(8)].map((_, i) => <Skeleton key={i} style={{ height: 48 }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ color: C.textMuted, fontWeight: 600, padding: '10px 14px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                    Supplier Name
                  </th>
                  {scoreColumns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{
                        color: sortBy === col.key ? C.blue : C.textMuted,
                        fontWeight: 600, padding: '10px 14px',
                        textAlign: 'center', borderBottom: `1px solid ${C.border}`,
                        whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
                      }}
                    >
                      {col.label} {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                  {suppliers[0]?.risk_level !== undefined && (
                    <th style={{ color: C.textMuted, fontWeight: 600, padding: '10px 14px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>Risk</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const rl = (s.risk_level || '').toLowerCase()
                  const riskColor = rl === 'high' ? C.danger : rl === 'medium' ? C.warning : C.success
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', color: C.textPrimary, fontWeight: 600 }}>
                        {s.supplier_name}
                      </td>
                      {scoreColumns.map(col => (
                        <td key={col.key} style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <ScoreBadge score={Number(s[col.key])} />
                        </td>
                      ))}
                      {s.risk_level !== undefined && (
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            background: rl === 'high' ? 'rgba(239,68,68,0.15)' : rl === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                            color: riskColor, borderRadius: 6, padding: '3px 10px',
                            fontWeight: 600, fontSize: 12, textTransform: 'capitalize',
                          }}>
                            {s.risk_level}
                          </span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p style={{ color: C.textMuted, textAlign: 'center', padding: '32px 0' }}>No suppliers match your filters.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
