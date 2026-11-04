'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as ReduxProvider, useDispatch } from 'react-redux'
import { SessionProvider, useSession } from 'next-auth/react'
import { store } from '@/lib/store'
import { useState, useEffect } from 'react'
import { setUser } from '@/lib/store/authSlice'
import { ROLE_PERMISSIONS, getRoleLabel } from '@/lib/auth/permissions'
import type { Role } from '@/lib/auth/permissions'

function AuthSync({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch()
  const { data: session, status } = useSession()

  // 1. Instant synchronous client hydration from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('supplysense_session')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.email && parsed.role) {
          dispatch(setUser(parsed))
        }
      }
    } catch {}
  }, [dispatch])

  // 2. Continuous synchronization between NextAuth session and Redux store
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const u = session.user as any
      const role: Role = (u.role as Role) || 'admin'
      const userObj = {
        id: u.id || `user-${role}`,
        name: u.name || 'Enterprise User',
        email: u.email || 'user@supplysense.ai',
        role,
        permissions: u.permissions || ROLE_PERMISSIONS[role] || [],
        department: u.department || getRoleLabel(role),
        lastLogin: new Date().toISOString(),
      }
      dispatch(setUser(userObj))
      try {
        localStorage.setItem('supplysense_session', JSON.stringify(userObj))
      } catch {}
    }
  }, [session, status, dispatch])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ReduxProvider store={store}>
        <AuthSync>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </AuthSync>
      </ReduxProvider>
    </SessionProvider>
  )
}
