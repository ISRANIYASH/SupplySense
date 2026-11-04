'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSelector } from 'react-redux'
import { useSession } from 'next-auth/react'
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
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  const sidebarCollapsed = useSelector(selectSidebarCollapsed)
  const [isHydrated, setIsHydrated] = useState(false)

  // Mark client hydration complete
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Auth Guard with session initialization protection
  useEffect(() => {
    // 1. Never redirect while authentication is still initializing or checking cookies
    if (!isHydrated || status === 'loading') {
      return
    }

    // 2. If authenticated via NextAuth or Redux/localStorage, allow access
    const hasSession = Boolean(session?.user || isAuthenticated || user)
    if (hasSession) {
      return
    }

    // 3. Only redirect when confirmed unauthenticated, preserving current URL and query params
    if (status === 'unauthenticated' && !hasSession) {
      const search = typeof window !== 'undefined' ? window.location.search : ''
      const currentTarget = pathname + search
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(currentTarget)}`
      router.replace(loginUrl)
    }
  }, [isHydrated, status, session, isAuthenticated, user, pathname, router])

  const hasSession = Boolean(session?.user || isAuthenticated || user)

  // Loading screen during verification
  if (!hasSession && (!isHydrated || status === 'loading')) {
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
          <p className="text-sm font-medium" style={{ color: '#64748B' }}>Verifying session…</p>
        </div>
      </div>
    )
  }

  // If unauthenticated and redirect is in progress, render null to prevent layout flicker
  if (!hasSession && status === 'unauthenticated') {
    return null
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
