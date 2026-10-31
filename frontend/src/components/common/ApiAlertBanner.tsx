'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { formatApiErrorMessage } from '@/lib/api/config'

interface ApiAlertBannerProps {
  error?: unknown
  message?: string | null
  style?: React.CSSProperties
}

export function ApiAlertBanner({ error, message, style = {} }: ApiAlertBannerProps) {
  const text = message || formatApiErrorMessage(error)
  if (!text) return null

  return (
    <div
      style={{
        padding: '14px 18px',
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: 10,
        marginBottom: 20,
        color: '#EF4444',
        fontSize: 13,
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        ...style,
      }}
    >
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 600, color: '#F87171' }}>API Connection Notice</div>
        <div style={{ marginTop: 2, color: '#CBD5E1' }}>{text}</div>
      </div>
    </div>
  )
}
