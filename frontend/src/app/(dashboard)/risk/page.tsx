'use client'
import { useEffect, useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const C = { bg:'#0A0F1E', surface:'#111827', surface2:'#1C2537', border:'#1E2D45', blue:'#3B8EE8', teal:'#00D4AA', warning:'#F59E0B', danger:'#EF4444', success:'#10B981', purple:'#8B5CF6', textPrimary:'#F1F5F9', textSecondary:'#CBD5E1', textMuted:'#64748B' } as const
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function GlassCard({children,style={}}:{children:React.ReactNode,style?:React.CSSProperties}) {
  return <div style={{background:'rgba(17,24,39,0.85)',border:`1px solid ${C.border}`,borderRadius:12,...style}}>{children}</div>
}
function Skeleton({h=20,w='100%'}:{h?:number,w?:string}) {
  return <div style={{height:h,width:w,background:C.surface2,borderRadius:6,animation:'pulse 1.5s ease-in-out infinite'}}/>
}
function LiveBadge() {
  return <span style={{fontSize:11,fontWeight:700,color:C.teal,background:`${C.teal}18`,border:`1px solid ${C.teal}30`,borderRadius:6,padding:'3px 8px',display:'flex',alignItems:'center',gap:4}}>🟢 LIVE DATA</span>
}
function ErrorBox() {
  return <div style={{padding:20,background:`${C.danger}15`,border:`1px solid ${C.danger}40`,borderRadius:10,color:C.danger,fontSize:13,marginBottom:20}}>⚠️ Unable to connect to SupplySense API. Make sure backend is running on port 8000.</div>
}
function KpiTile({label,value,sub,color=C.blue,loading}:{label:string,value:string|number,sub?:string,color?:string,loading?:boolean}) {
  return (
    <GlassCard style={{padding:20}}>
      <p style={{color:C.textMuted,fontSize:11,margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</p>
      {loading ? <Skeleton h={28} w='120px'/> : (
        <p style={{color,fontSize:24,fontWeight:700,margin:'0 0 4px'}}>{value}</p>
      )}
      {sub && <p style={{color:C.textMuted,fontSize:11,margin:0}}>{sub}</p>}
    </GlassCard>
  )
}

interface RiskOverview {
  overall_risk_score: number
  late_pct: number
  critical_count: number
  high_risk_count: number
  low_stock_pct: number
  regions_at_risk: number
}
interface MatrixPoint { risk_type:string; probability_score:number; impact_score:number }
interface CriticalSupplier {
  supplier_id: number
  supplier_name: string
  supplier_overall_score: number
  quality_score: number
  delivery_score: number
  financial_score: number
}

const RISK_COLORS: Record<string, string> = {
  'Supplier Risk': C.danger,
  'Delivery Risk': C.warning,
  'Inventory Risk': C.purple,
}

// Pure SVG semicircle gauge
function RiskGauge({ score }: { score: number }) {
  const r = 82
  const cx = 120
  const cy = 110
  const clamped = Math.max(0, Math.min(100, score))
  const scoreColor = clamped < 40 ? C.success : clamped < 70 ? C.warning : C.danger

  // Arc helper: from radians to SVG path (left=π to right=0, semicircle on top)
  const arc = (fromAngle: number, toAngle: number, color: string, strokeW = 18) => {
    const x1 = cx + r * Math.cos(fromAngle)
    const y1 = cy - r * Math.sin(fromAngle)
    const x2 = cx + r * Math.cos(toAngle)
    const y2 = cy - r * Math.sin(toAngle)
    const large = Math.abs(toAngle - fromAngle) > Math.PI ? 1 : 0
    // We always sweep counter-clockwise from π to 0 (left to right visually)
    return (
      <path
        d={`M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
        fill='none' stroke={color} strokeWidth={strokeW} strokeLinecap='round'
      />
    )
  }

  // π = 180° (left), 0 = 0° (right), we map 0→100 as π→0
  const toAngle = (val: number) => Math.PI - (val / 100) * Math.PI
  const needleAngle = toAngle(clamped)
  const needleX = cx + (r - 14) * Math.cos(needleAngle)
  const needleY = cy - (r - 14) * Math.sin(needleAngle)

  return (
    <svg width={240} height={140} style={{overflow:'visible',display:'block'}}>
      {/* Track */}
      {arc(Math.PI, 0, C.surface2)}
      {/* Green 0-40 */}
      {arc(Math.PI, toAngle(40), C.success)}
      {/* Orange 40-70 */}
      {arc(toAngle(40), toAngle(70), C.warning)}
      {/* Red 70-100 */}
      {arc(toAngle(70), 0, C.danger)}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX.toFixed(2)} y2={needleY.toFixed(2)} stroke={C.textPrimary} strokeWidth={2.5} strokeLinecap='round'/>
      <circle cx={cx} cy={cy} r={7} fill={scoreColor} stroke={C.surface} strokeWidth={2}/>
      {/* Center text */}
      <text x={cx} y={cy + 26} textAnchor='middle' fill={scoreColor} fontSize={30} fontWeight={800} fontFamily='Inter,system-ui,sans-serif'>
        {clamped.toFixed(0)}
      </text>
      <text x={cx} y={cy + 42} textAnchor='middle' fill={C.textMuted} fontSize={10} fontFamily='Inter,system-ui,sans-serif'>
        out of 100
      </text>
      {/* Range labels */}
      <text x={22} y={cy + 8} fill={C.success} fontSize={9} fontFamily='Inter,system-ui,sans-serif'>LOW</text>
      <text x={196} y={cy + 8} fill={C.danger} fontSize={9} fontFamily='Inter,system-ui,sans-serif'>HIGH</text>
    </svg>
  )
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clampedVal = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div style={{marginBottom:9}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{color:C.textMuted,fontSize:11}}>{label}</span>
        <span style={{color,fontSize:11,fontWeight:700}}>{clampedVal.toFixed(0)}/100</span>
      </div>
      <div style={{height:5,background:C.surface2,borderRadius:3}}>
        <div style={{height:'100%',width:`${clampedVal}%`,background:color,borderRadius:3,transition:'width 0.8s ease'}}/>
      </div>
    </div>
  )
}

// Custom scatter dot with label
interface CustomDotProps {
  cx?: number; cy?: number;
  payload?: MatrixPoint & { fill?: string }
}
function CustomDot({ cx=0, cy=0, payload }: CustomDotProps) {
  const color = payload ? (RISK_COLORS[payload.risk_type] ?? C.blue) : C.blue
  const label = payload?.risk_type?.replace(' Risk', '') ?? ''
  return (
    <g>
      <circle cx={cx} cy={cy} r={16} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2}/>
      <circle cx={cx} cy={cy} r={7} fill={color}/>
      <text x={cx} y={cy - 22} textAnchor='middle' fill={color} fontSize={10} fontWeight={700} fontFamily='Inter,system-ui,sans-serif'>
        {label}
      </text>
    </g>
  )
}

export default function RiskPage() {
  const [overview, setOverview] = useState<RiskOverview|null>(null)
  const [matrix, setMatrix] = useState<MatrixPoint[]>([])
  const [critical, setCritical] = useState<CriticalSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/risk/overview`).then(r=>r.json()),
      fetch(`${API}/api/risk/matrix-data`).then(r=>r.json()),
      fetch(`${API}/api/risk/critical-alerts`).then(r=>r.json()),
    ]).then(([ov, mx, cr]) => {
      setOverview(ov)
      setMatrix(Array.isArray(mx) ? mx : [])
      setCritical(Array.isArray(cr) ? cr : [])
      setLoading(false)
    }).catch(() => { setError(true); setLoading(false) })
  }, [])

  const scoreColor = (v: number) => v < 40 ? C.danger : v < 60 ? C.warning : C.success

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
      <div style={{maxWidth:1200,margin:'0 auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
          <div>
            <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:'0 0 4px'}}>Risk Management Center</h1>
            <p style={{color:C.textMuted,fontSize:13,margin:0}}>Real-time supply chain risk assessment and supplier monitoring</p>
          </div>
          <LiveBadge/>
        </div>

        {error && <ErrorBox/>}

        {/* Gauge + KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:24,marginBottom:24}}>

          <GlassCard style={{padding:24,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <p style={{color:C.textMuted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 16px'}}>Overall Risk Score</p>
            {loading ? (
              <Skeleton h={140} w='220px'/>
            ) : (
              <RiskGauge score={overview?.overall_risk_score ?? 0}/>
            )}
          </GlassCard>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            <KpiTile
              label='Overall Risk Score'
              value={overview?.overall_risk_score?.toFixed(1) ?? '--'}
              color={overview ? (overview.overall_risk_score > 70 ? C.danger : overview.overall_risk_score > 40 ? C.warning : C.success) : C.textMuted}
              sub='out of 100'
              loading={loading}
            />
            <KpiTile
              label='Critical Suppliers'
              value={overview?.critical_count ?? '--'}
              color={C.danger}
              sub='score < 35'
              loading={loading}
            />
            <KpiTile
              label='Late Delivery %'
              value={overview?.late_pct != null ? `${overview.late_pct.toFixed(1)}%` : '--'}
              color={C.warning}
              sub='of all deliveries'
              loading={loading}
            />
            <KpiTile
              label='Regions at Risk'
              value={overview?.regions_at_risk ?? '--'}
              color={C.purple}
              sub='geographic exposure'
              loading={loading}
            />
            <KpiTile
              label='Low Stock %'
              value={overview?.low_stock_pct != null ? `${overview.low_stock_pct.toFixed(1)}%` : '--'}
              color={C.warning}
              sub='inventory at risk'
              loading={loading}
            />
            <KpiTile
              label='High Risk Suppliers'
              value={overview?.high_risk_count ?? '--'}
              color={C.warning}
              sub='score < 60'
              loading={loading}
            />
          </div>
        </div>

        {/* Risk Matrix */}
        <GlassCard style={{padding:24,marginBottom:24}}>
          <h2 style={{color:C.textPrimary,fontSize:15,fontWeight:600,margin:'0 0 4px'}}>📊 Risk Matrix</h2>
          <p style={{color:C.textMuted,fontSize:11,margin:'0 0 14px'}}>Probability vs Impact — upper-right quadrant = highest priority</p>
          <div style={{display:'flex',gap:16,marginBottom:14,flexWrap:'wrap'}}>
            {Object.entries(RISK_COLORS).map(([k,v]) => (
              <div key={k} style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:v}}/>
                <span style={{color:C.textSecondary,fontSize:11}}>{k}</span>
              </div>
            ))}
          </div>
          {loading ? (
            <Skeleton h={300}/>
          ) : (
            <ResponsiveContainer width='100%' height={300}>
              <ScatterChart margin={{top:20,right:30,bottom:30,left:10}}>
                <CartesianGrid strokeDasharray='3 3' stroke={`${C.border}50`}/>
                <XAxis
                  type='number' dataKey='probability_score' domain={[0,100]} name='Probability'
                  tick={{fill:C.textMuted,fontSize:10}} axisLine={{stroke:C.border}} tickLine={false}
                  label={{value:'Probability Score',position:'insideBottom',offset:-15,fill:C.textMuted,fontSize:11}}
                />
                <YAxis
                  type='number' dataKey='impact_score' domain={[0,100]} name='Impact'
                  tick={{fill:C.textMuted,fontSize:10}} axisLine={false} tickLine={false}
                  label={{value:'Impact Score',angle:-90,position:'insideLeft',fill:C.textMuted,fontSize:11}}
                />
                <Tooltip
                  contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.textPrimary,fontSize:12}}
                  formatter={(value: number, name: string) => [value, name]}
                  cursor={{strokeDasharray:'3 3',stroke:C.border}}
                />
                <ReferenceLine x={50} stroke={`${C.border}80`} strokeDasharray='4 4'/>
                <ReferenceLine y={50} stroke={`${C.border}80`} strokeDasharray='4 4'/>
                <Scatter
                  data={matrix.map(p => ({ ...p, fill: RISK_COLORS[p.risk_type] || C.blue }))}
                  shape={<CustomDot/>}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Critical Supplier Cards */}
        <div>
          <h2 style={{color:C.textPrimary,fontSize:16,fontWeight:600,margin:'0 0 16px'}}>🚨 Critical Suppliers</h2>
          {loading ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
              {[0,1,2].map(i => <Skeleton key={i} h={220}/>)}
            </div>
          ) : critical.length === 0 ? (
            <GlassCard style={{padding:48,textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:12}}>✅</div>
              <p style={{color:C.success,fontSize:17,fontWeight:600,margin:'0 0 8px'}}>No critical suppliers</p>
              <p style={{color:C.textMuted,fontSize:13,margin:0}}>All suppliers are above the critical threshold (score ≥ 35)</p>
            </GlassCard>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
              {critical.map((sup) => (
                <div
                  key={sup.supplier_id}
                  style={{
                    background:'rgba(17,24,39,0.85)',
                    border:`1px solid ${C.danger}40`,
                    borderRadius:12,
                    overflow:'hidden',
                    transition:'all 0.2s'
                  }}
                  onMouseEnter={e=>{
                    e.currentTarget.style.borderColor = C.danger + '80'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = `0 4px 20px ${C.danger}20`
                  }}
                  onMouseLeave={e=>{
                    e.currentTarget.style.borderColor = C.danger + '40'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Card header */}
                  <div style={{padding:'14px 18px',background:`${C.danger}12`,borderBottom:`1px solid ${C.danger}25`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <p style={{color:C.textPrimary,fontSize:13,fontWeight:700,margin:'0 0 3px'}}>{sup.supplier_name}</p>
                        <p style={{color:C.textMuted,fontSize:11,margin:0}}>Supplier ID: {sup.supplier_id}</p>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <p style={{color:C.danger,fontSize:32,fontWeight:800,margin:'0 0 2px',lineHeight:1}}>
                          {sup.supplier_overall_score?.toFixed(0)}
                        </p>
                        <p style={{color:C.textMuted,fontSize:10,margin:0}}>Score</p>
                      </div>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div style={{padding:'16px 18px'}}>
                    <MiniBar
                      label='Quality Score'
                      value={sup.quality_score}
                      color={scoreColor(sup.quality_score)}
                    />
                    <MiniBar
                      label='Delivery Score'
                      value={sup.delivery_score}
                      color={scoreColor(sup.delivery_score)}
                    />
                    <MiniBar
                      label='Financial Score'
                      value={sup.financial_score}
                      color={scoreColor(sup.financial_score)}
                    />

                    {/* Reasoning */}
                    <div style={{marginTop:12,padding:'10px 12px',background:`${C.danger}10`,border:`1px solid ${C.danger}25`,borderRadius:6}}>
                      <p style={{color:C.danger,fontSize:11,margin:0,lineHeight:1.6}}>
                        Score: {sup.supplier_overall_score?.toFixed(0)}/100 | Quality: {sup.quality_score?.toFixed(0)} | Delivery: {sup.delivery_score?.toFixed(0)} | Financial: {sup.financial_score?.toFixed(0)} — Immediate review required
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
