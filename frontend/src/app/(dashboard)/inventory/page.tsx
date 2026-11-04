'use client'
import { getApiUrl, formatApiErrorMessage } from '@/lib/api/config'
import { ApiAlertBanner } from '@/components/common/ApiAlertBanner'

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const C = {
  bg: '#0A0F1E', surface: '#111827', surface2: '#1C2537', border: '#1E2D45',
  blue: '#3B8EE8', teal: '#00D4AA', warning: '#F59E0B', danger: '#EF4444',
  success: '#10B981', textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#64748B',
}

interface Summary {
  total_skus: number
  total_stock: number
  low_stock_count: number
  excess_stock_count: number
  optimal_count: number
  avg_safety_stock: number
  total_inventory_value: number
}
interface StockStatusItem { stock_status: string; count: number; total_units: number }
interface AbcItem { category: string; revenue: number; product_count: number }
interface LowStockItem { product_id: string; category: string; region: string; avg_stock: number; safety_stock: number; avg_daily_sales: number; stock_status: string }
interface SeasonItem { seasonality: string | number; avg_units_sold: number; avg_inventory: number; avg_forecast: number }
interface InventoryItem { item_id: number; sku: string; item_name: string; category: string; region: string; stock: number; price: number; status: string; created_at: string }

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div style={{ background: `linear-gradient(90deg, ${C.surface2} 25%, #243047 50%, ${C.surface2} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 8, ...style }} />
}

function KpiCard({ label, value, sub, accent, loading }: { label: string; value: string; sub?: string; accent: string; loading: boolean }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px 28px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
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
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.3)', ...style }}>
      {title && <p style={{ color: C.textPrimary, fontSize: 15, fontWeight: 700, marginBottom: 20 }}>{title}</p>}
      {children}
    </div>
  )
}

const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B8EE8', '#00D4AA']
const TT_STYLE = { background: '#1C2537', border: '1px solid #1E2D45', borderRadius: 10, padding: '10px 14px', color: '#F1F5F9', fontSize: 13 }

export default function InventoryPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [stockStatus, setStockStatus] = useState<StockStatusItem[]>([])
  const [abcData, setAbcData] = useState<AbcItem[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [seasonality, setSeasonality] = useState<SeasonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Catalog state
  const [items, setItems] = useState<InventoryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [fSku, setFSku] = useState('')
  const [fName, setFName] = useState('')
  const [fCat, setFCat] = useState('')
  const [fReg, setFReg] = useState('North')
  const [fStock, setFStock] = useState<number>(100)
  const [fPrice, setFPrice] = useState<number>(49.99)
  const [fSafety, setFSafety] = useState<number>(50)
  const [fReorder, setFReorder] = useState<number>(100)
  const [formError, setFormError] = useState('')

  const fetchSummaryAndCharts = async () => {
    try {
      setLoading(true)
      setError(null)
      const [r1, r2, r3, r4, r5, r6] = await Promise.allSettled([
        fetch(getApiUrl(`/api/inventory/summary`)),
        fetch(getApiUrl(`/api/inventory/stock-status-distribution`)),
        fetch(getApiUrl(`/api/inventory/abc-analysis`)),
        fetch(getApiUrl(`/api/inventory/low-stock-items`)),
        fetch(getApiUrl(`/api/inventory/seasonality-trend`)),
        fetch(getApiUrl(`/api/inventory/categories`)),
      ])

      if (r1.status === 'fulfilled' && r1.value.ok) {
        setSummary(await r1.value.json())
      } else if (r1.status === 'fulfilled' && !r1.value.ok) {
        setError('Failed to load inventory summary statistics.')
      } else if (r1.status === 'rejected') {
        setError(formatApiErrorMessage(r1.reason))
      }

      if (r2.status === 'fulfilled' && r2.value.ok) {
        setStockStatus(await r2.value.json())
      }
      if (r3.status === 'fulfilled' && r3.value.ok) {
        setAbcData(await r3.value.json())
      }
      if (r4.status === 'fulfilled' && r4.value.ok) {
        setLowStock(await r4.value.json())
      }
      if (r5.status === 'fulfilled' && r5.value.ok) {
        setSeasonality(await r5.value.json())
      }
      if (r6.status === 'fulfilled' && r6.value.ok) {
        const catList = await r6.value.json()
        setCategories(catList)
        if (catList.length > 0 && !fCat) {
          setFCat(catList[0])
        }
      }
    } catch (err: any) {
      setError(formatApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaryAndCharts()
  }, [])

  const fetchItems = async () => {
    setLoadingItems(true)
    setItemsError(null)
    try {
      const q = new URLSearchParams({ limit: '20', offset: String(page * 20) })
      if (search.trim()) q.append('search', search.trim())
      if (categoryFilter !== 'all') q.append('category', categoryFilter)
      const res = await fetch(getApiUrl(`/api/inventory/items?${q.toString()}`))
      if (res.ok) {
        const d = await res.json()
        setItems(d.items || [])
        setTotalItems(d.total || 0)
      } else {
        const errJson = await res.json().catch(() => ({}))
        setItemsError(errJson.detail || 'Failed to retrieve catalog items.')
      }
    } catch (err: any) {
      setItemsError('Network error connecting to inventory API.')
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(fetchItems, 300)
    return () => clearTimeout(t)
  }, [page, search, categoryFilter])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const res = await fetch(getApiUrl(`/api/inventory/items`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: fSku.trim().toUpperCase(),
          item_name: fName.trim(),
          category: fCat || (categories[0] || 'Groceries'),
          region: fReg,
          stock: Number(fStock),
          price: Number(fPrice),
          safety_stock: Number(fSafety),
          reorder_point: Number(fReorder)
        })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Failed to add item')
      }
      
      const created = await res.json()
      // Reset form fields
      setFSku('')
      setFName('')
      setFStock(100)
      setFPrice(49.99)
      setFormError('')
      setShowAddModal(false)
      
      // Trigger success banner
      setSuccessBanner(`Item "${created?.item?.item_name || fSku}" created and stored successfully!`)
      setTimeout(() => setSuccessBanner(null), 5000)

      // Refresh items and summary
      setPage(0)
      fetchItems()
      fetch(getApiUrl(`/api/inventory/summary`))
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setSummary(data) })
        .catch(() => {})
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n: number | undefined | null) => {
    if (n == null) return '—'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${n.toFixed(2)}`
  }

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
      
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 32, width: 440, border: `1px solid ${C.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <h2 style={{ color: C.textPrimary, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Add New Inventory Item</h2>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>Register a new SKU and record its initial stock snapshot in PostgreSQL.</p>
            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: `1px solid ${C.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.danger, fontSize: 13 }}>
                {formError}
              </div>
            )}
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>SKU Code</label>
                <input required placeholder="e.g. P0022" value={fSku} onChange={e => setFSku(e.target.value.toUpperCase())} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Item Name</label>
                <input required placeholder="e.g. Ultra HD Display Monitor" value={fName} onChange={e => setFName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Category</label>
                  <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Region</label>
                  <select value={fReg} onChange={e => setFReg(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }}>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Initial Stock</label>
                  <input required type="number" min="0" placeholder="100" value={fStock} onChange={e => setFStock(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Unit Price ($)</label>
                  <input required type="number" min="0" step="0.01" placeholder="49.99" value={fPrice} onChange={e => setFPrice(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Safety Stock</label>
                  <input type="number" min="0" placeholder="50" value={fSafety} onChange={e => setFSafety(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Reorder Point</label>
                  <input type="number" min="0" placeholder="100" value={fReorder} onChange={e => setFReorder(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 20px', borderRadius: 8, background: C.blue, color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Inventory Management</h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>Manage products, categories, stock levels, and inventory records.</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setShowAddModal(true)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>+</span> Add Item
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <ApiAlertBanner error={error} />}
      {successBanner && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: `1px solid ${C.success}`, borderRadius: 12, padding: '14px 20px', marginBottom: 24, color: C.success, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {successBanner}</span>
          <button onClick={() => setSuccessBanner(null)} style={{ background: 'none', border: 'none', color: C.success, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <KpiCard label="Total SKUs" value={summary?.total_skus != null ? summary.total_skus.toLocaleString() : '—'} sub="Active master products" accent={C.blue} loading={loading && !error} />
        <KpiCard label="Inventory Value" value={summary?.total_inventory_value != null ? fmt(summary.total_inventory_value) : '—'} sub="Latest snapshot value" accent={C.teal} loading={loading && !error} />
        <KpiCard label="Total Stock Units" value={summary?.total_stock != null ? summary.total_stock.toLocaleString() : '—'} sub="Available units on hand" accent={C.success} loading={loading && !error} />
        <KpiCard label="Low Stock Items" value={summary?.low_stock_count != null ? summary.low_stock_count.toLocaleString() : '—'} sub="Below safety threshold" accent={C.warning} loading={loading && !error} />
        <KpiCard label="Excess Stock" value={summary?.excess_stock_count != null ? summary.excess_stock_count.toLocaleString() : '—'} sub="Overstocked items" accent={C.danger} loading={loading && !error} />
        <KpiCard label="Avg Safety Stock" value={summary?.avg_safety_stock != null ? summary.avg_safety_stock.toLocaleString(undefined, {maximumFractionDigits: 1}) : '—'} sub="Units per SKU" accent={C.blue} loading={loading && !error} />
      </div>

      {/* Item Catalog */}
      <Card title="Item Catalog" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <input 
            placeholder="Search SKU or Name..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(0) }} 
            style={{ padding: '10px 14px', borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, flex: 1, minWidth: 220, outline: 'none', fontSize: 13 }} 
          />
          <select 
            value={categoryFilter} 
            onChange={e => { setCategoryFilter(e.target.value); setPage(0) }} 
            style={{ padding: '10px 14px', borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, outline: 'none', fontSize: 13, minWidth: 160 }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {itemsError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.danger}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: C.danger, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{itemsError}</span>
            <button onClick={fetchItems} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Retry</button>
          </div>
        )}
        
        {loadingItems ? <Skeleton style={{ height: 260 }} /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '14px 12px', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '14px 12px', fontWeight: 600 }}>Item Name</th>
                  <th style={{ padding: '14px 12px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '14px 12px', fontWeight: 600 }}>Region</th>
                  <th style={{ padding: '14px 12px', fontWeight: 600 }}>Stock</th>
                  <th style={{ padding: '14px 12px', fontWeight: 600 }}>Price</th>
                  <th style={{ padding: '14px 12px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: C.textMuted }}>
                      No inventory items found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  items.map(it => (
                    <tr key={`${it.item_id}-${it.sku}-${it.region}`} style={{ borderBottom: `1px solid ${C.border}`, color: C.textPrimary }}>
                      <td style={{ padding: '12px 12px', fontWeight: 600, color: C.blue }}>{it.sku}</td>
                      <td style={{ padding: '12px 12px' }}>{it.item_name}</td>
                      <td style={{ padding: '12px 12px', color: C.textSecondary }}>{it.category}</td>
                      <td style={{ padding: '12px 12px', color: C.textSecondary }}>{it.region}</td>
                      <td style={{ padding: '12px 12px', fontWeight: 700 }}>{it.stock.toLocaleString()}</td>
                      <td style={{ padding: '12px 12px' }}>${it.price.toFixed(2)}</td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: 6, 
                          fontSize: 12, 
                          fontWeight: 600,
                          background: it.status === 'Low' ? 'rgba(239,68,68,0.15)' : it.status === 'Excess' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', 
                          color: it.status === 'Low' ? C.danger : it.status === 'Excess' ? C.warning : C.success 
                        }}>
                          {it.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
              <span style={{ color: C.textMuted, fontSize: 13 }}>
                Showing {items.length > 0 ? page * 20 + 1 : 0} - {Math.min((page + 1) * 20, totalItems)} of {totalItems.toLocaleString()} items
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '6px 14px', borderRadius: 6, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1, fontSize: 13 }}>
                  Previous
                </button>
                <span style={{ color: C.textMuted, fontSize: 13 }}>
                  Page {page + 1} of {Math.max(1, Math.ceil(totalItems / 20))}
                </span>
                <button disabled={(page + 1) * 20 >= totalItems} onClick={() => setPage(p => p + 1)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '6px 14px', borderRadius: 6, cursor: (page + 1) * 20 >= totalItems ? 'not-allowed' : 'pointer', opacity: (page + 1) * 20 >= totalItems ? 0.5 : 1, fontSize: 13 }}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <Card title="Stock Status Distribution">
          {loading && !error ? (
            <Skeleton style={{ height: 260 }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stockStatus} dataKey="count" nameKey="stock_status" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={3}>
                  {stockStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="ABC Analysis — Revenue vs SKUs">
          {loading && !error ? (
            <Skeleton style={{ height: 260 }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={abcData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="category" tick={{ fill: C.textMuted, fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 13 }} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill={C.teal} radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="product_count" name="SKUs" fill={C.blue} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}
