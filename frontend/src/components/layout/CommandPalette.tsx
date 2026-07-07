'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ArrowRight, Clock, Zap, FileText, LayoutDashboard, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { setCommandPaletteOpen, selectCommandPaletteOpen } from '@/lib/store/uiSlice'

interface CommandItem {
  id: string
  label: string
  description?: string
  group: 'Pages' | 'Actions' | 'AI Queries' | 'Recent'
  icon?: any
  action: () => void
  shortcut?: string
}

const PAGES: Array<Omit<CommandItem, 'action' | 'group'>> = [
  { id: 'dashboard', label: 'Command Center', description: 'Executive dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', description: 'SKU management & stock levels', icon: FileText },
  { id: 'procurement', label: 'Procurement', description: 'Purchase orders & spend', icon: FileText },
  { id: 'suppliers', label: 'Supplier Intelligence', description: 'Supplier risk & performance', icon: FileText },
  { id: 'demand-forecast', label: 'Demand Forecast', description: 'AI demand predictions', icon: Zap },
  { id: 'risk', label: 'Risk Radar', description: 'Supply chain risk monitoring', icon: FileText },
  { id: 'agents', label: 'AI Agents', description: 'Agent control room', icon: Zap },
  { id: 'copilot', label: 'AI Copilot', description: 'Chat with supply chain AI', icon: Zap },
  { id: 'mlops', label: 'MLOps Center', description: 'Model registry & experiments', icon: FileText },
  { id: 'decisions', label: 'Decision Log', description: 'AI decision approvals', icon: FileText },
  { id: 'audit', label: 'Audit Trail', description: 'Compliance & event log', icon: FileText },
  { id: 'analytics-lab', label: 'Analytics Lab', description: 'Custom reports & analysis', icon: FileText },
]

const QUICK_ACTIONS = [
  { id: 'approve-all', label: 'Approve all pending decisions', description: 'Bulk approve AI recommendations', icon: Zap, shortcut: '⌥A' },
  { id: 'run-forecast', label: 'Run demand forecast', description: 'Trigger TFT model retraining', icon: Zap },
  { id: 'export-inventory', label: 'Export inventory to CSV', description: 'Download full SKU list', icon: FileText },
  { id: 'generate-report', label: 'Generate weekly report', description: 'Create executive summary', icon: FileText },
]

const AI_QUERIES = [
  { id: 'ai-risk', label: 'What\'s my highest risk supplier this week?', icon: Zap },
  { id: 'ai-forecast', label: 'Forecast demand for SKU-4421 next 30 days', icon: Zap },
  { id: 'ai-reorder', label: 'Which SKUs need urgent replenishment?', icon: Zap },
  { id: 'ai-decisions', label: 'Summarize today\'s AI agent decisions', icon: Zap },
  { id: 'ai-cost', label: 'What is my cost variance vs budget?', icon: Zap },
]

export function CommandPalette() {
  const dispatch = useDispatch()
  const router = useRouter()
  const isOpen = useSelector(selectCommandPaletteOpen)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    dispatch(setCommandPaletteOpen(false))
    setQuery('')
    setActiveIndex(0)
  }, [dispatch])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const navigate = (path: string) => {
    router.push(path)
    close()
  }

  const allItems: CommandItem[] = [
    ...PAGES.filter(
      (p) =>
        !query ||
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase())
    ).map((p) => ({
      ...p,
      group: 'Pages' as const,
      action: () => navigate(p.id === 'dashboard' ? '/' : `/${p.id}`),
    })),
    ...QUICK_ACTIONS.filter(
      (a) =>
        !query ||
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description?.toLowerCase().includes(query.toLowerCase())
    ).map((a) => ({
      ...a,
      group: 'Actions' as const,
      action: () => {
        if (a.id === 'run-forecast') navigate('/demand-forecast')
        else if (a.id === 'approve-all') navigate('/decisions')
        else close()
      },
    })),
    ...AI_QUERIES.filter(
      (q) => !query || q.label.toLowerCase().includes(query.toLowerCase())
    ).map((q) => ({
      ...q,
      description: 'Ask AI Copilot',
      group: 'AI Queries' as const,
      action: () => navigate('/copilot'),
    })),
  ]

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      allItems[activeIndex]?.action()
    }
  }

  const groupedItems = allItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl"
            style={{
              background: '#111827',
              border: '1px solid rgba(59,142,232,0.2)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid #1E2D45' }}
            >
              <Search size={18} style={{ color: '#64748B', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, actions, or ask AI…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: '#F1F5F9' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: '#64748B' }}>
                  <X size={14} />
                </button>
              )}
              <kbd
                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #1E2D45', color: '#64748B' }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto py-2">
              {allItems.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: '#64748B' }}>
                  No results for "{query}"
                </div>
              ) : (
                Object.entries(groupedItems).map(([group, items]) => (
                  <div key={group}>
                    <div
                      className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase"
                      style={{ color: '#64748B' }}
                    >
                      {group}
                    </div>
                    {items.map((item, localIdx) => {
                      const globalIdx = allItems.indexOf(item)
                      const isActive = globalIdx === activeIndex
                      const Icon = item.icon

                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{
                            background: isActive ? 'rgba(59,142,232,0.08)' : 'transparent',
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isActive
                                ? 'rgba(59,142,232,0.15)'
                                : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <Icon size={13} style={{ color: isActive ? '#3B8EE8' : '#64748B' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span
                              className="text-sm font-medium block"
                              style={{ color: isActive ? '#F1F5F9' : '#94A3B8' }}
                            >
                              {item.label}
                            </span>
                            {item.description && (
                              <span className="text-xs" style={{ color: '#64748B' }}>
                                {item.description}
                              </span>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #1E2D45', color: '#64748B' }}
                            >
                              {item.shortcut}
                            </kbd>
                          )}
                          {isActive && <ArrowRight size={14} style={{ color: '#3B8EE8' }} />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-2 text-[11px]"
              style={{ borderTop: '1px solid #1E2D45', color: '#64748B' }}
            >
              <div className="flex items-center gap-3">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> select</span>
                <span><kbd className="font-mono">esc</kbd> close</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={10} style={{ color: '#3B8EE8' }} />
                <span style={{ color: '#3B8EE8' }}>AI-powered search</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
