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
function LiveBadge({time}:{time?:string}) {
  return <span style={{fontSize:11,fontWeight:700,color:C.textMuted,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 8px',display:'flex',alignItems:'center',gap:4}}>⏱️ Checked: {time ? new Date(time).toLocaleTimeString() : '...'}</span>
}

export default function AdminPage() {
  const [health, setHealth] = useState<any>(null)
  const [tables, setTables] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/admin/system-health`).then(r=>r.json()),
      fetch(`${API}/api/admin/table-stats`).then(r=>r.json())
    ]).then(([h, t]) => {
      setHealth(h)
      setTables(t)
      setLoading(false)
    }).catch(console.error)
  }, [])

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>Admin Center</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>System health and service status</p>
        </div>
        <LiveBadge time={health?.checked_at} />
      </div>

      <GlassCard style={{padding:20,marginBottom:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{color:C.textSecondary,fontSize:14,fontWeight:600}}>System Health Score</div>
          <div style={{fontSize:24,color:health?.healthy===health?.total?C.success:C.warning,fontWeight:700}}>
            {loading ? <Skeleton w='60px'/> : `${health?.healthy} / ${health?.total}`}
          </div>
        </div>
      </GlassCard>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(350px,1fr))',gap:20,marginBottom:32}}>
        {loading ? Array.from({length:6}).map((_,i)=><Skeleton key={i} h={150}/>) : 
          health?.services?.map((s:any) => {
            const isBlue = s.status === 'not_deployed'
            return (
              <GlassCard key={s.name} style={{padding:20,display:'flex',flexDirection:'column'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:20}}>{s.icon}</span>
                    <span style={{color:C.textPrimary,fontWeight:600,fontSize:15}}>{s.name}</span>
                  </div>
                  <div style={{fontSize:11,background:isBlue?`${C.blue}20`:C.surface2,color:isBlue?C.blue:C.textSecondary,padding:'4px 8px',borderRadius:4,textTransform:'uppercase',fontWeight:600}}>
                    {isBlue ? 'Not Yet Deployed' : s.status}
                  </div>
                </div>
                <div style={{color:isBlue?C.blue:C.textMuted,fontSize:13,marginBottom:12,lineHeight:1.5}}>{s.note}</div>
                
                {s.details && s.name === 'PostgreSQL' && (
                  <div style={{background:C.surface2,borderRadius:8,padding:12,marginTop:'auto'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {Object.entries(s.details).slice(0,4).map(([k,v]:any) => (
                        <div key={k} style={{fontSize:11}}>
                          <div style={{color:C.textMuted}}>{k}</div>
                          <div style={{color:C.textPrimary,fontWeight:600}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            )
          })}
      </div>

      <GlassCard style={{padding:24}}>
        <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 16px'}}>Database Tables (PostgreSQL)</h3>
        {loading ? <Skeleton h={200}/> : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{textAlign:'left',color:C.textMuted,fontSize:12,borderBottom:`1px solid ${C.border}`}}>
                <th style={{paddingBottom:8}}>Table Name</th>
                <th style={{paddingBottom:8}}>Schema</th>
                <th style={{paddingBottom:8,textAlign:'right'}}>Size</th>
              </tr>
            </thead>
            <tbody>
              {tables?.map((t:any) => (
                <tr key={t.tablename} style={{color:C.textSecondary,fontSize:13,borderBottom:`1px solid ${C.border}33`}}>
                  <td style={{padding:'10px 0'}}>{t.tablename}</td>
                  <td>{t.schemaname}</td>
                  <td style={{textAlign:'right',color:C.blue}}>{t.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </div>
  )
}
