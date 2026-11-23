'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ComposedChart, Line
} from 'recharts'
import { TrendingUp, RefreshCw, Wifi, AlertTriangle, ChevronDown, CheckCircle2, Calendar, Layers, BarChart2 } from 'lucide-react'
import { getApiUrl, formatApiErrorMessage } from '@/lib/api/config'
import { fetchDemandSeries, fetchTftPredict } from '@/lib/api/client'
import { ApiAlertBanner } from '@/components/common/ApiAlertBanner'

const C = {
  bg: '#0A0F1E', surface: '#111827', surface2: '#1C2537', border: '#1E2D45',
  blue: '#3B8EE8', teal: '#00D4AA', warning: '#F59E0B', danger: '#EF4444',
  success: '#10B981', purple: '#8B5CF6', textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#64748B',
} as const

type ForecastInterval = 'daily' | 'weekly' | 'monthly' | 'quarterly'

function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(17,24,39,0.85)', border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  )
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

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 32px 8px 12px', color: C.textSecondary, fontSize: 13, cursor: 'pointer', minWidth: 160 }}
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} color={C.textMuted} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

function formatIntervalDate(dateStr: string, interval: ForecastInterval) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr

  if (interval === 'daily') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (interval === 'weekly') {
    return `Wk of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  if (interval === 'monthly') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (interval === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${d.getFullYear()}`
  }
  return dateStr
}

