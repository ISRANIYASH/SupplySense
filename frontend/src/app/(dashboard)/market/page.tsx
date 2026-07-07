'use client'

import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Wifi, AlertTriangle } from 'lucide-react'

const C = {
  bg: '#0A0F1E', surface: '#111827', surface2: '#1C2537', border: '#1E2D45',
  blue: '#3B8EE8', teal: '#00D4AA', warning: '#F59E0B', danger: '#EF4444',
  success: '#10B981', textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#64748B',
} as const

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SIGNAL_COLORS: Record<string, string> = {
  'STRONG BUY': '#DC2626', 'BUY': '#EA580C', 'HOLD': '#16A34A',
  'WAIT': '#D97706', 'REDUCE': '#7C3AED', 'NO_DATA': '#64748B',
}

function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'rgba(17,24,39,0.85)', border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>{children}</div>
}
function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: string }) {
  return <div style={{ height: h, width: w, background: C.surface2, borderRadius: 6 }} />
}
function LiveBadge() {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: `${C.teal}18`, border: `1px solid ${C.teal}30`, borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Wifi size={10} /> LIVE DATA
    </span>
  )
}

export default function MarketPage() {
  const [prices, setPrices]     = useState<Record<string, unknown>>({})
  const [analysis, setAnalysis] = useState<unknown[]>([])
  const [history, setHistory]   = useState<unknown[]>([])
  const [liveSummary, setLiveSummary] = useState<unknown[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/market/commodity-prices`).then(r => r.json()),
      fetch(`${API}/api/market/analysis`).then(r => r.json()),
      fetch(`${API}/api/market/price-history`).then(r => r.json()),
      fetch(`${API}/api/market/live-summary`).then(r => r.json()).catch(() => []),
    ]).then(([p, a, h, ls]) => {
      setPrices(p)
      setAnalysis(Array.isArray(a) ? a : [])
      setHistory(Array.isArray(h) ? h : [])
      setLiveSummary(Array.isArray(ls) ? ls : [])
      setLoading(false)
    }).catch(() => { setError(true); setLoading(false) })
  }, [])

  // Live prices from market scheduler
  const liveData = (prices as { source?: string; data?: Record<string, unknown> }).data || {}
  const liveSource = (prices as { source?: string }).source || 'unknown'

  // Historical price chart data
  const histChartData = (history as { date: string; close: number; rolling_avg_7day: number }[])
    .slice(-60)
    .map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      close: r.close,
      avg7: r.rolling_avg_7day,
    }))

  // Analysis signals
  const analysisArr = analysis as {
    commodity: string; signal: string; current_price: number;
    price_unit: string; change_pct_today: number; percentile_rank: number; reasoning: string
  }[]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 26, fontWeight: 700, margin: 0 }}>Market Intelligence</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>
            Live commodity prices · AI signals · {liveSource === 'live' ? 'Yahoo Finance live data' : 'Historical PostgreSQL data'}
          </p>
        </div>
        <LiveBadge />
      </div>

      {error && (
        <div style={{ padding: 20, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, borderRadius: 10, marginBottom: 20, color: C.danger, fontSize: 13 }}>
          <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Unable to connect to API. Make sure backend is running on port 8000.
        </div>
      )}

      {/* Live AI Signals — from market scheduler */}
      {analysisArr.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, margin: '0 0 14px' }}>AI Commodity Signals</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {analysisArr.map(a => {
              const color = SIGNAL_COLORS[a.signal] || C.textMuted
              const chg = a.change_pct_today || 0
              return (
                <GlassCard key={a.commodity} style={{ padding: 18, borderTop: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <p style={{ color: C.textSecondary, fontSize: 13, fontWeight: 600, margin: 0 }}>{a.commodity}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 4 }}>{a.signal}</span>
                  </div>
                  <p style={{ color: C.textPrimary, fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>
                    {a.current_price?.toFixed(2) ?? '—'} <span style={{ fontSize: 12, color: C.textMuted }}>{a.price_unit}</span>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {chg < 0 ? <TrendingDown size={13} color={C.danger} /> : <TrendingUp size={13} color={C.success} />}
                    <span style={{ color: chg < 0 ? C.danger : C.success, fontSize: 12, fontWeight: 600 }}>{chg > 0 ? '+' : ''}{chg.toFixed(2)}% today</span>
                  </div>
                  <div style={{ marginTop: 10, height: 5, background: C.surface2, borderRadius: 3 }}>
                    <div style={{ height: 5, width: `${a.percentile_rank || 0}%`, background: color, borderRadius: 3 }} />
                  </div>
                  <p style={{ color: C.textMuted, fontSize: 10, margin: '4px 0 0' }}>{(a.percentile_rank || 0).toFixed(1)}% of 1Y range</p>
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}

      {/* Live Prices from Postgres */}
      {(liveSummary as { commodity_name: string; current_price: number; change_pct: number; percentile_rank: number }[]).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, margin: '0 0 14px' }}>Live Prices (PostgreSQL)</h2>
          <GlassCard style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Commodity', 'Price', 'Change %', '1Y Low', '1Y High', 'Percentile', 'Fetched'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(liveSummary as { commodity_name: string; current_price: number; change_pct: number; price_1y_low: number; price_1y_high: number; percentile_rank: number; fetched_at: string }[]).map(r => (
                  <tr key={r.commodity_name} style={{ borderBottom: `1px solid ${C.border}33` }}>
                    <td style={{ padding: '12px 16px', color: C.textPrimary, fontSize: 13, fontWeight: 600 }}>{r.commodity_name}</td>
                    <td style={{ padding: '12px 16px', color: C.textPrimary, fontSize: 13 }}>{r.current_price?.toFixed(4)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: (r.change_pct || 0) < 0 ? C.danger : C.success, fontWeight: 600 }}>
                      {(r.change_pct || 0) > 0 ? '+' : ''}{(r.change_pct || 0).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 12 }}>{r.price_1y_low?.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 12 }}>{r.price_1y_high?.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      <div style={{ height: 6, background: C.surface2, borderRadius: 3, width: 80 }}>
                        <div style={{ height: 6, width: `${r.percentile_rank || 0}%`, background: C.blue, borderRadius: 3 }} />
                      </div>
                      <span style={{ color: C.textMuted, fontSize: 10 }}>{(r.percentile_rank || 0).toFixed(1)}%</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.textMuted, fontSize: 11 }}>
                      {r.fetched_at ? new Date(r.fetched_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}

      {/* Historical Price Chart */}
      <GlassCard style={{ padding: 24 }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>Commodity Price History</h3>
            <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>Last 60 data points · fact_commodity_prices · PostgreSQL</p>
          </div>
          <span style={{ fontSize: 11, color: C.blue, background: `${C.blue}15`, padding: '4px 10px', borderRadius: 6 }}>
            {history.length.toLocaleString()} total rows
          </span>
        </div>
        {loading ? <Skeleton h={250} /> : histChartData.length === 0 ? (
          <p style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>No historical price data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={histChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false}
                interval={Math.max(1, Math.floor(histChartData.length / 10))} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} />
              <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="close" name="Price" stroke={C.blue} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avg7" name="7D Avg" stroke={C.teal} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>
    </div>
  )
}
