'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ComposedChart, Line
} from 'recharts'
import { TrendingUp, RefreshCw, Wifi, AlertTriangle, ChevronDown, CheckCircle2 } from 'lucide-react'

const C = {
  bg: '#0A0F1E', surface: '#111827', surface2: '#1C2537', border: '#1E2D45',
  blue: '#3B8EE8', teal: '#00D4AA', warning: '#F59E0B', danger: '#EF4444',
  success: '#10B981', purple: '#8B5CF6', textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#64748B',
} as const

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

export default function ForecastPage() {
  const [series, setSeries]         = useState<{ date: string; actual_demand: number }[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [regions, setRegions]       = useState<string[]>([])
  const [comp, setComp]             = useState<any>(null)
  
  const [selCat, setSelCat]         = useState('')
  const [selReg, setSelReg]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [modelType, setModelType]   = useState<'lstm' | 'tft'>('tft')
  const [tftPreds, setTftPreds]     = useState<any[]>([])

  const loadSeries = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '60' })
    if (selCat) params.set('category', selCat)
    if (selReg) params.set('region', selReg)
    fetch(`${API}/api/forecast/demand-series?${params}`)
      .then(r => r.json())
      .then(d => { setSeries(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [selCat, selReg])

  const loadTftPredictions = useCallback(() => {
    if (!selCat || !selReg) {
      setTftPreds([])
      return
    }
    fetch(`${API}/api/forecast/tft-predict?category=${encodeURIComponent(selCat)}&region=${encodeURIComponent(selReg)}`)
      .then(r => r.json())
      .then(d => setTftPreds(d))
      .catch(() => setTftPreds([]))
  }, [selCat, selReg])

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/forecast/categories`).then(r => r.json()),
      fetch(`${API}/api/forecast/regions`).then(r => r.json()),
      fetch(`${API}/api/forecast/model-comparison`).then(r => r.json()),
    ]).then(([cats, regs, compData]) => {
      setCategories(cats)
      setRegions(regs)
      setComp(compData)
      setModelType(compData.recommended_model || 'tft')
    }).catch(() => setError(true))
  }, [])

  useEffect(() => { 
    loadSeries() 
    if (modelType === 'tft') {
      loadTftPredictions()
    }
  }, [loadSeries, modelType, loadTftPredictions])

  // Combine actual and predicted data
  let combinedData: any[] = series.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    actual: r.actual_demand,
  }))

  if (modelType === 'tft' && tftPreds.length > 0) {
    const predMapped = tftPreds.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      p50: p.p50,
      confidenceBand: [p.p10, p.p90]
    }))
    combinedData = [...combinedData, ...predMapped]
  }

  const activeMetrics = comp ? comp[modelType] : null
  const mape = activeMetrics?.mape ? `${activeMetrics.mape.toFixed(2)}%` : 'N/A'
  const mae  = activeMetrics?.mae  ? activeMetrics.mae.toFixed(2) : 'N/A'

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 26, fontWeight: 700, margin: 0 }}>Demand Forecast</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: '4px 0 0' }}>Temporal Fusion Transformer (TFT) Multi-Series Model</p>
        </div>
        <LiveBadge />
      </div>

      {error && (
        <div style={{ padding: 20, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, borderRadius: 10, marginBottom: 20, color: C.danger, fontSize: 13 }}>
          <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Unable to connect to SupplySense API. Make sure backend is running on port 8000.
        </div>
      )}

      {/* Comparison Banner */}
      {comp && comp.tft && comp.tft.mape && comp.lstm && comp.lstm.mape && (
        <GlassCard style={{ padding: 16, marginBottom: 24, background: 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(59,142,232,0.1) 100%)', border: `1px solid ${C.success}40` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {/* Model Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Test MAPE', value: mape, note: activeMetrics?.trained_on, color: modelType === 'tft' ? C.success : C.warning },
          { label: 'MAE', value: mae, note: 'Mean Absolute Error', color: C.blue },
          { label: 'Data Points', value: series.length.toLocaleString(), note: 'Historical window', color: C.teal },
          { label: 'Architecture', value: modelType.toUpperCase(), note: modelType === 'tft' ? 'Multi-horizon quantile' : 'Point prediction', color: C.purple },
        ].map(m => (
          <GlassCard key={m.label} style={{ padding: 18 }}>
            <p style={{ color: C.textMuted, fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</p>
            <p style={{ color: m.color, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{m.value}</p>
            <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{m.note}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>Filter:</span>
        <Select value={selCat} onChange={setSelCat} options={categories} label="Select Category..." />
        <Select value={selReg} onChange={setSelReg} options={regions} label="Select Region..." />
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
        
        {!selCat || !selReg ? (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.warning }}>Select a category and region to see TFT predictions.</span>
        ) : null}
      </GlassCard>

      {/* Main Chart */}
      <GlassCard style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>Forecast Analytics</h3>
            <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>
              {selCat || 'All categories'} · {selReg || 'All regions'}
            </p>
          </div>
          <span style={{ fontSize: 11, color: C.purple, background: `${C.purple}15`, padding: '4px 10px', borderRadius: 6 }}>
            {modelType.toUpperCase()} Inference
          </span>
        </div>
        
        {loading ? <Skeleton h={320} /> : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: C.textMuted, fontSize: 10 }} 
                tickLine={false}
                interval={Math.max(1, Math.floor(combinedData.length / 15))} 
              />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickLine={false} />
              
              <Tooltip 
                contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} 
                labelStyle={{ color: C.textPrimary, marginBottom: 4, fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              
              {/* Actual Demand Line */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                name="Actual Demand" 
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
                  name="TFT Forecast (p50)" 
                  stroke={C.purple} 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: C.purple, strokeWidth: 0 }} 
                />
              )}
              
              {/* Confidence Band (Area) */}
              {modelType === 'tft' && (
                <Area 
                  type="monotone" 
                  dataKey="confidenceBand" 
                  name="10th-90th Quantile" 
                  stroke="none" 
                  fill={C.purple} 
                  fillOpacity={0.15} 
                />
              )}
              
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </GlassCard>
    </div>
  )
}
