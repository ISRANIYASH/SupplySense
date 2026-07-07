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
  return <span style={{fontSize:11,fontWeight:700,color:C.purple,background:`${C.purple}18`,border:`1px solid ${C.purple}30`,borderRadius:6,padding:'3px 8px',display:'flex',alignItems:'center',gap:4}}>📊 STATISTICAL FEATURE IMPORTANCE</span>
}

export default function ExplainabilityPage() {
  const [shap, setShap] = useState<any>(null)
  const [model, setModel] = useState<any>(null)
  const [trace, setTrace] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/explainability/shap-values`).then(r=>r.json()),
      fetch(`${API}/api/explainability/model-info`).then(r=>r.json()),
      fetch(`${API}/api/explainability/decision-trace`).then(r=>r.json())
    ]).then(([s, m, t]) => {
      setShap(s)
      setModel(m)
      setTrace(t)
      setLoading(false)
    }).catch(console.error)
  }, [])

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>Explainable AI</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>Model interpretability and demand drivers</p>
        </div>
        <LiveBadge />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <GlassCard style={{padding:20}}>
          <p style={{color:C.textMuted,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em'}}>Current MAPE</p>
          {loading ? <Skeleton h={28}/> : <p style={{color:C.warning,fontSize:24,fontWeight:700,margin:0}}>{model?.metrics?.test_mape?.toFixed(2)}%</p>}
        </GlassCard>
        <GlassCard style={{padding:20}}>
          <p style={{color:C.textMuted,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em'}}>Current MAE</p>
          {loading ? <Skeleton h={28}/> : <p style={{color:C.blue,fontSize:24,fontWeight:700,margin:0}}>{model?.metrics?.test_mae?.toFixed(2)}</p>}
        </GlassCard>
        <GlassCard style={{padding:20}}>
          <p style={{color:C.textMuted,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em'}}>Current RMSE</p>
          {loading ? <Skeleton h={28}/> : <p style={{color:C.teal,fontSize:24,fontWeight:700,margin:0}}>{model?.metrics?.test_rmse?.toFixed(2)}</p>}
        </GlassCard>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        <GlassCard style={{padding:24}}>
          <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 8px'}}>Correlation-based Importance (Not SHAP)</h3>
          <p style={{color:C.textMuted,fontSize:12,margin:'0 0 20px'}}>{shap?.note || 'Loading...'}</p>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {loading ? <Skeleton h={300}/> : shap?.features?.map((f:any) => (
              <div key={f.feature}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:C.textSecondary}}>{f.feature}</span>
                  <span style={{color:C.textMuted}}>{f.importance}</span>
                </div>
                <div style={{background:C.surface2,height:8,borderRadius:4,overflow:'hidden'}}>
                  <div style={{background:f.direction==='positive'?C.blue:C.warning,height:'100%',width:`${f.importance*100}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard style={{padding:24}}>
          <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 20px'}}>Demand Drivers</h3>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.border}`,textAlign:'left',color:C.textMuted,fontSize:11,textTransform:'uppercase'}}>
                <th style={{paddingBottom:8}}>Category</th>
                <th style={{paddingBottom:8}}>Season</th>
                <th style={{paddingBottom:8}}>Weather</th>
                <th style={{paddingBottom:8,textAlign:'right'}}>Avg Demand</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:10}).map((_,i)=><tr key={i}><td><Skeleton h={16}/></td></tr>) : 
                trace?.data?.slice(0,10).map((r:any, i:number) => (
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}33`,color:C.textSecondary,fontSize:13}}>
                    <td style={{padding:'12px 0'}}>{r.category}</td>
                    <td>{r.seasonality}</td>
                    <td>{r.weather_condition}</td>
                    <td style={{textAlign:'right',fontWeight:600}}>{r.avg_demand.toFixed(1)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </div>
  )
}