export default function ForecastPage() {
  const [series, setSeries]         = useState<{ date: string; actual_demand: number }[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [regions, setRegions]       = useState<string[]>([])
  const [comp, setComp]             = useState<any>(null)
  
  const [selCat, setSelCat]         = useState('')
  const [selReg, setSelReg]         = useState('')
  const [interval, setIntervalVal]  = useState<ForecastInterval>('daily')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [modelType, setModelType]   = useState<'lstm' | 'tft'>('tft')
  const [tftPreds, setTftPreds]     = useState<any[]>([])

  const loadSeries = useCallback(() => {
    setLoading(true)
    fetchDemandSeries(selCat || undefined, selReg || undefined, undefined, interval)
      .then((d: any) => { setSeries(Array.isArray(d) ? d : []); setLoading(false); setError(null) })
      .catch((e) => { setError(formatApiErrorMessage(e)); setLoading(false) })
  }, [selCat, selReg, interval])

  const loadTftPredictions = useCallback(() => {
    fetchTftPredict(selCat || undefined, selReg || undefined, interval)
      .then((d: any) => setTftPreds(Array.isArray(d) ? d : []))
      .catch(() => setTftPreds([]))
  }, [selCat, selReg, interval])

  useEffect(() => {
    Promise.all([
      fetch(getApiUrl('/api/forecast/categories')).then(r => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      }),
      fetch(getApiUrl('/api/forecast/regions')).then(r => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      }),
      fetch(getApiUrl('/api/forecast/model-comparison')).then(r => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      }),
    ]).then(([cats, regs, compData]) => {
      setCategories(cats)
      setRegions(regs)
      setComp(compData)
      setModelType(compData.recommended_model || 'tft')
      setError(null)
    }).catch((e) => setError(formatApiErrorMessage(e)))
  }, [])

  useEffect(() => { 
    loadSeries() 
    if (modelType === 'tft') {
      loadTftPredictions()
    }
  }, [loadSeries, modelType, loadTftPredictions])

  // Combine actual and predicted data mapped with consistent interval formatting
  let combinedData: any[] = series.map(r => ({
    date: formatIntervalDate(r.date, interval),
    rawDate: r.date,
    actual: r.actual_demand,
  }))

  if (modelType === 'tft' && tftPreds.length > 0) {
    const predMapped = tftPreds.map(p => ({
      date: formatIntervalDate(p.date, interval),
      rawDate: p.date,
      p50: p.p50,
      confidenceBand: [p.p10, p.p90]
    }))
    combinedData = [...combinedData, ...predMapped]
  }

  const activeMetrics = comp ? comp[modelType] : null
  const mape = activeMetrics?.mape ? `${activeMetrics.mape.toFixed(2)}%` : 'N/A'
  const mae  = activeMetrics?.mae  ? activeMetrics.mae.toFixed(2) : 'N/A'

  const totalHistorical = series.reduce((sum, r) => sum + (r.actual_demand || 0), 0)
  const totalForecasted = tftPreds.reduce((sum, p) => sum + (p.p50 || 0), 0)
  const horizonLabel = interval === 'daily' ? '7 Days' : interval === 'weekly' ? '8 Weeks' : interval === 'monthly' ? '6 Months' : '4 Quarters'

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 26, fontWeight: 700, margin: 0 }}>Demand Prediction</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>
            Forecast Analytics with multi-interval aggregation (Daily, Weekly, Monthly, Quarterly) and TFT quantile modeling.
          </p>
        </div>
        <LiveBadge />
      </div>

      {error && <ApiAlertBanner message={error} />}

      {/* Comparison Banner */}
      {comp && comp.tft && comp.tft.mape && comp.lstm && comp.lstm.mape && (
        <GlassCard style={{ padding: 16, marginBottom: 24, background: 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(59,142,232,0.1) 100%)', border: `1px solid ${C.success}40` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <CheckCircle2 color={C.success} size={20} />
              <div>
                <p style={{ margin: 0, color: C.textPrimary, fontWeight: 600, fontSize: 14 }}>TFT Model Selected for Production</p>
                <p style={{ margin: '2px 0 0', color: C.textMuted, fontSize: 13 }}>
                  TFT achieved <strong>{comp.tft.mape.toFixed(1)}% MAPE</strong> across all series, significantly outperforming the previous LSTM baseline ({comp.lstm.mape.toFixed(1)}%).
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', background: C.surface2, borderRadius: 8, padding: 4, border: `1px solid ${C.border}` }}>
              <button 
                onClick={() => setModelType('lstm')}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, fontWeight: modelType === 'lstm' ? 600 : 400, background: modelType === 'lstm' ? C.border : 'transparent', color: modelType === 'lstm' ? C.textPrimary : C.textMuted }}
              >
                LSTM
              </button>
              <button 
                onClick={() => setModelType('tft')}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, fontWeight: modelType === 'tft' ? 600 : 400, background: modelType === 'tft' ? C.blue : 'transparent', color: modelType === 'tft' ? '#fff' : C.textMuted }}
              >
                TFT (Active)
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Model Metrics & Volume Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <GlassCard style={{ padding: 18 }}>
          <p style={{ color: C.textMuted, fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Test MAPE</p>
          <p style={{ color: modelType === 'tft' ? C.success : C.warning, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{mape}</p>
          <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{activeMetrics?.trained_on || 'TFT Multi-Horizon'}</p>
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <p style={{ color: C.textMuted, fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Mean Absolute Error</p>
          <p style={{ color: C.blue, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{mae}</p>
          <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>Quantile Loss Optimization</p>
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <p style={{ color: C.textMuted, fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Historical Volume</p>
          <p style={{ color: C.teal, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{Math.round(totalHistorical).toLocaleString()}</p>
          <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>Across {series.length} {interval} periods</p>
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <p style={{ color: C.textMuted, fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Projected Demand (P50)</p>
          <p style={{ color: C.purple, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{Math.round(totalForecasted).toLocaleString()}</p>
          <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>Horizon: {horizonLabel}</p>
        </GlassCard>
      </div>

      {/* Filter Toolbar: Time Interval Segmented Control + Category + Region */}
      <GlassCard style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {/* Left side: Segmented Interval Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>Aggregation:</span>
          <div style={{ display: 'flex', background: C.surface2, borderRadius: 8, padding: 4, border: `1px solid ${C.border}`, gap: 4 }}>
            {[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'quarterly', label: 'Quarterly' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setIntervalVal(tab.id as ForecastInterval)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 6,
                  fontWeight: interval === tab.id ? 600 : 400,
                  background: interval === tab.id ? C.blue : 'transparent',
                  color: interval === tab.id ? '#FFFFFF' : C.textMuted,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Category and Region filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: C.textMuted, fontSize: 13 }}>Filter:</span>
          <Select value={selCat} onChange={setSelCat} options={categories} label="All Categories" />
          <Select value={selReg} onChange={setSelReg} options={regions} label="All Regions" />
          {(selCat || selReg) && (
            <button
              onClick={() => { setSelCat(''); setSelReg('') }}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={12} /> Clear
            </button>
          )}
          {selCat && <span style={{ background: `${C.blue}20`, color: C.blue, padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>{selCat}</span>}
          {selReg && <span style={{ background: `${C.teal}20`, color: C.teal, padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>{selReg}</span>}
        </div>
      </GlassCard>

      {/* Main Forecast Chart */}
      <GlassCard style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, margin: 0 }}>
              Forecast Analytics ({interval.toUpperCase()})
            </h3>
            <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>
              Historical demand series and TFT probabilistic quantiles (P10, P50, P90) · {selCat || 'All Categories'} · {selReg || 'All Regions'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.blue, background: `${C.blue}15`, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              {interval.toUpperCase()} INTERVAL
            </span>
            <span style={{ fontSize: 11, color: C.purple, background: `${C.purple}15`, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              {modelType.toUpperCase()} INFERENCE
            </span>
          </div>
        </div>
        
        {loading ? <Skeleton h={340} /> : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: C.textMuted, fontSize: 10 }} 
                tickLine={false}
                interval={Math.max(1, Math.floor(combinedData.length / 14))} 
              />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} />
              
              <Tooltip 
                contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} 
                labelStyle={{ color: C.textPrimary, marginBottom: 4, fontWeight: 600 }}
                formatter={(val: any, name: string) => {
                  if (Array.isArray(val)) {
                    return [`${Math.round(val[0]).toLocaleString()} - ${Math.round(val[1]).toLocaleString()} units`, name]
                  }
                  return [`${Math.round(val).toLocaleString()} units`, name]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              
              {/* Actual Demand Line */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                name={`Actual Demand (${interval})`} 
                stroke={C.blue} 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }} 
              />
              
              {/* TFT Prediction Line */}
              {modelType === 'tft' && (
                <Line 
                  type="monotone" 
                  dataKey="p50" 
                  name={`TFT Median Forecast (P50)`} 
                  stroke={C.purple} 
                  strokeWidth={2.5} 
                  strokeDasharray="5 5"
                  dot={{ r: 3.5, fill: C.purple, strokeWidth: 0 }} 
                />
              )}
              
              {/* Confidence Band (Area) */}
              {modelType === 'tft' && (
                <Area 
                  type="monotone" 
                  dataKey="confidenceBand" 
                  name="10th-90th Quantile Uncertainty" 
                  stroke="none" 
                  fill={C.purple} 
                  fillOpacity={0.16} 
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Forecast Breakdown Table */}
      {modelType === 'tft' && tftPreds.length > 0 && (
        <GlassCard style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>
                {interval.charAt(0).toUpperCase() + interval.slice(1)} Forecast Table
              </h3>
              <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>
                Multi-horizon predicted demand quantiles for upcoming {horizonLabel}
              </p>
            </div>
            <span style={{ fontSize: 12, color: C.teal, background: `${C.teal}15`, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              {tftPreds.length} Periods Ahead
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.textMuted, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>Period</th>
                  <th style={{ padding: '10px 12px' }}>P10 (Conservative)</th>
                  <th style={{ padding: '10px 12px' }}>P50 (Median Forecast)</th>
                  <th style={{ padding: '10px 12px' }}>P90 (Optimistic Buffer)</th>
                  <th style={{ padding: '10px 12px' }}>Uncertainty Range</th>
                </tr>
              </thead>
              <tbody>
                {tftPreds.map((p, idx) => {
                  const range = Math.round(p.p90 - p.p10)
                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.border}40`, color: C.textSecondary }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: C.textPrimary }}>
                        {formatIntervalDate(p.date, interval)}
                      </td>
                      <td style={{ padding: '12px', color: C.textMuted }}>
                        {Math.round(p.p10).toLocaleString()} units
                      </td>
                      <td style={{ padding: '12px', color: C.purple, fontWeight: 600, fontSize: 14 }}>
                        {Math.round(p.p50).toLocaleString()} units
                      </td>
                      <td style={{ padding: '12px', color: C.blue }}>
                        {Math.round(p.p90).toLocaleString()} units
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: 11, background: `${C.purple}20`, color: C.purple, padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>
                          ±{(range / 2).toLocaleString()} units
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
