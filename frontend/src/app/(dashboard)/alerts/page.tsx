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
function KpiTile({label,value,sub,color=C.blue,loading}:{label:string,value:string|number,sub?:string,color?:string,loading?:boolean}) {
  return <GlassCard style={{padding:20}}><p style={{color:C.textMuted,fontSize:11,margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</p>{loading?<Skeleton h={28} w='120px'/>:<p style={{color:color,fontSize:24,fontWeight:700,margin:'0 0 4px'}}>{value}</p>}{sub&&<p style={{color:C.textMuted,fontSize:11,margin:0}}>{sub}</p>}</GlassCard>
}

export default function AlertsPage() {
  const [data, setData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/alerts/active`).then(r=>r.json()),
      fetch(`${API}/api/alerts/summary`).then(r=>r.json())
    ]).then(([d, s]) => {
      setData(d)
      setSummary(s)
      setLoading(false)
    }).catch(console.error)
  }, [])

  const getCount = (sev:string) => summary?.find((s:any)=>s.severity===sev)?.count || 0

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>Alert Center</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>Active system alerts and notifications</p>
        </div>
        <LiveBadge />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        <KpiTile loading={loading} label='Critical Alerts' value={getCount('CRITICAL')} color={C.danger} />
        <KpiTile loading={loading} label='High Alerts' value={getCount('HIGH')} color={C.warning} />
        <KpiTile loading={loading} label='Medium Alerts' value={getCount('MEDIUM')} color={C.blue} />
        <KpiTile loading={loading} label='Low Alerts' value={getCount('LOW')} color={C.success} />
      </div>

      <GlassCard style={{padding:24}}>
        {loading ? <Skeleton h={200}/> : data?.alerts?.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {data.alerts.map((a:any) => {
              const color = a.severity==='CRITICAL'?C.danger:a.severity==='HIGH'?C.warning:a.severity==='MEDIUM'?C.blue:C.success
              return (
                <div key={a.id} style={{background:C.surface2,borderLeft:`4px solid ${color}`,padding:16,borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{color:C.textPrimary,fontWeight:600,fontSize:15}}>{a.title}</span>
                      {!a.read && <span style={{width:8,height:8,borderRadius:'50%',background:C.blue}}/>}
                    </div>
                    <div style={{color:C.textMuted,fontSize:12}}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{color:C.textSecondary,fontSize:14,marginBottom:8}}>{a.description}</div>
                  <div style={{display:'flex',gap:8}}>
                    <span style={{fontSize:11,background:`${color}20`,color:color,padding:'4px 8px',borderRadius:4}}>{a.severity}</span>
                    <span style={{fontSize:11,background:C.surface,color:C.textMuted,padding:'4px 8px',borderRadius:4}}>{a.type}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{color:C.textMuted,fontSize:14,textAlign:'center',padding:40}}>{data?.note || 'No active alerts.'}</div>
        )}
      </GlassCard>
    </div>
  )
}
