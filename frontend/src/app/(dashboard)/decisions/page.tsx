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

export default function DecisionsPage() {
  const [data, setData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/decisions/log`).then(r=>r.json()),
      fetch(`${API}/api/decisions/summary`).then(r=>r.json())
    ]).then(([d, s]) => {
      setData(d)
      setSummary(s)
      setLoading(false)
    }).catch(console.error)
  }, [])

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>Decision History</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>Log of AI actions and system alerts</p>
        </div>
        <LiveBadge />
      </div>

      <div style={{display:'flex',gap:12,marginBottom:24}}>
        {loading ? <Skeleton h={40} w='300px'/> : summary?.map((s:any, i:number) => {
          const color = s.severity==='CRITICAL'?C.danger:s.severity==='HIGH'?C.warning:s.severity==='MEDIUM'?C.blue:C.success
          return (
            <div key={i} style={{background:C.surface2,border:`1px solid ${color}40`,padding:'8px 16px',borderRadius:20,fontSize:13,color:C.textSecondary,display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
              {s.type} ({s.severity}): <b>{s.count}</b>
            </div>
          )
        })}
      </div>

      <GlassCard style={{padding:24}}>
        {loading ? <Skeleton h={200}/> : data?.decisions?.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {data.decisions.map((d:any) => {
              const color = d.severity==='CRITICAL'?C.danger:d.severity==='HIGH'?C.warning:d.severity==='MEDIUM'?C.blue:C.success
              return (
                <div key={d.id} style={{background:C.surface2,borderLeft:`4px solid ${color}`,padding:16,borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{color:color,fontWeight:700,fontSize:14}}>{d.title}</span>
                      <span style={{fontSize:11,background:`${color}20`,color:color,padding:'2px 8px',borderRadius:4}}>{d.severity}</span>
                    </div>
                    <div style={{color:C.textMuted,fontSize:12}}>{new Date(d.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{color:C.textSecondary,fontSize:13,marginBottom:8}}>{d.description}</div>
                  <div style={{display:'flex',gap:8}}>
                    <span style={{fontSize:11,background:C.surface,color:C.textMuted,padding:'4px 8px',borderRadius:4}}>{d.type}</span>
                    {d.category && <span style={{fontSize:11,background:C.surface,color:C.textMuted,padding:'4px 8px',borderRadius:4}}>{d.category}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{color:C.textMuted,fontSize:14,textAlign:'center',padding:40}}>{data?.note}</div>
        )}
      </GlassCard>
    </div>
  )
}
