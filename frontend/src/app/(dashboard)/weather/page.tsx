'use client'
import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const C = { bg:'#0A0F1E', surface:'#111827', surface2:'#1C2537', border:'#1E2D45', blue:'#3B8EE8', teal:'#00D4AA', warning:'#F59E0B', danger:'#EF4444', success:'#10B981', purple:'#8B5CF6', textPrimary:'#F1F5F9', textSecondary:'#CBD5E1', textMuted:'#64748B' } as const
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function GlassCard({children,style={}}: {children:React.ReactNode,style?:React.CSSProperties}) {
  return <div style={{background:'rgba(17,24,39,0.85)',border:`1px solid ${C.border}`,borderRadius:12,...style}}>{children}</div>
}
function Skeleton({h=20,w='100%'}:{h?:number,w?:string}) {
  return <div style={{height:h,width:w,background:C.surface2,borderRadius:6,animation:'pulse 1.5s ease-in-out infinite'}}/>
}
function LiveBadge() {
  return <span style={{fontSize:11,fontWeight:700,color:C.blue,background:`${C.blue}18`,border:`1px solid ${C.blue}30`,borderRadius:6,padding:'3px 8px',display:'flex',alignItems:'center',gap:4}}>📊 HISTORICAL DATA ANALYSIS</span>
}
function KpiTile({label,value,sub,color=C.blue,loading}:{label:string,value:string|number,sub?:string,color?:string,loading?:boolean}) {
  return <GlassCard style={{padding:20}}><p style={{color:C.textMuted,fontSize:11,margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</p>{loading?<Skeleton h={28} w='120px'/>:<p style={{color:color,fontSize:24,fontWeight:700,margin:'0 0 4px'}}>{value}</p>}{sub&&<p style={{color:C.textMuted,fontSize:11,margin:0}}>{sub}</p>}</GlassCard>
}

export default function WeatherPage() {
  const [impact, setImpact] = useState<any>(null)
  const [seasonal, setSeasonal] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/weather/impact-analysis`).then(r=>r.json()),
      fetch(`${API}/api/weather/seasonal-impact`).then(r=>r.json())
    ]).then(([i, s]) => {
      setImpact(i)
      setSeasonal(s)
      setLoading(false)
    }).catch(console.error)
  }, [])

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>Weather Intelligence</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>Weather-demand correlation analysis</p>
        </div>
        <LiveBadge />
      </div>

      <div style={{background:`${C.warning}15`,border:`1px solid ${C.warning}40`,padding:16,borderRadius:8,color:C.warning,fontSize:13,marginBottom:24}}>
        ⚠️ <b>Live weather API integration pending.</b> Showing historical weather-demand correlation from the fact_inventory dataset to demonstrate AI reasoning capabilities.
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        {loading ? Array.from({length:4}).map((_,i)=><Skeleton key={i} h={100}/>) : 
          impact?.data?.map((d:any) => (
            <KpiTile key={d.weather_condition} label={`Avg Demand: ${d.weather_condition}`} value={d.avg_units_sold} color={d.weather_condition==='Sunny'?C.warning:d.weather_condition==='Rainy'?C.blue:C.textPrimary} sub={`${d.record_count} records`} />
          ))
        }
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        <GlassCard style={{padding:24}}>
          <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 20px'}}>Weather Condition Impact</h3>
          {loading ? <Skeleton h={250}/> : (
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={impact?.data}>
                <CartesianGrid strokeDasharray='3 3' stroke={`${C.border}50`} vertical={false} />
                <XAxis dataKey='weather_condition' stroke={C.textMuted} fontSize={12} tickLine={false} />
                <YAxis stroke={C.textMuted} fontSize={12} tickLine={false} />
                <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.textPrimary}} />
                <Bar dataKey='avg_units_sold' fill={C.blue} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard style={{padding:24}}>
          <h3 style={{color:C.textPrimary,fontSize:16,margin:'0 0 16px'}}>Seasonality × Weather</h3>
          <p style={{color:C.textMuted,fontSize:12,margin:'0 0 20px'}}>Average units sold (demand) for each combination.</p>
          {loading ? <Skeleton h={250}/> : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left',color:C.textMuted,fontSize:11,textTransform:'uppercase',borderBottom:`1px solid ${C.border}`}}>
                  <th style={{paddingBottom:8}}>Season</th>
                  <th style={{paddingBottom:8}}>Weather</th>
                  <th style={{paddingBottom:8,textAlign:'right'}}>Avg Demand</th>
                  <th style={{paddingBottom:8,textAlign:'right'}}>Records</th>
                </tr>
              </thead>
              <tbody>
                {seasonal?.slice(0,10).map((s:any, i:number) => (
                  <tr key={i} style={{color:C.textSecondary,fontSize:13,borderBottom:`1px solid ${C.border}33`}}>
                    <td style={{padding:'10px 0'}}>{s.seasonality}</td>
                    <td>{s.weather_condition}</td>
                    <td style={{textAlign:'right',fontWeight:600,color:C.textPrimary}}>{s.avg_demand}</td>
                    <td style={{textAlign:'right',color:C.textMuted}}>{s.record_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
