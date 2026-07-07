'use client'
import React, { useState, useEffect } from 'react'

const C = { bg:'#0A0F1E', surface:'#111827', surface2:'#1C2537', border:'#1E2D45', blue:'#3B8EE8', teal:'#00D4AA', warning:'#F59E0B', danger:'#EF4444', success:'#10B981', purple:'#8B5CF6', textPrimary:'#F1F5F9', textSecondary:'#CBD5E1', textMuted:'#64748B' } as const
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function GlassCard({children,style={}}: {children:React.ReactNode,style?:React.CSSProperties}) {
  return <div style={{background:'rgba(17,24,39,0.85)',border:`1px solid ${C.border}`,borderRadius:12,...style}}>{children}</div>
}
function Skeleton({h=20,w='100%'}:{h?:number,w?:string}) {
  return <div style={{height:h,width:w,background:C.surface2,borderRadius:6,animation:'pulse 1.5s ease-in-out infinite'}}/>
}
function LiveBadge() {
  return <span style={{fontSize:11,fontWeight:700,color:C.teal,background:`${C.teal}18`,border:`1px solid ${C.teal}30`,borderRadius:6,padding:'3px 8px',display:'flex',alignItems:'center',gap:4}}>🟢 LIVE DATA</span>
}

export default function MLOpsPage() {
  const [runs, setRuns] = useState<any>(null)
  const [models, setModels] = useState<any>(null)
  const [dag, setDag] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/mlops/experiment-runs`).then(r=>r.json()),
      fetch(`${API}/api/mlops/model-registry`).then(r=>r.json()),
      fetch(`${API}/api/mlops/dag-status`).then(r=>r.json())
    ]).then(([r, m, d]) => {
      setRuns(r)
      setModels(m)
      setDag(d)
      setLoading(false)
    }).catch(console.error)
  }, [])

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>MLOps Center</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>Pipeline execution, model registry, and experiment tracking</p>
        </div>
        <LiveBadge />
      </div>

      <GlassCard style={{padding:24,marginBottom:24}}>
        <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 16px'}}>Pipeline DAG Status</h3>
        <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>
          {loading ? Array.from({length:5}).map((_,i)=><Skeleton key={i} w='180px' h='60px'/>) : 
            dag?.map((step:any) => (
              <div key={step.name} style={{minWidth:160,background:C.surface2,padding:12,borderRadius:8,border:`1px solid ${step.status==='success'?C.success:C.warning}40`}}>
                <div style={{fontSize:12,color:C.textSecondary,fontWeight:600}}>{step.name}</div>
                <div style={{fontSize:11,color:step.status==='success'?C.success:C.warning,marginTop:4}}>
                  {step.status==='success'?'✅ Success':'⏳ Pending'}
                </div>
              </div>
            ))
          }
        </div>
      </GlassCard>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        <GlassCard style={{padding:24}}>
          <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 16px'}}>Model Registry</h3>
          {loading ? <Skeleton h={100}/> : models?.models?.length > 0 ? (
            models.models.map((m:any) => (
              <div key={m.name} style={{background:C.surface2,padding:16,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{color:C.textPrimary,fontWeight:600}}>{m.name} v{m.version}</div>
                  <div style={{color:C.success,fontSize:11,background:`${C.success}20`,padding:'2px 8px',borderRadius:4}}>Production</div>
                </div>
                <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>File: {m.file} ({m.file_size_mb} MB)</div>
                <div style={{fontSize:12,color:C.textMuted}}>Architecture: {m.architecture}</div>
                {m.metrics && <div style={{fontSize:12,color:C.blue,marginTop:8}}>MAPE: {m.metrics.test_mape?.toFixed(2)}% | MAE: {m.metrics.test_mae?.toFixed(2)}</div>}
              </div>
            ))
          ) : (
            <div style={{color:C.textMuted,fontSize:13}}>{models?.note}</div>
          )}
        </GlassCard>

        <GlassCard style={{padding:24}}>
          <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 16px'}}>Experiment Runs</h3>
          {loading ? <Skeleton h={100}/> : runs?.runs?.length > 0 ? (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left',fontSize:11,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>
                  <th style={{paddingBottom:8}}>Run ID</th>
                  <th style={{paddingBottom:8}}>Status</th>
                  <th style={{paddingBottom:8}}>Metrics (MAPE)</th>
                </tr>
              </thead>
              <tbody>
                {runs.runs.map((r:any) => (
                  <tr key={r.run_id} style={{fontSize:12,color:C.textSecondary,borderBottom:`1px solid ${C.border}33`}}>
                    <td style={{padding:'8px 0'}}>{r.run_id}</td>
                    <td>{r.status}</td>
                    <td>{r.metrics?.test_mape ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{color:C.textMuted,fontSize:13}}>{runs?.note}</div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
