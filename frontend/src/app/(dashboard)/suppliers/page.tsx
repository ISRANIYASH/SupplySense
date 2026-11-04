'use client'
import { getApiUrl, formatApiErrorMessage } from '@/lib/api/config'
import { ApiAlertBanner } from '@/components/common/ApiAlertBanner'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const C = {
  bg: '#0A0F1E', surface: '#111827', surface2: '#1C2537', border: '#1E2D45',
  blue: '#3B8EE8', teal: '#00D4AA', warning: '#F59E0B', danger: '#EF4444',
  success: '#10B981', textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#64748B',
}


interface Supplier {
  supplier_id: number
  supplier_name: string
  supplier_overall_score: number
  quality_score: number
  service_score: number
  price_score: number
  reputation_score: number
  risk_level?: string
}

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div style={{ background: `linear-gradient(90deg, ${C.surface2} 25%, #243047 50%, ${C.surface2} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 8, ...style }} />
}

function Card({ children, title, style = {} }: { children: React.ReactNode; title?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.3)', ...style }}>
      {title && <p style={{ color: C.textPrimary, fontSize: 15, fontWeight: 700, marginBottom: 20 }}>{title}</p>}
      {children}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? C.success : score >= 50 ? C.warning : C.danger
  const bg = score >= 75 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'
  return <span style={{ background: bg, color, borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12, display: 'inline-block' }}>{Number(score).toFixed(1)}</span>
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const limit = 20
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortBy, setSortBy] = useState('supplier_overall_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true)
      try {
        const res = await fetch(getApiUrl(`/api/suppliers/list?limit=${limit}&offset=${page*limit}&search=${search}&risk_level=${riskFilter}&sort_by=${sortBy}&sort_dir=${sortDir}`))
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()
        setSuppliers(data.items)
        setTotal(data.total)
      } catch (err) {
        setError('Failed to fetch suppliers')
      } finally {
        setLoading(false)
      }
    }
    const t = setTimeout(fetchList, 300)
    return () => clearTimeout(t)
  }, [page, search, riskFilter, sortBy, sortDir])

  const handleSort = (col: string) => {
    if (sortBy === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else { 
        setSortBy(col); 
        setSortDir('desc');
    }
    setPage(0);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 40px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      
      {selectedSupplier && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 450, background: C.surface, height: '100%', borderLeft: `1px solid ${C.border}`, padding: 32, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ color: C.textPrimary, fontSize: 22 }}>{selectedSupplier.supplier_name}</h2>
              <button onClick={() => setSelectedSupplier(null)} style={{ background: 'transparent', border: 'none', color: C.textMuted, fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            
            <p style={{ color: C.textSecondary, marginBottom: 24, fontSize: 14 }}>
              Note: Contact information and related orders are not available in the current database schema. Showing all available performance metrics from <code>dim_suppliers</code>.
            </p>
            
            <Card style={{ marginBottom: 20 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <span style={{ color: C.textMuted }}>Risk Level</span>
                 <span style={{ color: selectedSupplier.risk_level === 'High Risk' ? C.danger : selectedSupplier.risk_level === 'Medium Risk' ? C.warning : C.success, fontWeight: 'bold' }}>{selectedSupplier.risk_level}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <span style={{ color: C.textMuted }}>Overall Score</span>
                 <ScoreBadge score={Number(selectedSupplier.supplier_overall_score)} />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <span style={{ color: C.textMuted }}>Quality Score</span>
                 <ScoreBadge score={Number(selectedSupplier.quality_score)} />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <span style={{ color: C.textMuted }}>Service Score</span>
                 <ScoreBadge score={Number(selectedSupplier.service_score)} />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <span style={{ color: C.textMuted }}>Price Score</span>
                 <ScoreBadge score={Number(selectedSupplier.price_score)} />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: C.textMuted }}>Reputation Score</span>
                 <ScoreBadge score={Number(selectedSupplier.reputation_score)} />
               </div>
            </Card>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <h1 style={{ color: C.textPrimary, fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Supplier Management</h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>View supplier information and evaluate supplier performance.</p>
        </div>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.textPrimary, outline: 'none' }}
            />
          </div>
          <select 
            value={riskFilter} 
            onChange={e => { setRiskFilter(e.target.value); setPage(0); }}
            style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '10px 14px', borderRadius: 10, outline: 'none' }}
          >
            <option value="all">All Risks</option>
            <option value="low risk">Low Risk</option>
            <option value="medium risk">Medium Risk</option>
            <option value="high risk">High Risk</option>
          </select>
          <p style={{ color: C.textMuted, fontSize: 14 }}>Total: {total}</p>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(8)].map((_, i) => <Skeleton key={i} style={{ height: 48 }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ color: C.textMuted, padding: '10px 14px', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>Supplier Name</th>
                  <th onClick={() => handleSort('supplier_overall_score')} style={{ cursor: 'pointer', color: sortBy === 'supplier_overall_score' ? C.blue : C.textMuted, padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>Overall {sortBy === 'supplier_overall_score' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('quality_score')} style={{ cursor: 'pointer', color: sortBy === 'quality_score' ? C.blue : C.textMuted, padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>Quality {sortBy === 'quality_score' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  <th style={{ color: C.textMuted, padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.supplier_id} onClick={() => setSelectedSupplier(s)} style={{ cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 14px', color: C.textPrimary }}>{s.supplier_name}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}><ScoreBadge score={Number(s.supplier_overall_score)} /></td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}><ScoreBadge score={Number(s.quality_score)} /></td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: s.risk_level === 'High Risk' ? C.danger : s.risk_level === 'Medium Risk' ? C.warning : C.success }}>{s.risk_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
               <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '8px 16px', borderRadius: 8, cursor: page === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
               <span style={{ color: C.textMuted, padding: '8px 0' }}>Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}</span>
               <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary, padding: '8px 16px', borderRadius: 8, cursor: (page + 1) * limit >= total ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
