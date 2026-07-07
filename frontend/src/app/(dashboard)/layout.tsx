'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUser } from '@/lib/store/authSlice'
import { selectSidebarCollapsed } from '@/lib/store/uiSlice'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { CommandPalette } from '@/components/layout/CommandPalette'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  const sidebarCollapsed = useSelector(selectSidebarCollapsed)

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated && !user) {
      router.push('/login')
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated && !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0F1E' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#3B8EE8', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#64748B' }}>Authenticating…</p>
        </div>
      </div>
    )
  }

  const sidebarWidth = sidebarCollapsed ? 64 : 240

  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <Sidebar />

      <div
        style={{
          marginLeft: sidebarWidth,
          transition: 'margin-left 0.25s ease-in-out',
        }}
      >
        <Topbar />

        <main
          className="min-h-screen"
          style={{
            paddingTop: 60,
            background: '#0A0F1E',
          }}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}
