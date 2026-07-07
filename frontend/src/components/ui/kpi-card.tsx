'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Sparkline } from '@/components/charts/sparkline'

interface KpiCardProps {
  title: string
  value: string | number
  delta?: number
  deltaLabel?: string
  deltaInvert?: boolean // true = lower is better (e.g., risk score)
  sparklineData?: number[]
  sparklineColor?: string
  icon?: any
  iconColor?: string
  suffix?: string
  prefix?: string
  loading?: boolean
}

export function KpiCard({
  title,
  value,
  delta,
  deltaLabel,
  deltaInvert = false,
  sparklineData,
  sparklineColor = '#3B8EE8',
  icon: Icon,
  iconColor = '#3B8EE8',
  suffix,
  prefix,
  loading = false,
}: KpiCardProps) {
  const isPositive = delta !== undefined ? (deltaInvert ? delta < 0 : delta > 0) : null
  const isNeutral = delta === 0

  const deltaColor = isNeutral
    ? '#64748B'
    : isPositive
    ? '#10B981'
    : '#EF4444'

  const DeltaIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown

  if (loading) {
    return (
      <div
        className="p-5 rounded-xl shimmer"
        style={{
          background: 'rgba(17,24,39,0.7)',
          border: '1px solid rgba(59,142,232,0.12)',
          minHeight: 130,
        }}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(59,142,232,0.08)' }}
      transition={{ duration: 0.2 }}
      className="p-5 rounded-xl flex flex-col gap-3 cursor-default"
      style={{
        background: 'rgba(17,24,39,0.7)',
        border: '1px solid rgba(59,142,232,0.12)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>
          {title}
        </span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25` }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            {prefix && <span className="text-lg font-semibold" style={{ color: '#94A3B8' }}>{prefix}</span>}
            <span className="text-2xl font-bold text-white">{value}</span>
            {suffix && <span className="text-base font-medium" style={{ color: '#94A3B8' }}>{suffix}</span>}
          </div>

          {/* Delta */}
          {delta !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <DeltaIcon size={12} style={{ color: deltaColor }} />
              <span className="text-xs font-medium" style={{ color: deltaColor }}>
                {Math.abs(delta) < 1 ? delta.toFixed(1) : Math.abs(delta).toFixed(1)}
                {deltaLabel ?? ''}
              </span>
              <span className="text-xs" style={{ color: '#475569' }}>vs last month</span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="flex-shrink-0">
            <Sparkline
              data={sparklineData}
              color={sparklineColor}
              width={80}
              height={36}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
