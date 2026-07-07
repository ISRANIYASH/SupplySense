'use client'
import React, { useState } from 'react'

const C = { bg:'#0A0F1E', surface:'#111827', surface2:'#1C2537', border:'#1E2D45', blue:'#3B8EE8', teal:'#00D4AA', warning:'#F59E0B', danger:'#EF4444', success:'#10B981', purple:'#8B5CF6', textPrimary:'#F1F5F9', textSecondary:'#CBD5E1', textMuted:'#64748B' } as const
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function LiveBadge() {
  return <span style={{fontSize:11,fontWeight:700,color:C.teal,background:`${C.teal}18`,border:`1px solid ${C.teal}30`,borderRadius:6,padding:'3px 8px',display:'flex',alignItems:'center',gap:4}}>🟢 LIVE DATA</span>
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<{role:'user'|'ai', content:string, source?:string}[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, {role:'user', content:text}])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/copilot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      setMessages(prev => [...prev, {role:'ai', content:data.response, source:data.data_source}])
    } catch (e) {
      setMessages(prev => [...prev, {role:'ai', content:'⚠️ Error: Unable to connect to SupplySense API.'}])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px',fontFamily:"'Inter',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{color:C.textPrimary,fontSize:26,fontWeight:700,margin:0}}>AI Copilot</h1>
          <p style={{color:C.textMuted,fontSize:13,margin:'4px 0 0'}}>Rule-based AI with real PostgreSQL data. GPT-4o integration pending.</p>
        </div>
        <LiveBadge />
      </div>
      
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:24}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,height:'calc(100vh - 140px)',display:'flex',flexDirection:'column'}}>
          <div style={{flex:1,padding:24,overflowY:'auto',display:'flex',flexDirection:'column',gap:16}}>
            {messages.length===0 && (
              <div style={{margin:'auto',textAlign:'center',color:C.textMuted}}>
                <div style={{fontSize:40,marginBottom:16}}>🤖</div>
                <h3>SupplySense Copilot</h3>
                <p style={{fontSize:13}}>Ask me about your supply chain data.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{alignSelf:m.role==='user'?'flex-end':'flex-start',maxWidth:'80%'}}>
                <div style={{background:m.role==='user'?C.blue:C.surface2,padding:16,borderRadius:12,color:m.role==='user'?'#fff':C.textPrimary,fontSize:14,lineHeight:1.6,border:m.role==='ai'?`1px solid ${C.border}`:'none'}}>
                  {m.content.split('\n').map((line,j)=>(
                    <p key={j} style={{margin:'0 0 8px'}} dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}} />
                  ))}
                </div>
                {m.source && <div style={{fontSize:10,color:C.textMuted,marginTop:4,marginLeft:8}}>Source: {m.source}</div>}
              </div>
            ))}
            {loading && <div style={{color:C.textMuted,fontSize:13,alignSelf:'flex-start',marginLeft:8}}>Copilot is thinking...</div>}
          </div>
          <div style={{padding:16,borderTop:`1px solid ${C.border}`}}>
            <form onSubmit={e=>{e.preventDefault(); send(input)}} style={{display:'flex',gap:12}}>
              <input value={input} onChange={e=>setInput(e.target.value)} placeholder='Ask about inventory, suppliers, risk...' style={{flex:1,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 16px',color:C.textPrimary,fontSize:14}} />
              <button type='submit' style={{background:C.blue,color:'#fff',border:'none',borderRadius:8,padding:'0 24px',fontWeight:600,cursor:'pointer'}}>Send</button>
            </form>
          </div>
        </div>
        
        <div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
            <h3 style={{color:C.textPrimary,fontSize:14,margin:'0 0 16px'}}>Suggested Prompts</h3>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {['What is our current inventory status?','Who are our top performing suppliers?','What is our overall risk level?','What are current commodity prices?','What is our late delivery rate?'].map(p=>(
                <button key={p} onClick={()=>send(p)} style={{background:C.surface2,border:`1px solid ${C.border}`,color:C.textSecondary,padding:'10px 14px',borderRadius:8,textAlign:'left',fontSize:13,cursor:'pointer'}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
