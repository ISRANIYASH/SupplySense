'use client'

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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Summary { total_skus: number; total_stock: number; low_stock_count: number; excess_stock_count: number; optimal_count: number; avg_safety_stock: number; total_inventory_value: number }
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

  // Catalog state
  const [items, setItems] = useState<InventoryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Form state
  const [fSku, setFSku] = useState('')
  const [fName, setFName] = useState('')
  const [fCat, setFCat] = useState('')
  const [fReg, setFReg] = useState('North')
  const [fStock, setFStock] = useState(0)
  const [fPrice, setFPrice] = useState(0)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        const [r1, r2, r3, r4, r5, r6] = await Promise.all([
          fetch(`${API}/api/inventory/summary`),
          fetch(`${API}/api/inventory/stock-status-distribution`),
          fetch(`${API}/api/inventory/abc-analysis`),
          fetch(`${API}/api/inventory/low-stock-items`),
          fetch(`${API}/api/inventory/seasonality-trend`),
          fetch(`${API}/api/inventory/categories`),
        ])
        if (!r1.ok) throw new Error('API Error')
        setSummary(await r1.json())
        setStockStatus(await r2.json())
        setAbcData(await r3.json())
        setLowStock(await r4.json())
        setSeasonality(await r5.json())
        setCategories(await r6.json())
      } catch (err: any) { setError(err.message) } finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  const fetchItems = async () => {
    setLoadingItems(true)
    try {
      const q = new URLSearchParams({ limit: '20', offset: String(page * 20) })
      if (search) q.append('search', search)
      if (categoryFilter !== 'all') q.append('category', categoryFilter)
      const res = await fetch(`${API}/api/inventory/items?${q.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setItems(d.items)
        setTotalItems(d.total)
      }
    } catch {}
    setLoadingItems(false)
  }

  useEffect(() => {
    const t = setTimeout(fetchItems, 300)
    return () => clearTimeout(t)
  }, [page, search, categoryFilter])

  const handleAddItem = async (e: any) => {
    e.preventDefault()
    setFormError('')
    try {
      const res = await fetch(`${API}/api/inventory/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: fSku, item_name: fName, category: fCat || categories[0], region: fReg, stock: fStock, price: fPrice
        })
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.detail || 'Failed to add item')
      }
      setShowAddModal(false)
      fetchItems() // refresh
      // Reset summary
      fetch(`${API}/api/inventory/summary`).then(r => r.json()).then(setSummary)
    } catch (e: any) {
      setFormError(e.message)
    }
  }

  const fmt = (n: number | undefined | null) => n == null ? '—' : n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n}`

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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 32, width: 400, border: `1px solid ${C.border}` }}>
            <h2 style={{ color: C.textPrimary, marginBottom: 20 }}>Add New Item</h2>
            {formError && <p style={{ color: C.danger, marginBottom: 16, fontSize: 14 }}>{formError}</p>}
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input required placeholder="SKU (e.g. P0021)" value={fSku} onChange={e=>setFSku(e.target.value)} style={{ padding: 12, borderRadius: 8, background: C.surface2, color: C.textPrimary, border: 'none' }} />
              <input required placeholder="Item Name" value={fName} onChange={e=>setFName(e.target.value)} style={{ padding: 12, borderRadius: 8, background: C.surface2, color: C.textPrimary, border: 'none' }} />
              <input required placeholder="Category" value={fCat} onChange={e=>setFCat(e.target.value)} list="cats" style={{ padding: 12, borderRadius: 8, background: C.surface2, color: C.textPrimary, border: 'none' }} />
              <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
              <select value={fReg} onChange={e=>setFReg(e.target.value)} style={{ padding: 12, borderRadius: 8, background: C.surface2, color: C.textPrimary, border: 'none' }}>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
              </select>
              <div style={{ display: 'flex', gap: 16 }}>
                <input required type="number" min="0" placeholder="Initial Stock" value={fStock} onChange={e=>setFStock(Number(e.target.value))} style={{ flex: 1, padding: 12, borderRadius: 8, background: C.surface2, color: C.textPrimary, border: 'none' }} />
                <input required type="number" min="0" step="0.01" placeholder="Price" value={fPrice} onChange={e=>setFPrice(Number(e.target.value))} style={{ flex: 1, padding: 12, borderRadius: 8, background: C.surface2, color: C.textPrimary, border: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={()=>setShowAddModal(false)} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', color: C.textSecondary, border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', borderRadius: 8, background: C.blue, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Inventory Intelligence</h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>Real-time stock levels, ABC analysis, and demand signals</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setShowAddModal(true)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>+ Add Item</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <KpiCard label="Total SKUs" value={summary?.total_skus != null ? summary.total_skus.toLocaleString() : '—'} sub="Active products" accent={C.blue} loading={loading && !error} />
        <KpiCard label="Inventory Value" value={summary?.total_inventory_value != null ? fmt(summary.total_inventory_value) : '—'} sub="At cost" accent={C.teal} loading={loading && !error} />
        <KpiCard label="Total Stock Units" value={summary?.total_stock != null ? summary.total_stock.toLocaleString() : '—'} sub="Units on hand" accent={C.success} loading={loading && !error} />
        <KpiCard label="Low Stock Items" value={summary?.low_stock_count != null ? summary.low_stock_count.toLocaleString() : '—'} sub="Below safety stock" accent={C.warning} loading={loading && !error} />
        <KpiCard label="Excess Stock" value={summary?.excess_stock_count != null ? summary.excess_stock_count.toLocaleString() : '—'} sub="Overstocked items" accent={C.danger} loading={loading && !error} />
        <KpiCard label="Avg Safety Stock" value={summary?.avg_safety_stock != null ? summary.avg_safety_stock.toLocaleString(undefined, {maximumFractionDigits: 1}) : '—'} sub="Per SKU" accent={C.blue} loading={loading && !error} />
      </div>

      <Card title="Item Catalog" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <input placeholder="Search SKU or Name..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} style={{ padding: '10px 14px', borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, flex: 1, minWidth: 200, outline: 'none' }} />
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0) }} style={{ padding: '10px 14px', borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, outline: 'none' }}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        {loadingItems ? <Skeleton style={{ height: 200 }} /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: 12 }}>SKU</th>
                  <th style={{ padding: 12 }}>Item Name</th>
                  <th style={{ padding: 12 }}>Category</th>
                  <th style={{ padding: 12 }}>Region</th>
                  <th style={{ padding: 12 }}>Stock</th>
                  <th style={{ padding: 12 }}>Price</th>
                  <th style={{ padding: 12 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.item_id} style={{ borderBottom: `1px solid ${C.border}`, color: C.textPrimary }}>
                    <td style={{ padding: 12 }}>{it.sku}</td>
                    <td style={{ padding: 12 }}>{it.item_name}</td>
                    <td style={{ padding: 12, color: C.textSecondary }}>{it.category}</td>
                    <td style={{ padding: 12, color: C.textSecondary }}>{it.region}</td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{it.stock}</td>
                    <td style={{ padding: 12 }}>${it.price.toFixed(2)}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, background: it.status === 'Low' ? 'rgba(239,68,68,0.15)' : it.status === 'Excess' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: it.status === 'Low' ? C.danger : it.status === 'Excess' ? C.warning : C.success }}>{it.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
               <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '6px 12px', borderRadius: 6, cursor: page === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
               <span style={{ color: C.textMuted, padding: '6px 0' }}>Page {page + 1} of {Math.max(1, Math.ceil(totalItems / 20))}</span>
               <button disabled={(page + 1) * 20 >= totalItems} onClick={() => setPage(p => p + 1)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '6px 12px', borderRadius: 6, cursor: (page + 1) * 20 >= totalItems ? 'not-allowed' : 'pointer' }}>Next</button>
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
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={C.teal} radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="product_count" name="SKUs" fill={C.blue} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}
