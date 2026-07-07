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

export default function SimulatorPage() {
  const [base, setBase] = useState<any>(null)
  const [demand, setDemand] = useState(0)
  const [lead, setLead] = useState(1.0)
  const [price, setPrice] = useState(0)
  const [res, setRes] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/simulator/baseline`).then(r=>r.json()).then(setBase).catch(console.error)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`${API}/api/simulator/run`, {
        method: 'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({demand_change_pct:demand, lead_time_multiplier:lead, price_change_pct:price})
      }).then(r=>r.json()).then(setRes).finally(()=>setLoading(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [demand, lead, price])

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>Scenario Simulator</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>Apply multipliers to real baseline data</p>
        </div>
        <LiveBadge />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:24}}>
        <GlassCard style={{padding:24}}>
          <h3 style={{color:C.textPrimary,margin:'0 0 20px',fontSize:16}}>Scenario Inputs</h3>
          
          <div style={{marginBottom:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{color:C.textSecondary,fontSize:13}}>Demand Change</span>
              <span style={{color:C.blue,fontWeight:600}}>{demand > 0 ? '+'+demand : demand}%</span>
            </div>
            <input type='range' min='-50' max='100' step='5' value={demand} onChange={e=>setDemand(Number(e.target.value))} style={{width:'100%'}}/>
          </div>

          <div style={{marginBottom:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{color:C.textSecondary,fontSize:13}}>Lead Time Multiplier</span>
              <span style={{color:C.purple,fontWeight:600}}>{lead.toFixed(1)}x</span>
            </div>
            <input type='range' min='0.5' max='3.0' step='0.1' value={lead} onChange={e=>setLead(Number(e.target.value))} style={{width:'100%'}}/>
          </div>

          <div style={{marginBottom:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{color:C.textSecondary,fontSize:13}}>Price Change</span>
              <span style={{color:C.teal,fontWeight:600}}>{price > 0 ? '+'+price : price}%</span>
            </div>
            <input type='range' min='-30' max='50' step='5' value={price} onChange={e=>setPrice(Number(e.target.value))} style={{width:'100%'}}/>
          </div>
        </GlassCard>

        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:16}}>
            <KpiTile loading={loading||!res} label='Stockout Risk' value={res?.outcomes?.stockout_risk_pct+'%'} color={res?.outcomes?.stockout_risk_pct>70?C.danger:res?.outcomes?.stockout_risk_pct>40?C.warning:C.success} />
            <KpiTile loading={loading||!res} label='Days to Stockout' value={res?.outcomes?.days_to_stockout} color={res?.outcomes?.days_to_stockout<14?C.danger:C.success} />
            <KpiTile loading={loading||!res} label='Service Level' value={res?.outcomes?.service_level_pct+'%'} color={res?.outcomes?.service_level_pct>80?C.success:C.warning} />
            <KpiTile loading={loading||!res} label='30-Day Cost Impact' value={'$'+res?.outcomes?.cost_impact_30d?.toLocaleString()} color={res?.outcomes?.cost_impact_30d>0?C.danger:C.success} />
          </div>
          <GlassCard style={{padding:20,background:`${C.blue}10`}}>
            <h4 style={{color:C.textPrimary,margin:'0 0 8px',fontSize:14}}>AI Recommendation</h4>
            <p style={{color:C.textSecondary,fontSize:13,margin:0,lineHeight:1.6}}>
              {loading ? <Skeleton h={40}/> : res?.recommendation}
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
